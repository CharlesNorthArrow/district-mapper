import { useState, useMemo, useRef, useEffect } from 'react';
import { summarizeByLayer } from '../lib/pointInDistrict';
import { buildFilteredCSV, downloadCSV } from '../lib/exportHelpers';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';
import { isPolicyPulseLocked } from '../lib/tierConfig';
import { isScannableLayer } from '../lib/policyPulse';
import FilterBar, { applyFilters } from './FilterBar';
import PolicyDrawer from './PolicyPulse/PolicyDrawer';

const NATIONAL_IDS = new Set(['congressional', 'us-senate', 'counties', 'tribal-lands', 'urban-areas']);

function getScope(layerId) {
  if (NATIONAL_IDS.has(layerId)) return 'national';
  if (layerId.startsWith('state-') || layerId.startsWith('school-') || layerId === 'incorporated-places' || layerId === 'zcta') return 'state';
  if (layerId.startsWith('council-')) return 'local';
  return 'custom';
}

const SCOPE_ORDER = { national: 0, state: 1, local: 2, custom: 3 };

function getLayerCfg(layerId) {
  if (LAYER_CONFIG[layerId]) {
    return { districtField: LAYER_CONFIG[layerId].districtField, stateField: LAYER_CONFIG[layerId].stateField };
  }
  if (layerId?.startsWith('council-')) {
    const slug = layerId.slice('council-'.length);
    const city = CITY_COUNCIL_REGISTRY[slug];
    return { districtField: city?.districtField || 'NAME', stateField: null };
  }
  return { districtField: 'NAME', stateField: null };
}

const PARTY_BG    = { D: '#dbeafe', R: '#fee2e2', I: '#ede9fe' };
const PARTY_FG    = { D: '#1d4ed8', R: '#dc2626', I: '#7c3aed' };
const PARTY_LABEL = { D: 'Dem', R: 'Rep', I: 'Ind' };

const SCOPE_COLORS = {
  national: { active: '#1c3557', inactive: '#e8edf2' },
  state:    { active: '#467c9d', inactive: '#deeaf3' },
  local:    { active: '#047857', inactive: '#d9f0e8' },
  custom:   { active: '#6a4c93', inactive: '#ece8f5' },
};

function lookupRep(districtName, officials) {
  if (!officials || !districtName.includes(' – ')) return null;
  const parts = districtName.split(' – ');
  const abbr = parts[0];
  const rawNum = parts.slice(1).join(' – ');
  let distNum;
  if (/at.?large/i.test(rawNum)) {
    distNum = 0;
  } else {
    const m = rawNum.match(/\d+/);
    distNum = m ? parseInt(m[0], 10) : null;
  }
  if (distNum === null) return null;
  return officials[`${abbr}|${distNum}`] || null;
}

function renderRep(districtName, officials) {
  if (!officials) return <span style={{ color: '#c5d0da', fontSize: 11 }}>loading…</span>;
  const rep = lookupRep(districtName, officials);
  if (!rep) return <span style={{ color: '#c5d0da' }}>—</span>;
  return rep.url
    ? <a href={rep.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1c3557', fontSize: 12, textDecoration: 'none' }}>{rep.name}</a>
    : <span style={{ fontSize: 12 }}>{rep.name}</span>;
}

function renderParty(districtName, officials) {
  if (!officials) return null;
  const rep = lookupRep(districtName, officials);
  if (!rep) return <span style={{ color: '#c5d0da' }}>—</span>;
  const bg    = PARTY_BG[rep.party]    || '#f1f5f9';
  const color = PARTY_FG[rep.party]    || '#64748b';
  const label = PARTY_LABEL[rep.party] || rep.party;
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: bg, color }}>
      {label}
    </span>
  );
}

