import { useState, useRef, useEffect, useMemo } from 'react';
import { upload } from '@vercel/blob/client';
import { auditBoundary, countUnique } from '../lib/boundaryAudit';
import { getCustomBoundaryLimit, TIERS } from '../lib/tierConfig';

// Custom boundary validation + upload dialog.
// Steps: idle → parsing → review → uploading → done
//
// Props:
//   onClose()
//   onBoundaryAdded(row)     — called with the persisted DB row on success
//   tier                     — 'free_anonymous' | 'free' | 'pro' | 'enterprise'
//   existingCount            — number of custom boundaries this org already has
//   onOpenUpgrade()          — link out to the upgrade modal

function confidenceTier(pct) {
  if (pct >= 85) return 'high';
  if (pct >= 60) return 'medium';
  return 'low';
}

export default function CustomBoundaryModal({
  onClose,
  onBoundaryAdded,
  tier = 'free',
  existingCount = 0,
  onOpenUpgrade,
}) {
  const [step, setStep] = useState('idle');
  const [file, setFile] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [audit, setAudit] = useState(null);
  const [nameField, setNameField] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileRef = useRef();
  const limit = getCustomBoundaryLimit(tier);
  const atCap = limit !== Infinity && existingCount >= limit;
  const isAnonymous = tier === 'free_anonymous';

  const uniqueForCurrentField = useMemo(() => {
    if (!geojson || !nameField) return 0;
    return countUnique(geojson, nameField);
  }, [geojson, nameField]);

  const previewFor = useMemo(() => {
    if (!geojson || !nameField) return [];
    const seen = new Set();
    const out = [];
    for (const f of geojson.features || []) {
      const v = f?.properties?.[nameField];
      if (v === null || v === undefined || v === '') continue;
      const s = String(v);
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= 3) break;
    }
    return out;
  }, [geojson, nameField]);

  function stripExtension(name) {
    return name.replace(/\.(geo)?json$/i, '');
  }

  function onFilePicked(picked) {
    if (!picked) return;
    setFile(picked);
    setStep('parsing');
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      let parsed;
      try {
        parsed = JSON.parse(ev.target.result);
      } catch {
        setError('Could not parse file as JSON. Make sure it\'s a valid .geojson or .json file.');
        setStep('idle');
        return;
      }
      const result = auditBoundary(parsed);
      setGeojson(parsed);
      setAudit(result);
      setNameField(result.recommendedField || result.candidateNameFields[0]?.property || '');
      setDisplayName(stripExtension(picked.name));
      setStep('review');
    };
    reader.onerror = () => {
      setError('Could not read the file.');
      setStep('idle');
    };
    reader.readAsText(picked);
  }

  async function handleUpload() {
    if (!geojson || !file || !nameField || !displayName.trim()) {
      setError('Please pick a name field and provide a display name.');
      return;
    }
    setStep('uploading');
    setError('');
    setUploadProgress(0);

    const layerId = `custom-${crypto.randomUUID()}`;
    const path = `${layerId.slice('custom-'.length)}.json`;
    const featureCount = audit?.featureCount || 0;
    const uniqueNamesCount = uniqueForCurrentField;

    try {
      // The server enforces path prefix `custom-boundaries/{orgId}/`, so we
      // don't know the orgId here — the server tacks it on. But we need to
      // pass the raw path fragment; @vercel/blob upload() sends whatever
      // path we give it. To match the server's expectedPrefix check, the
      // client asks the server first: we could inline that in save-token
      // by reading orgId from the JWT. For now, use a placeholder org
      // segment and let the server rewrite via allowed prefix — actually
      // save-token verifies the pathname the CLIENT chose. So we need the
      // orgId. Simplest: ask save-token to compute the path itself by
      // sending only the filename and having the server generate the full
      // path. But handleUpload's token exchange requires the client to
      // propose the path. Compromise: fetch orgId via a lightweight call.
      // See onBeforeGenerateToken: expectedPrefix is `custom-boundaries/${orgId}/`.
      // We use the layerId's UUID as the filename.
      const orgRes = await fetch('/api/auth/me');
      if (!orgRes.ok) throw new Error('Not authenticated');
      const me = await orgRes.json();
      if (!me?.orgId) throw new Error('No organization on file');

      const fullPath = `custom-boundaries/${me.orgId}/${path}`;
      const geojsonBlob = new Blob([JSON.stringify(geojson)], { type: 'application/json' });

      const blob = await upload(fullPath, geojsonBlob, {
        access: 'public',
        handleUploadUrl: '/api/auth/custom-boundaries/save-token',
        clientPayload: JSON.stringify({
          layerId,
          displayName: displayName.trim(),
          nameField,
          featureCount,
          uniqueNamesCount,
        }),
        onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
      });

      // Fetch the just-saved row so we return the full metadata (id, uploaded_at)
      const listRes = await fetch('/api/auth/custom-boundaries');
      const listData = await listRes.json();
      const saved = (listData?.boundaries || []).find((b) => b.layer_id === layerId) || {
        layer_id: layerId,
        display_name: displayName.trim(),
        name_field: nameField,
        blob_url: blob.url,
        feature_count: featureCount,
        unique_names_count: uniqueNamesCount,
        uploaded_at: new Date().toISOString(),
      };

      setStep('done');
      onBoundaryAdded(saved);
    } catch (err) {
      setError(err.message || 'Upload failed.');
      setStep('review');
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: 'var(--dark-navy)' }}>
            Add Custom Boundary
          </h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* IDLE / SIGN-IN / CAP */}
        {step === 'idle' && isAnonymous && (
          <div style={body}>
            <p style={hint}>Sign in to upload custom GeoJSON boundaries and have them stay across sessions.</p>
            <button style={primaryBtn} onClick={() => onOpenUpgrade?.()}>Sign in →</button>
          </div>
        )}
        {step === 'idle' && !isAnonymous && atCap && (
          <div style={body}>
            <div style={capNotice}>
              <strong>You've reached the {limit}-boundary limit for {TIERS[tier]?.label || 'this'} accounts.</strong>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                Delete a boundary from the sidebar to make room, or upgrade to Pro for unlimited custom boundaries.
              </p>
            </div>
            <button style={primaryBtn} onClick={() => onOpenUpgrade?.()}>Upgrade to Pro →</button>
          </div>
        )}
        {step === 'idle' && !isAnonymous && !atCap && (
          <div style={body}>
            <p style={hint}>Upload a GeoJSON FeatureCollection of polygons — wards, service areas, catchments, anything you want to overlay and analyse against.</p>
            {limit !== Infinity && (
              <p style={{ ...hint, fontSize: 12, color: '#7a8fa6' }}>
                {existingCount} of {limit} boundaries used.
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".geojson,.json"
              style={{ display: 'none' }}
              onChange={(e) => onFilePicked(e.target.files?.[0])}
            />
            <button style={chooseFileBtn} onClick={() => fileRef.current?.click()}>
              Choose a file
            </button>
            <p style={{ fontSize: 11, color: '#7a8fa6', margin: '4px 0 0' }}>GeoJSON (.geojson or .json)</p>
            {error && <p style={errorStyle}>{error}</p>}
          </div>
        )}

        {/* PARSING */}
        {step === 'parsing' && (
          <div style={body}>
            <style>{`@keyframes cb-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
              <div style={{ width: 24, height: 24, border: '3px solid #e2e8f0', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'cb-spin 0.8s linear infinite' }} />
              <span style={hint}>Reading file…</span>
            </div>
          </div>
        )}

        {/* REVIEW */}
        {step === 'review' && audit && (() => {
          const canUpload = audit.ok && nameField && displayName.trim().length > 0;
          return (
            <div style={body}>
              {audit.errors.length > 0 ? (
                <div style={errorBox}>
                  {audit.errors.map((e, i) => <p key={i} style={{ margin: 0, fontSize: 13 }}>⚠ {e}</p>)}
                </div>
              ) : (
                <div style={proposalCard('high')}>
                  <div style={proposalHeader}>
                    <span style={proposalTitle}>✓ Boundary file looks valid</span>
                  </div>
                  <div style={summaryGrid}>
                    <span style={summaryLabel}>Features</span>
                    <span style={summaryValue}>{audit.featureCount.toLocaleString()}</span>
                    <span style={summaryLabel}>Geometry</span>
                    <span style={summaryValue}>{audit.geometryTypes.join(', ')}</span>
                    <span style={summaryLabel}>Unique names</span>
                    <span style={summaryValue}>
                      {uniqueForCurrentField.toLocaleString()} <span style={{ color: '#7a8fa6', fontWeight: 400 }}>(by {nameField})</span>
                    </span>
                  </div>
                </div>
              )}

              {audit.warnings.map((w, i) => (
                <p key={i} style={warningStyle}>⚠ {w}</p>
              ))}

              {audit.candidateNameFields.length > 0 && (
                <div style={editPanel}>
                  <div style={roleRow}>
                    <div style={roleRowHeader}>
                      <span style={roleLabel}>Name field</span>
                      <span style={roleArrow}>→</span>
                      <span style={roleColName}>{nameField || '—'}</span>
                      <button style={linkBtn} onClick={() => setShowFieldPicker((v) => !v)}>
                        {showFieldPicker ? 'hide' : 'change'}
                      </button>
                    </div>
                    {previewFor.length > 0 && (
                      <span style={roleSample}>Sample: {previewFor.map((v) => `"${v}"`).join(', ')}</span>
                    )}
                  </div>

                  {showFieldPicker && (
                    <div style={{ marginTop: 6, borderTop: '1px solid #dde3ea', paddingTop: 6 }}>
                      {audit.candidateNameFields.map((c) => {
                        const t = confidenceTier(c.score);
                        return (
                          <label key={c.property} style={fieldPickerRow}>
                            <input
                              type="radio"
                              name="nameField"
                              checked={nameField === c.property}
                              onChange={() => setNameField(c.property)}
                            />
                            <span style={{ fontWeight: 600, fontSize: 12, flex: 1, wordBreak: 'break-word' }}>
                              {c.property}
                            </span>
                            <span style={rolePerConf(t)}>{c.score}%</span>
                            <span style={{ fontSize: 11, color: '#7a8fa6', minWidth: 90, textAlign: 'right' }}>
                              {c.unique} unique · {Math.round(c.coverage * 100)}% coverage
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1c3557', display: 'block', marginBottom: 4 }}>
                  Display name
                </label>
                <input
                  style={{ ...sel, width: '100%', boxSizing: 'border-box' }}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Chicago Wards"
                />
              </div>

              {error && <p style={errorStyle}>{error}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button style={secondaryBtn} onClick={onClose}>Cancel</button>
                <button
                  style={{ ...primaryBtn, opacity: canUpload ? 1 : 0.5, cursor: canUpload ? 'pointer' : 'not-allowed' }}
                  disabled={!canUpload}
                  onClick={handleUpload}
                >
                  Upload →
                </button>
              </div>
            </div>
          );
        })()}

        {/* UPLOADING */}
        {step === 'uploading' && (
          <div style={body}>
            <p style={hint}>Uploading boundary…</p>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${uploadProgress}%` }} />
            </div>
            <p style={{ ...hint, fontSize: 12, color: '#7a8fa6' }}>{uploadProgress}%</p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div style={body}>
            <p style={detectedBadge}>✓ Boundary added — available under Uploaded Geographies</p>
            <button style={primaryBtn} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ─── (copies from UploadModal to keep the two dialogs visually aligned) ───

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: '#fff', borderRadius: 6, width: 500, maxWidth: '95vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto',
};
const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderBottom: '1px solid #dde3ea',
};
const closeBtn = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7a8fa6' };
const body = { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 };
const hint = { fontSize: 13, color: '#4a5568', margin: 0 };
const errorStyle = { fontSize: 13, color: 'var(--red)', margin: 0 };
const warningStyle = { fontSize: 12, color: '#b45309', background: '#fef3c7', borderRadius: 3, padding: '6px 10px', margin: 0 };
const errorBox = {
  fontSize: 13, color: '#b91c1c', background: '#fef2f2',
  border: '1px solid #fca5a5', borderRadius: 5, padding: '10px 12px',
  display: 'flex', flexDirection: 'column', gap: 4,
};
const detectedBadge = { fontSize: 13, fontWeight: 600, color: '#166534', background: '#dcfce7', borderRadius: 3, padding: '6px 10px', margin: 0 };
const sel = { padding: '5px 8px', border: '1px solid #c5d0da', borderRadius: 3, fontSize: 13 };
const primaryBtn = {
  padding: '9px 18px', background: 'var(--red)', color: '#fff',
  border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  alignSelf: 'flex-start',
};
const secondaryBtn = {
  padding: '9px 18px', background: '#f0f4f8', color: '#1c3557',
  border: '1px solid #dde3ea', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  alignSelf: 'flex-start',
};
const linkBtn = {
  background: 'none', border: 'none', fontSize: 12, color: 'var(--mid-blue)',
  cursor: 'pointer', padding: 0, textDecoration: 'underline',
};
const chooseFileBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', background: 'var(--dark-navy)', color: '#fff',
  border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  alignSelf: 'flex-start',
};
const progressTrack = { height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginTop: 8 };
const progressFill = { height: '100%', background: 'var(--red)', borderRadius: 4, transition: 'width 0.3s ease' };

