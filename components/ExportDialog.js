import { useState, useMemo, useRef, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { summarizeByLayer, assignDistricts } from '../lib/pointInDistrict';
import { buildEnrichedCSV, downloadCSV, downloadPdfBlob } from '../lib/exportHelpers';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';

const NATIONAL_LAYER_IDS = new Set(['us-senate', 'congressional', 'tribal-lands', 'urban-areas']);
const STATE_LAYER_IDS = new Set([
  'counties', 'county-subdivisions', 'zcta', 'state-senate', 'state-house',
  'school-unified', 'incorporated-places', 'school-elementary', 'school-secondary', 'opportunity-zones',
]);

async function fetchGeojsonForLayer(layerId, stateFips) {
  if (NATIONAL_LAYER_IDS.has(layerId)) {
    const res = await fetch(`/api/boundaries?layer=${layerId}`);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }
  if (STATE_LAYER_IDS.has(layerId)) {
    if (!stateFips?.length) return { type: 'FeatureCollection', features: [] };
    const results = await Promise.all(
      stateFips.map(async (fips) => {
        const res = await fetch(`/api/boundaries?layer=${layerId}&stateFips=${fips}`);
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
    );
    return { type: 'FeatureCollection', features: results.flatMap((r) => r.features || []) };
  }
  if (layerId.startsWith('council-')) {
    const slug = layerId.slice('council-'.length);
    const res = await fetch(`/api/city-councils?city=${slug}`);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }
  return null;
}

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#1c3557' },
  subtitle: { fontSize: 10, color: '#7a8fa6', marginBottom: 20 },
  sectionHeader: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1c3557', marginTop: 16, marginBottom: 6 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', paddingVertical: 3 },
  tableHeader: { flexDirection: 'row', borderBottom: '2px solid #1c3557', paddingBottom: 4, marginBottom: 2 },
  cell: { flex: 3 },
  cellRight: { flex: 1, textAlign: 'right' },
  headerCell: { flex: 3, fontFamily: 'Helvetica-Bold', color: '#1c3557' },
  headerCellRight: { flex: 1, fontFamily: 'Helvetica-Bold', color: '#1c3557', textAlign: 'right' },
  footer: { marginTop: 24, fontSize: 8, color: '#a0aec0' },
});

function pdfLookupRep(districtName, officials) {
  if (!officials) return null;
  const m = districtName.match(/^(.+?) [–-] (.+)$/);
  if (!m) return null;
  const abbr = m[1];
  const rawNum = m[2];
  const num = /at.?large/i.test(rawNum) ? 0 : parseInt((rawNum.match(/\d+/) || [])[0], 10);
  if (isNaN(num)) return null;
  return officials[`${abbr}|${num}`] || null;
}

const PARTY_LABEL = { D: 'Dem', R: 'Rep', I: 'Ind' };