export default function AnalysisPanel({
  uploadedData,
  enrichedPoints,
  activeLayers,
  layerCounts = {},
  layerColors = {},
  selectedDistrict,
  onDistrictSelect,
  activeChoroLayer,
  onChoroLayerSelect,
  onFilteredIndicesChange,
  tier = 'free',
  onUpgradeClick,
  savedPolicies = [],
  onSaveScan,
  onDeletePolicyScan,
}) {
  const [open, setOpen] = useState(true);
  const [checkedDistricts, setCheckedDistricts] = useState(new Set());
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterAdding, setFilterAdding] = useState(null);
  const [officials, setOfficials] = useState(null);
  const [policyDrawer, setPolicyDrawer] = useState(null);
  const [panelHeight, setPanelHeight] = useState(310);
  const dragRef = useRef(null);
  const selectAllRef = useRef(null);

  function handleDragStart(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = panelHeight;
    function onMove(ev) {
      const delta = startY - ev.clientY;
      const next = Math.min(Math.max(startHeight + delta, 120), window.innerHeight - 80);
      setPanelHeight(next);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const { points, originalRows, headers } = uploadedData;

  const filteredPoints = useMemo(() => applyFilters(enrichedPoints, activeFilters), [enrichedPoints, activeFilters]);

  useEffect(() => {
    if (activeFilters.length === 0) {
      onFilteredIndicesChange?.(null);
    } else {
      onFilteredIndicesChange?.(filteredPoints.map((p) => p._globalIndex));
    }
  }, [filteredPoints, activeFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const numericFields = useMemo(() => {
    return headers.filter((h) => {
      const vals = originalRows.slice(0, 20).map((r) => r[h]);
      return vals.some((v) => v !== '' && !isNaN(parseFloat(v)));
    });
  }, [headers, originalRows]);

  const layerSummary = useMemo(() => {
    if (activeLayers.length === 0) return {};
    return summarizeByLayer(filteredPoints, activeLayers, numericFields);
  }, [filteredPoints, activeLayers, numericFields]);

  const sortedLayers = useMemo(
    () => [...activeLayers].sort((a, b) => (SCOPE_ORDER[getScope(a)] ?? 99) - (SCOPE_ORDER[getScope(b)] ?? 99)),
    [activeLayers]
  );

  const rows = activeChoroLayer ? (layerSummary[activeChoroLayer] || []) : [];
  const unmatchedCount = activeChoroLayer
    ? filteredPoints.filter((p) => p[activeChoroLayer] == null).length
    : 0;

  const checkedRowCount = useMemo(() => {
    if (!activeChoroLayer || checkedDistricts.size === 0) return 0;
    return filteredPoints.filter((p) => checkedDistricts.has(p[activeChoroLayer])).length;
  }, [filteredPoints, activeChoroLayer, checkedDistricts]);

  useMemo(() => {
    if (!selectAllRef.current || rows.length === 0) return;
    const allChecked = rows.every((r) => checkedDistricts.has(r.districtName));
    const someChecked = rows.some((r) => checkedDistricts.has(r.districtName));
    selectAllRef.current.checked = allChecked;
    selectAllRef.current.indeterminate = someChecked && !allChecked;
  }, [checkedDistricts, rows]);

  // Fetch US House members when viewing congressional breakdown
  useEffect(() => {
    if (activeChoroLayer !== 'congressional' || officials !== null) return;
    fetch('/api/officials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOfficials(data || {}))
      .catch(() => setOfficials({}));
  }, [activeChoroLayer, officials]);

  // Reset checked districts when switching layers
  useEffect(() => {
    setCheckedDistricts(new Set());
  }, [activeChoroLayer]);

  function getDisplayName(layerId) {
    if (!layerId) return '';
    if (LAYER_CONFIG[layerId]) return LAYER_CONFIG[layerId].displayName;
    if (layerId.startsWith('council-')) return `Council Districts (${layerId.replace('council-', '')})`;
    if (layerId.startsWith('custom-')) return `Custom: ${layerId.replace('custom-', '')}`;
    return layerId;
  }

  function toggleCheck(districtName) {
    setCheckedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(districtName)) next.delete(districtName);
      else next.add(districtName);
      return next;
    });
  }

  function toggleSelectAll() {
    const allChecked = rows.every((r) => checkedDistricts.has(r.districtName));
    if (allChecked) {
      setCheckedDistricts(new Set());
    } else {
      setCheckedDistricts(new Set(rows.map((r) => r.districtName)));
    }
  }

  function handleFilteredDownload() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const layerName = getDisplayName(activeChoroLayer).replace(/\s+/g, '-').toLowerCase();
    const csv = buildFilteredCSV(originalRows, enrichedPoints, activeChoroLayer, checkedDistricts, activeLayers);
    downloadCSV(csv, `filtered-${layerName}-${dateStr}.csv`);
  }

  const headerTitle = activeChoroLayer
    ? `${getDisplayName(activeChoroLayer)} — ${points.length.toLocaleString()} points`
    : `Analysis — ${points.length.toLocaleString()} points`;

  return (
    <div style={{ ...panel, height: open ? panelHeight : 40 }}>
      {/* Drag handle */}
      {open && (
        <div
          onMouseDown={handleDragStart}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 12,
            cursor: 'ns-resize', zIndex: 25,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#c5d0da' }} />
        </div>
      )}

      {/* Header */}
      <div style={panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeChoroLayer && (
            <button
              style={backBtn}
              onClick={() => onChoroLayerSelect?.(activeChoroLayer)}
              title="Back to all layers"
            >
              ← All layers
            </button>
          )}
          <span style={panelTitle}>{headerTitle}</span>
          {selectedDistrict && (
            <span style={filterBadge}>
              {selectedDistrict.districtName}
              <button
                style={clearFilterBtn}
                onClick={() => onDistrictSelect(selectedDistrict.layerId, selectedDistrict.districtName)}
              >✕</button>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Filter group */}
          <div style={headerGroup}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#7a8fa6', flexShrink: 0 }}>
              <path d="M1 2h14l-5 6.5V14l-4-2V8.5L1 2z"/>
            </svg>
            <span style={headerGroupLabel}>Filter:</span>
            <button
              style={{ ...headerGroupBtn, ...(filterAdding === 'data' ? headerGroupBtnActiveData : {}) }}
              onClick={() => setFilterAdding(filterAdding === 'data' ? null : 'data')}
            >
              Data
            </button>
            <span style={headerGroupDivider}>|</span>
            <button
              style={{ ...headerGroupBtn, ...(filterAdding === 'district' ? headerGroupBtnActiveDistrict : {}), opacity: activeLayers.length === 0 ? 0.4 : 1 }}
              onClick={() => activeLayers.length > 0 && setFilterAdding(filterAdding === 'district' ? null : 'district')}
              disabled={activeLayers.length === 0}
            >
              District
            </button>
          </div>

          <button style={toggleBtn} onClick={() => setOpen((o) => !o)}>
            {open ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {open && (
        <div style={panelBody}>
          {/* Filter bar */}
          <FilterBar
            headers={headers}
            sampleRows={originalRows.slice(0, 50)}
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
            activeLayers={activeLayers}
            allEnrichedPoints={enrichedPoints}
            getLayerName={getDisplayName}
            adding={filterAdding}
            onAddingChange={setFilterAdding}
          />

          {activeLayers.length === 0 && (
            <div style={emptyState}>
              <p style={emptyText}>Enable a boundary layer in the sidebar to analyze your data.</p>
            </div>
          )}

          {/* State 1: no layer selected — overview table */}
          {activeLayers.length > 0 && !activeChoroLayer && (
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Layer</th>
                    <th style={{ ...th, textAlign: 'right' }}>Districts</th>
                    <th style={th}>Top District</th>
                    <th style={{ ...th, textAlign: 'right' }}>Matched</th>
                    <th style={{ ...th, textAlign: 'right' }}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLayers.map((layerId, i) => {
                    const scope = getScope(layerId);
                    const colors = SCOPE_COLORS[scope];
                    const matched = layerCounts[layerId] ?? 0;
                    const pct = points.length > 0 ? ((matched / points.length) * 100).toFixed(1) : '0.0';
                    const summary = layerSummary[layerId] || [];
                    const districtCount = summary.length;
                    const topDistrict = summary[0];
                    return (
                      <tr
                        key={layerId}
                        style={{ ...(i % 2 === 0 ? {} : { background: '#f7fafc' }), cursor: 'pointer' }}
                        onClick={() => onChoroLayerSelect?.(layerId)}
                      >
                        <td style={td}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: layerColors[layerId] || colors.active, flexShrink: 0, display: 'inline-block' }} />
                            {getDisplayName(layerId)}
                            <span style={analyzeBtn}>See Breakdown →</span>
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: '#7a8fa6' }}>
                          {districtCount > 0 ? districtCount.toLocaleString() : '—'}
                        </td>
                        <td style={{ ...td, maxWidth: 160, overflow: 'hidden' }}>
                          {topDistrict ? (
                            <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                              <span style={{ fontWeight: 600, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{topDistrict.districtName}</span>
                              <span style={{ color: '#7a8fa6', fontSize: 11, flexShrink: 0 }}>({topDistrict.count.toLocaleString()})</span>
                            </span>
                          ) : <span style={{ color: '#c5d0da' }}>—</span>}
                        </td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{matched.toLocaleString()}</td>
                        <td style={{ ...td, textAlign: 'right', color: '#7a8fa6' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={overviewHint}>Click a layer to view district breakdown and choropleth map.</p>
            </div>
          )}

          {/* State 2: layer selected — district detail table */}
          {activeChoroLayer && (
            <>
              {checkedDistricts.size > 0 && (
                <div style={downloadBar}>
                  <span style={downloadBarLabel}>
                    {checkedDistricts.size} {checkedDistricts.size === 1 ? 'district' : 'districts'} selected
                    &nbsp;·&nbsp;
                    {checkedRowCount.toLocaleString()} rows
                  </span>
                  <button style={downloadBarBtn} onClick={handleFilteredDownload}>Download CSV</button>
                  <button style={downloadBarClear} onClick={() => setCheckedDistricts(new Set())}>Clear</button>
                </div>
              )}

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 28, padding: '5px 4px 5px 12px' }}>
                        <input ref={selectAllRef} type="checkbox" onChange={toggleSelectAll} title="Select all districts" />
                      </th>
                      <th style={th}>District</th>
                      {activeChoroLayer === 'congressional' && <th style={th}>Representative</th>}
                      {activeChoroLayer === 'congressional' && <th style={{ ...th, textAlign: 'center' }}>Party</th>}
                      <th style={{ ...th, textAlign: 'right' }}>Points</th>
                      <th style={{ ...th, textAlign: 'right' }}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const isMapFiltered =
                        selectedDistrict?.layerId === activeChoroLayer &&
                        selectedDistrict?.districtName === row.districtName;
                      const isChecked = checkedDistricts.has(row.districtName);
                      return (
                        <tr
                          key={i}
                          style={{
                            ...(i % 2 === 0 ? {} : { background: '#f7fafc' }),
                            ...(isMapFiltered ? mapFilteredRow : {}),
                            ...(isChecked ? checkedRow : {}),
                          }}
                        >
                          <td style={{ ...td, width: 28, padding: '4px 4px 4px 12px' }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(row.districtName)} />
                          </td>
                          <td style={{ ...td, cursor: 'pointer' }} onClick={() => onDistrictSelect(activeChoroLayer, row.districtName)}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {row.districtName}
                              {isScannableLayer(activeChoroLayer) && !isPolicyPulseLocked(tier) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPolicyDrawer({ layerId: activeChoroLayer, districtName: row.districtName, stateFips: null }); }}
                                  style={scanBtn}
                                >
                                  🔍 Scan Policies
                                </button>
                              )}
                              {isScannableLayer(activeChoroLayer) && isPolicyPulseLocked(tier) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onUpgradeClick?.(); }}
                                  style={scanBtnLocked}
                                >
                                  🔒 Policy
                                </button>
                              )}
                              <button
                                style={zoomInBtn}
                                onClick={(e) => { e.stopPropagation(); onDistrictSelect(activeChoroLayer, row.districtName); }}
                              >
                                Zoom In
                              </button>
                            </span>
                          </td>
                          {activeChoroLayer === 'congressional' && (
                            <td style={td}>{renderRep(row.districtName, officials)}</td>
                          )}
                          {activeChoroLayer === 'congressional' && (
                            <td style={{ ...td, textAlign: 'center' }}>{renderParty(row.districtName, officials)}</td>
                          )}
                          <td style={{ ...td, textAlign: 'right' }}>{row.count.toLocaleString()}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{row.pct}%</td>
                        </tr>
                      );
                    })}
                    {unmatchedCount > 0 && (
                      <tr style={{ background: '#fff5f5' }}>
                        <td style={{ ...td, padding: '4px 4px 4px 12px' }} />
                        <td style={{ ...td, color: 'var(--red)' }}>⚠ No district match</td>
                        {activeChoroLayer === 'congressional' && <td style={td} />}
                        {activeChoroLayer === 'congressional' && <td style={td} />}
                        <td style={{ ...td, textAlign: 'right', color: 'var(--red)' }}>{unmatchedCount.toLocaleString()}</td>
                        <td style={{ ...td, textAlign: 'right', color: 'var(--red)' }}>
                          {((unmatchedCount / points.length) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Saved Policy Scans */}
      {savedPolicies.length > 0 && (
        <div style={{ borderTop: '1px solid #e8edf2', flexShrink: 0 }}>
          <div style={{
            padding: '6px 16px', background: '#f7f9fc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1c3557', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Saved Scans ({savedPolicies.length})
            </span>
          </div>
          <div style={{ maxHeight: 130, overflowY: 'auto' }}>
            {savedPolicies.map((scan) => (
              <div key={scan.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 16px', borderBottom: '1px solid #f0f4f8', fontSize: 12,
              }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c3557', fontWeight: 600 }}>
                  {scan.districtName}
                </span>
                <span style={{ fontSize: 11, color: '#7a8fa6', flexShrink: 0 }}>
                  {scan.bills?.length ?? 0} bills · {scan.savedAt}
                </span>
                <button
                  onClick={() => {
                    setPolicyDrawer({ layerId: scan.layerId, districtName: scan.districtName, stateFips: null });
                  }}
                  style={savedScanViewBtn}
                >
                  View
                </button>
                <button
                  onClick={() => onDeletePolicyScan?.(scan.id)}
                  style={savedScanDeleteBtn}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {policyDrawer && (
        <PolicyDrawer
          layerId={policyDrawer.layerId}
          districtName={policyDrawer.districtName}
          stateFips={policyDrawer.stateFips}
          onClose={() => setPolicyDrawer(null)}
          onSaveScan={onSaveScan}
        />
      )}
    </div>
  );
}

const panel = {
  position: 'absolute', bottom: 0, left: 0, right: 0,
  background: '#fff', borderTop: '2px solid var(--dark-navy)',
  display: 'flex', flexDirection: 'column',
  transition: 'height 0.25s ease', zIndex: 20, overflow: 'hidden',
};
const panelHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 16px', borderBottom: '1px solid #dde3ea', flexShrink: 0,
};
const panelTitle = { fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--dark-navy)' };
const backBtn = {
  background: 'none', border: '1px solid #c5d0da', borderRadius: 4,
  padding: '3px 8px', fontSize: 11, fontWeight: 600, color: 'var(--mid-blue)',
  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
};
const toggleBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#7a8fa6' };
const headerGroup = {
  display: 'flex', alignItems: 'center', gap: 4,
  background: '#f8fafc', border: '1px solid #dde3ea', borderRadius: 5,
  padding: '3px 8px', flexShrink: 0,
};
const headerGroupLabel = {
  fontSize: 10, fontWeight: 700, color: '#7a8fa6',
  textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};
const headerGroupDivider = { fontSize: 10, color: '#c5d0da' };
const headerGroupBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 11, fontWeight: 600, color: '#1c3557', padding: '1px 4px', borderRadius: 3,
};
const headerGroupBtnActiveData = { background: '#dbeafe', color: '#1d4ed8' };
const headerGroupBtnActiveDistrict = { background: '#d1fae5', color: '#047857' };
const panelBody = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const downloadBar = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '5px 12px',
  background: '#fefce8', borderBottom: '1px solid #fde68a', flexShrink: 0,
};
const downloadBarLabel = { fontSize: 12, color: '#92400e', flex: 1 };
const downloadBarBtn = {
  padding: '3px 10px', background: 'var(--dark-navy)', color: '#fff',
  border: 'none', borderRadius: 3, fontSize: 11, fontWeight: 600, cursor: 'pointer',
};
const downloadBarClear = {
  background: 'none', border: 'none', fontSize: 11, color: '#92400e',
  cursor: 'pointer', textDecoration: 'underline',
};
const tableWrap = { flex: 1, overflowY: 'auto', padding: '0 12px' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const th = {
  padding: '5px 8px', background: '#f0f4f8', borderBottom: '1px solid #dde3ea',
  textAlign: 'left', fontWeight: 600, color: 'var(--dark-navy)', position: 'sticky', top: 0,
};
const td = { padding: '4px 8px', borderBottom: '1px solid #f0f4f8', fontSize: 12 };
const mapFilteredRow = { background: '#e8f0fe', boxShadow: 'inset 3px 0 0 var(--mid-blue)' };
const checkedRow = { background: '#fefce8' };
const filterBadge = {
  display: 'flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 600, background: '#e8f0fe', color: 'var(--mid-blue)',
  borderRadius: 3, padding: '2px 6px',
};
const clearFilterBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 10, color: 'var(--mid-blue)', padding: 0, lineHeight: 1,
};
const analyzeBtn = {
  fontSize: 11, fontWeight: 600, color: 'var(--mid-blue)',
  padding: '2px 6px', borderRadius: 3,
  background: '#edf2f7',
};
const overviewHint = {
  fontSize: 11, color: '#7a8fa6', padding: '8px 8px 12px', fontStyle: 'italic',
};
const emptyState = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
};
const emptyText = { fontSize: 13, color: '#7a8fa6', textAlign: 'center' };
const scanBtn = {
  background: 'none', border: '1px solid #a9dadc', borderRadius: 4,
  padding: '2px 8px', fontSize: 11, color: '#1c3557',
  cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
};
const savedScanViewBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 11, color: '#467c9d', fontWeight: 600, flexShrink: 0,
};
const savedScanDeleteBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 11, color: '#e63947', flexShrink: 0,
};
const scanBtnLocked = {
  background: 'none', border: '1px solid #e0e0e0', borderRadius: 4,
  padding: '2px 8px', fontSize: 11, color: '#aaa',
  cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
};
const zoomInBtn = {
  background: 'none', border: '1px solid #c5d0da', borderRadius: 4,
  padding: '2px 8px', fontSize: 11, fontWeight: 600, color: 'var(--mid-blue)',
  cursor: 'pointer', whiteSpace: 'nowrap',
};