const TIER_COLORS = {
  high:   { border: '#bbf7d0', bg: '#f0fdf4', text: '#166534', badgeBg: '#dcfce7' },
  medium: { border: '#fcd34d', bg: '#fffbeb', text: '#92400e', badgeBg: '#fef3c7' },
  low:    { border: '#fca5a5', bg: '#fef2f2', text: '#b91c1c', badgeBg: '#fee2e2' },
};
function proposalCard(tier) {
  const c = TIER_COLORS[tier];
  return {
    background: c.bg, border: `1px solid ${c.border}`, borderRadius: 5,
    padding: '10px 12px', display: 'flex', flexDirection: 'column',
  };
}
const proposalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const proposalTitle = { fontSize: 13, fontWeight: 700, color: '#1c3557' };

const summaryGrid = {
  marginTop: 8,
  display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px 10px',
  fontSize: 12,
};
const summaryLabel = { color: '#7a8fa6', fontWeight: 600 };
const summaryValue = { color: '#1c3557', fontWeight: 600, wordBreak: 'break-word' };

const editPanel = {
  padding: '10px 12px', background: '#f8fafc',
  border: '1px solid #dde3ea', borderRadius: 5,
  display: 'flex', flexDirection: 'column', gap: 4,
};
const roleRow = { display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12, padding: '2px 0' };
const roleRowHeader = { display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 };
const roleLabel = { color: '#4a5568', fontWeight: 600, minWidth: 90, flexShrink: 0 };
const roleArrow = { color: '#7a8fa6' };
const roleColName = { color: '#1c3557', fontWeight: 600, wordBreak: 'break-word', flex: 1, minWidth: 0 };
const roleSample = { color: '#7a8fa6', fontStyle: 'italic', paddingLeft: 96, wordBreak: 'break-word' };
function rolePerConf(tier) {
  const c = TIER_COLORS[tier];
  return {
    fontSize: 10, fontWeight: 700, color: c.text, background: c.badgeBg,
    borderRadius: 8, padding: '1px 6px', textAlign: 'center', minWidth: 32, flexShrink: 0,
  };
}
const fieldPickerRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '4px 0', cursor: 'pointer',
};

const capNotice = {
  fontSize: 13, color: '#b45309', background: '#fef3c7',
  border: '1px solid #fcd34d', borderRadius: 5, padding: '10px 12px',
  display: 'flex', flexDirection: 'column',
};