function PDFReport({ layerSummary, activeLayers, pointCount, numericFields, datasetLabel, officials }) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  function getDisplayName(layerId) {
    if (LAYER_CONFIG[layerId]) return LAYER_CONFIG[layerId].displayName;
    if (layerId.startsWith('council-')) {
      const slug = layerId.replace('council-', '');
      const city = CITY_COUNCIL_REGISTRY[slug];
      return city?.displayName || (city ? `${city.name} Council Districts` : `Council Districts (${slug})`);
    }
    if (layerId.startsWith('custom-')) return `Custom: ${layerId.replace('custom-', '')}`;
    return layerId;
  }

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>District Mapper Report</Text>
        <Text style={pdfStyles.subtitle}>
          {date} · {pointCount.toLocaleString()} data points{datasetLabel ? ` · ${datasetLabel}` : ''}
        </Text>

        {activeLayers.map((layerId) => {
          const rows = layerSummary[layerId] || [];
          const isCongressional = layerId === 'congressional' && officials;
          return (
            <View key={layerId}>
              <Text style={pdfStyles.sectionHeader}>{getDisplayName(layerId)}</Text>
              <View style={pdfStyles.tableHeader}>
                <Text style={pdfStyles.headerCell}>District</Text>
                <Text style={pdfStyles.headerCellRight}>Points</Text>
                <Text style={pdfStyles.headerCellRight}>% of Total</Text>
                {isCongressional ? (
                  <>
                    <Text style={pdfStyles.headerCell}>Representative</Text>
                    <Text style={pdfStyles.headerCellRight}>Party</Text>
                  </>
                ) : numericFields.slice(0, 2).map((f) => (
                  <Text key={f} style={pdfStyles.headerCellRight}>Avg {f}</Text>
                ))}
              </View>
              {rows.map((row, i) => {
                const rep = isCongressional ? pdfLookupRep(row.districtName, officials) : null;
                return (
                  <View key={i} style={pdfStyles.tableRow}>
                    <Text style={pdfStyles.cell}>{row.districtName}</Text>
                    <Text style={pdfStyles.cellRight}>{row.count.toLocaleString()}</Text>
                    <Text style={pdfStyles.cellRight}>{row.pct}%</Text>
                    {isCongressional ? (
                      <>
                        <Text style={pdfStyles.cell}>{rep?.name || '—'}</Text>
                        <Text style={pdfStyles.cellRight}>{rep ? (PARTY_LABEL[rep.party] || rep.party) : '—'}</Text>
                      </>
                    ) : numericFields.slice(0, 2).map((f) => (
                      <Text key={f} style={pdfStyles.cellRight}>
                        {row.fieldAverages[f] !== undefined ? row.fieldAverages[f].toFixed(2) : '—'}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}

        <Text style={pdfStyles.footer}>Generated by District Mapper · North Arrow</Text>
      </Page>
    </Document>
  );
}

function getLayerDisplayName(layerId) {
  if (LAYER_CONFIG[layerId]) return LAYER_CONFIG[layerId].displayName;
  if (layerId.startsWith('council-')) {
    const slug = layerId.replace('council-', '');
    const city = CITY_COUNCIL_REGISTRY[slug];
    return city?.displayName || (city ? `${city.name} Council Districts` : `Council Districts (${slug})`);
  }
  if (layerId.startsWith('custom-')) return `Custom: ${layerId.replace('custom-', '')}`;
  return layerId;
}

function getGeoScope(layerId) {
  if (['congressional', 'us-senate', 'tribal-lands', 'urban-areas'].includes(layerId)) return 'national';
  if (layerId.startsWith('council-') || layerId.startsWith('custom-')) return 'local';
  return 'state';
}

export default function ExportDialog({
  dataBatches,
  enrichedPoints,
  suggestedLayers,
  activeLayers,
  existingLayerGeojson = {},
  stateFips = [],
  tier,
  onUpgradeClick,
  onClose,
}) {
  const hasMultipleBatches = dataBatches.length > 1;
  const steps = hasMultipleBatches ? ['format', 'datasets', 'geographies'] : ['format', 'geographies'];

  const [stepIdx, setStepIdx] = useState(0);
  const [format, setFormat] = useState('csv');
  const [selectedBatches, setSelectedBatches] = useState(() => new Set(dataBatches.map((b) => b.id)));
  const [selectedLayers, setSelectedLayers] = useState(() => new Set(activeLayers));
  const [pdfLoading, setPdfLoading] = useState(false);

  const [exportEnrichedPoints, setExportEnrichedPoints] = useState(null);
  const [loadingLayer, setLoadingLayer] = useState(null); // layerId being fetched, or null
  const geojsonCacheRef = useRef({ ...existingLayerGeojson });
  const [officials, setOfficials] = useState(null);

  const hasCongressional = selectedLayers.has('congressional');
  useEffect(() => {
    if (!hasCongressional || officials !== null) return;
    fetch('/api/officials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOfficials(data || {}))
      .catch(() => setOfficials({}));
  }, [hasCongressional]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = steps[stepIdx];
  const isLastStep = stepIdx === steps.length - 1;

  function toggleBatch(id) {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  }

  async function toggleLayer(id) {
    if (loadingLayer) return;
    const isRemoving = selectedLayers.has(id);
    setSelectedLayers((prev) => {
      const next = new Set(prev);
      if (isRemoving) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
    if (isRemoving) return;
    // Layer already in the map's geojson — enrichedPoints covers it, nothing to fetch
    if (geojsonCacheRef.current[id]) return;
    setLoadingLayer(id);
    try {
      const geojson = await fetchGeojsonForLayer(id, stateFips);
      if (geojson) geojsonCacheRef.current[id] = geojson;
      const allPoints = dataBatches.flatMap((b) => b.points);
      const enriched = await assignDistricts(allPoints, geojsonCacheRef.current);
      setExportEnrichedPoints(enriched);
    } catch {}
    setLoadingLayer(null);
  }

  const selectedBatchList = useMemo(
    () => dataBatches.filter((b) => selectedBatches.has(b.id)),
    [dataBatches, selectedBatches]
  );

  // Use locally-enriched points once ready; fall back to map's enrichedPoints while loading
  const basePoints = exportEnrichedPoints ?? enrichedPoints;
  const filteredPoints = useMemo(
    () => basePoints.filter((p) => selectedBatches.has(p._batchId)),
    [basePoints, selectedBatches]
  );

  // All checked suggested layers are available for export once enrichment is done
  const selectedLayerList = useMemo(
    () => suggestedLayers.filter((l) => selectedLayers.has(l)),
    [suggestedLayers, selectedLayers]
  );

  const numericFields = useMemo(() => {
    const SKIP = /^(lat|lng|lon|long|latitude|longitude|x|y|_x|_y|coord|coords)$/i;
    const allHeaders = selectedBatchList.flatMap((b) => b.headers);
    const uniqueHeaders = [...new Set(allHeaders)];
    return uniqueHeaders.filter((h) => {
      if (SKIP.test(h.trim())) return false;
      const vals = selectedBatchList.flatMap((b) => b.originalRows.slice(0, 10).map((r) => r[h]));
      return vals.some((v) => v != null && v !== '' && !isNaN(Number(String(v).trim())));
    });
  }, [selectedBatchList]);

  async function handleDownload() {
    const selLayers = selectedLayerList;
    if (selLayers.length === 0) return;

    if (format === 'csv') {
      const rows = selectedBatchList.flatMap((b) => b.originalRows);
      const csv = buildEnrichedCSV(rows, filteredPoints, selLayers);
      const filename = selectedBatchList.length === 1
        ? `${selectedBatchList[0].label.replace(/\s+/g, '-').toLowerCase()}-enriched.csv`
        : 'district-mapper-enriched.csv';
      downloadCSV(csv, filename);
      onClose();
      return;
    }

    if (tier === 'free') { onUpgradeClick?.(); return; }
    setPdfLoading(true);
    try {
      const summary = summarizeByLayer(filteredPoints, selLayers, numericFields);
      const label = selectedBatchList.length === 1 ? selectedBatchList[0].label : undefined;
      const blob = await pdf(
        <PDFReport
          layerSummary={summary}
          activeLayers={selLayers}
          pointCount={filteredPoints.length}
          numericFields={numericFields}
          datasetLabel={label}
          officials={officials}
        />
      ).toBlob();
      const filename = label
        ? `${label.replace(/\s+/g, '-').toLowerCase()}-report.pdf`
        : 'district-mapper-report.pdf';
      downloadPdfBlob(blob, filename);
      onClose();
    } finally {
      setPdfLoading(false);
    }
  }

  function handleNext() {
    if (isLastStep) { handleDownload(); return; }
    if (format === 'pdf' && tier === 'free' && currentStep === 'format') {
      onUpgradeClick?.(); return;
    }
    setStepIdx((i) => i + 1);
  }

  const isLoading = loadingLayer !== null;
  const downloadDisabled = isLastStep
    ? (pdfLoading || isLoading || selectedLayerList.length === 0)
    : pdfLoading;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeader}>
          <span style={modalTitle}>Export Data</span>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        {/* Step indicator */}
        <div style={stepBar}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ ...stepDot, background: i <= stepIdx ? '#1c3557' : '#dde3ea' }} />
              <span style={{ ...stepLabel, color: i === stepIdx ? '#1c3557' : '#9aabb8', fontWeight: i === stepIdx ? 700 : 400 }}>
                {s === 'format' ? 'Format' : s === 'datasets' ? 'Datasets' : 'Geographies'}
              </span>
              {i < steps.length - 1 && <span style={{ color: '#dde3ea', fontSize: 10, marginLeft: 2 }}>›</span>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={modalBody}>
          {currentStep === 'format' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={bodyHint}>Choose how you'd like to export your data.</p>
              <div
                style={{ ...optionCard, ...(format === 'csv' ? optionCardActive : {}) }}
                onClick={() => setFormat('csv')}
              >
                <div style={optionCardInner}>
                  <div style={optionRadio}>
                    <div style={{ ...optionDot, opacity: format === 'csv' ? 1 : 0 }} />
                  </div>
                  <div>
                    <div style={optionTitle}>CSV / Excel</div>
                    <div style={optionDesc}>Your original uploaded data with a new column added for each selected geography.</div>
                  </div>
                </div>
              </div>
              <div
                style={{ ...optionCard, ...(format === 'pdf' ? optionCardActive : {}), ...(tier === 'free' ? optionCardLocked : {}) }}
                onClick={() => setFormat('pdf')}
              >
                <div style={optionCardInner}>
                  <div style={optionRadio}>
                    <div style={{ ...optionDot, opacity: format === 'pdf' ? 1 : 0 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={optionTitle}>
                      PDF Report
                      {tier === 'free' && <span style={lockBadge}>🔒 Pro</span>}
                    </div>
                    <div style={optionDesc}>A distribution table showing how your members or programs are spread across each selected geography.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'datasets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={bodyHint}>Choose which datasets to include. At least one must be selected.</p>
              {dataBatches.map((batch) => (
                <label key={batch.id} style={checkRow}>
                  <input
                    type="checkbox"
                    checked={selectedBatches.has(batch.id)}
                    onChange={() => toggleBatch(batch.id)}
                    style={{ marginRight: 8, accentColor: '#1c3557' }}
                  />
                  <span style={{ ...colorSwatch, background: batch.color }} />
                  <span style={checkLabel}>{batch.label}</span>
                  <span style={checkSub}>{batch.points.length.toLocaleString()} rows</span>
                </label>
              ))}
            </div>
          )}

          {currentStep === 'geographies' && (
            <div>
              <p style={bodyHint}>Choose which geographies to include in the export.</p>

              {suggestedLayers.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9aabb8', fontStyle: 'italic' }}>
                  No geographies matched yet. Enable boundary geographies from the left panel and your data will be assigned automatically.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  {[
                    { scope: 'national', label: 'National' },
                    { scope: 'state',    label: 'State' },
                    { scope: 'local',    label: 'Local' },
                  ].map(({ scope, label }) => {
                    const colLayers = suggestedLayers.filter((id) => getGeoScope(id) === scope);
                    return (
                      <div key={scope}>
                        <div style={geoColHeader}>{label}</div>
                        {colLayers.length === 0 ? (
                          <p style={geoColEmpty}>—</p>
                        ) : colLayers.map((layerId) => (
                          <label
                            key={layerId}
                            style={{ ...geoCheckRow, cursor: isLoading ? 'default' : 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedLayers.has(layerId)}
                              onChange={() => toggleLayer(layerId)}
                              disabled={isLoading}
                              style={{ marginRight: 6, accentColor: '#1c3557', flexShrink: 0 }}
                            />
                            <span style={geoCheckLabel}>{getLayerDisplayName(layerId)}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {isLoading && (
                <div style={progressWrap}>
                  <div style={spinner} />
                  <div style={progressMsg}>Matching {getLayerDisplayName(loadingLayer)}…</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={modalFooter}>
          {stepIdx > 0 && (
            <button onClick={() => setStepIdx((i) => i - 1)} style={backBtn}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleNext}
            disabled={downloadDisabled}
            style={{ ...primaryBtn, opacity: downloadDisabled ? 0.5 : 1 }}
          >
            {pdfLoading ? 'Generating…' : isLastStep ? '⬇ Download' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 60,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Open Sans', sans-serif",
};
const modal = {
  background: '#fff',
  borderRadius: 10,
  width: 620,
  maxWidth: '96vw',
  boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};
const modalHeader = {
  background: '#1c3557', color: '#fff',
  padding: '14px 20px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const modalTitle = { fontSize: 14, fontWeight: 700 };
const closeBtn = {
  background: 'none', border: 'none', color: '#fff',
  fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0,
};
const stepBar = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', background: '#f7f9fc', borderBottom: '1px solid #eee',
};
const stepDot = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 };
const stepLabel = { fontSize: 11 };
const modalBody = { padding: '20px 20px 12px', minHeight: 160 };
const bodyHint = { fontSize: 12, color: '#7a8fa6', marginTop: 0, marginBottom: 14 };
const modalFooter = {
  padding: '12px 20px', borderTop: '1px solid #eee',
  display: 'flex', alignItems: 'center', gap: 8,
};
const optionCard = {
  border: '1.5px solid #dde3ea', borderRadius: 8,
  padding: '12px 14px', cursor: 'pointer',
  transition: 'border-color 0.15s',
};
const optionCardActive = { borderColor: '#1c3557', background: '#f5f8ff' };
const optionCardLocked = { opacity: 0.7 };
const optionCardInner = { display: 'flex', alignItems: 'flex-start', gap: 12 };
const optionRadio = {
  width: 16, height: 16, borderRadius: '50%', border: '2px solid #1c3557',
  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
};
const optionDot = { width: 8, height: 8, borderRadius: '50%', background: '#1c3557' };
const optionTitle = { fontSize: 13, fontWeight: 700, color: '#1c3557', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 };
const optionDesc = { fontSize: 11, color: '#7a8fa6', lineHeight: 1.5 };
const lockBadge = { fontSize: 10, background: '#fef9c3', color: '#92400e', borderRadius: 4, padding: '1px 6px', fontWeight: 700 };
const checkRow = {
  display: 'flex', alignItems: 'center', gap: 0,
  padding: '7px 10px', border: '1px solid #eef0f4', borderRadius: 6,
  cursor: 'pointer', fontSize: 13,
};
const colorSwatch = { width: 10, height: 10, borderRadius: 2, flexShrink: 0, marginRight: 8 };
const checkLabel = { fontWeight: 600, color: '#1c3557', flex: 1 };
const checkSub = { fontSize: 11, color: '#9aabb8' };
const backBtn = {
  background: 'none', border: '1px solid #dde3ea', borderRadius: 5,
  padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#7a8fa6', cursor: 'pointer',
};
const primaryBtn = {
  background: '#1c3557', color: '#fff',
  border: 'none', borderRadius: 5,
  padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const geoColHeader = {
  fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 12,
  color: '#1c3557', marginBottom: 8, paddingBottom: 6,
  borderBottom: '2px solid #1c3557',
};
const geoColEmpty = { fontSize: 12, color: '#c5d0da', margin: '6px 0' };
const geoCheckRow = {
  display: 'flex', alignItems: 'flex-start', gap: 0,
  padding: '4px 0', fontSize: 12,
};
const geoCheckLabel = { fontSize: 12, color: '#1c3557', lineHeight: 1.4 };
const progressWrap = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', marginTop: 14,
  background: '#f7f9fc', borderRadius: 7, border: '1px solid #dde3ea',
};
const spinner = {
  width: 14, height: 14, flexShrink: 0,
  border: '2px solid #dde3ea', borderTopColor: '#1c3557',
  borderRadius: '50%', animation: 'spin 0.75s linear infinite',
};
const progressMsg = { fontSize: 12, color: '#7a8fa6' };
