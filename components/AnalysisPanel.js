import { useState, useMemo, useRef, useEffect } from 'react';
import { summarizeByLayer } from '../lib/pointInDistrict';
import { buildFilteredCSV, downloadCSV } from '../lib/exportHelpers';
import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';
import ExportControls from './ExportControls';
import FilterBar, { applyFilters } from './FilterBar';
import AnalysisGuide from './AnalysisGuide';

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

function lookupRep(districtName, officials) {
  if (!officials || !districtName.includes(' – ')) return null;
  const parts = districtName.split(' – ');
  const abbr = parts[0];
  const rawNum = parts.slice(1).join(' – '); // e.g. "Congressional District 1"

  let distNum;
  if (/at.?large/i.test(rawNum)) {
    distNum = 0; // at-large districts are keyed as 0 in the legislators JSON
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
const SCOPE_COLORS = {
  national: { active: '#1c3557', inactive: '#e8edf2', activeText: '#fff', inactiveText: '#1c3557' },
  state:    { active: '#467c9d', inactive: '#deeaf3', activeText: '#fff', inactiveText: '#2c5a75' },
  local:    { active: '#047857', inactive: '#d9f0e8', activeText: '#fff', inactiveText: '#065f46' },
  custom:   { active: '#6a4c93', inactive: '#ece8f5', activeText: '#fff', inactiveText: '#4c3068' },
};

export default function AnalysisPanel({
  uploadedData,
  enrichedPoints,
  activeLayers,
  layerGeojson,
  selectedDistrict,
  onDistrictSelect,
  onLayerIsolate,
  onChoropleth,
  onFilteredIndicesChange,
}) {
  // 'overview' | null (falls back to first layer) | layerId
  const [selectedLayer, setSelectedLayer] = useState('overview');
  const [open, setOpen] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [checkedDistricts, setCheckedDistricts] = useState(new Set());
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterAdding, setFilterAdding] = useState(null); // null | 'data' | 'district'
  const [officials, setOfficials] = useState(null); // null = not fetched yet
  const [analysisText, setAnalysisText] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const selectAllRef = useRef(null);

  const { points, originalRows, headers } = uploadedData;

  const filteredPoints = useMemo(() => applyFilters(enrichedPoints, activeFilters), [enrichedPoints, activeFilters]);

  // Notify parent when filter changes so it can sync the map
  useEffect(() => {
    if (activeFilters.length === 0) {
      onFilteredIndicesChange?.(null); // null = clear filter (show all)
    } else {
      onFilteredIndicesChange?.(filteredPoints.map(p => p._globalIndex));
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

  const isOverview = selectedLayer === 'overview';
  const activeLayer = isOverview ? null : (selectedLayer || null);
  const rows = activeLayer ? (layerSummary[activeLayer] || []) : [];
  const unmatchedCount = activeLayer
    ? filteredPoints.filter((p) => p[activeLayer] == null).length
    : 0;

  const checkedRowCount = useMemo(() => {
    if (!activeLayer || checkedDistricts.size === 0) return 0;
    return filteredPoints.filter((p) => checkedDistricts.has(p[activeLayer])).length;
  }, [filteredPoints, activeLayer, checkedDistricts]);

  useMemo(() => {
    if (!selectAllRef.current || rows.length === 0) return;
    const allChecked = rows.every((r) => checkedDistricts.has(r.districtName));
    const someChecked = rows.some((r) => checkedDistricts.has(r.districtName));
    selectAllRef.current.checked = allChecked;
    selectAllRef.current.indeterminate = someChecked && !allChecked;
  }, [checkedDistricts, rows]);

  // Fetch US House members when the congressional tab is first viewed
  useEffect(() => {
    if (activeLayer !== 'congressional' || officials !== null) return;
    fetch('/api/officials')
      .then(r => r.ok ? r.json() : null)
      .then(data => setOfficials(data || {}))
      .catch(() => setOfficials({}));
  }, [activeLayer, officials]);

  // Clear plain language analysis when a new dataset is uploaded
  useEffect(() => {
    setAnalysisText(null);
    setAnalysisError(null);
    setAnalysisLoading(false);
  }, [enrichedPoints]);

  // Keep choropleth in sync when enriched data updates while a layer tab is active
  useEffect(() => {
    if (!activeLayer || !onChoropleth) return;
    const cfg = getLayerCfg(activeLayer);
    const counts = Object.fromEntries((layerSummary[activeLayer] || []).map(r => [r.districtName, r.count]));
    onChoropleth(activeLayer, counts, cfg.districtField, cfg.stateField);
  }, [layerSummary, activeLayer]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabClick(id) {
    setSelectedLayer(id);
    setCheckedDistricts(new Set());
    if (selectedDistrict) onDistrictSelect(selectedDistrict.layerId, selectedDistrict.districtName);
    if (id === 'overview') {
      onLayerIsolate?.(null);
      onChoropleth?.(null);
    } else {
      onLayerIsolate?.(id);
      const cfg = getLayerCfg(id);
      const counts = Object.fromEntries((layerSummary[id] || []).map(r => [r.districtName, r.count]));
      onChoropleth?.(id, counts, cfg.districtField, cfg.stateField);
    }
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
    const layerName = getDisplayName(activeLayer).replace(/\s+/g, '-').toLowerCase();
    const csv = buildFilteredCSV(originalRows, enrichedPoints, activeLayer, checkedDistricts, activeLayers);
    downloadCSV(csv, `filtered-${layerName}-${dateStr}.csv`);
  }

  async function handleGenerateAnalysis() {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const layers = activeLayers.map((layerId) => ({
        displayName: getDisplayName(layerId),
        totalMatched: (layerSummary[layerId] || []).reduce((s, r) => s + r.count, 0),
        totalUnmatched: filteredPoints.filter((p) => p[layerId] == null).length,
        topDistricts: (layerSummary[layerId] || []).slice(0, 8).map((r) => ({
          name: r.districtName, count: r.count, pct: r.pct,
        })),
      }));
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalPoints: points.length,
          headers,
          sampleRows: originalRows.slice(0, 15),
          layers,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || res.statusText);
      setAnalysisText(data.text);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function getDisplayName(layerId) {
    if (!layerId) return '';
    if (LAYER_CONFIG[layerId]) return LAYER_CONFIG[layerId].displayName;
    if (layerId.startsWith('council-')) return `Council Districts (${layerId.replace('council-', '')})`;
    if (layerId.startsWith('custom-')) return `Custom: ${layerId.replace('custom-', '')}`;
    return layerId;
  }

  return (
    <div style={{ ...panel, height: open ? 'var(--panel-height)' : 40 }}>
      <div style={panelHeader}>
        <span style={panelTitle}>Analysis — {points.length.toLocaleString()} points</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {selectedDistrict && (
            <span style={filterBadge}>
              {selectedDistrict.districtName}
              <button
                style={clearFilterBtn}
                onClick={() => onDistrictSelect(selectedDistrict.layerId, selectedDistrict.districtName)}
              >✕</button>
            </span>
          )}

          {/* Filter group */}
          <div data-guide="filter-group" style={headerGroup}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#7a8fa6', flexShrink: 0 }}>
              <path d="M1 2h14l-5 6.5V14l-4-2V8.5L1 2z"/>
            </svg>
            <span style={headerGroupLabel}>Filter by:</span>
            <button
              style={{ ...headerGroupBtn, ...(filterAdding === 'data' ? headerGroupBtnActiveData : {}) }}
              onClick={() => setFilterAdding(filterAdding === 'data' ? null : 'data')}
            >
              Program Data
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

          {/* Download group */}
          <div data-guide="export-controls">
            <ExportControls
              originalRows={originalRows}
              enrichedPoints={enrichedPoints}
              activeLayers={activeLayers}
              layerSummary={layerSummary}
              numericFields={numericFields}
              pointCount={points.length}
              compact
            />
          </div>

          {open && (
            <button style={guideBtn} onClick={() => setShowGuide(true)}>
              What am I looking at?
            </button>
          )}

          <button style={toggleBtn} onClick={() => setOpen((o) => !o)}>
            {open ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {open && (
        <div style={panelBody}>
          {/* Filter bar — always shown when data is loaded */}
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

          {activeLayers.length > 0 && (
            <>
              {/* Tab bar */}
              <div data-guide="layer-tabs" style={layerTabs}>
                {/* Plain Language tab — always first */}
                <button
                  style={{
                    ...tabBtn,
                    background: selectedLayer === 'plain-language' ? '#f5a800' : '#fef3c7',
                    color: selectedLayer === 'plain-language' ? '#fff' : '#92400e',
                  }}
                  onClick={() => handleTabClick('plain-language')}
                >
                  Plain Language
                </button>

                {/* Overview tab */}
                <button
                  style={{
                    ...tabBtn,
                    background: isOverview ? '#1c3557' : '#edf2f7',
                    color: isOverview ? '#fff' : '#1c3557',
                  }}
                  onClick={() => handleTabClick('overview')}
                >
                  Overview
                </button>

                {/* Per-layer tabs */}
                {sortedLayers.map((id) => {
                  const scope = getScope(id);
                  const colors = SCOPE_COLORS[scope];
                  const isActive = activeLayer === id;
                  return (
                    <button
                      key={id}
                      style={{
                        ...tabBtn,
                        background: isActive ? colors.active : colors.inactive,
                        color: isActive ? colors.activeText : colors.inactiveText,
                      }}
                      onClick={() => handleTabClick(id)}
                    >
                      {getDisplayName(id)}
                    </button>
                  );
                })}
              </div>

              {/* ── PLAIN LANGUAGE ── */}
              {selectedLayer === 'plain-language' && (
                <div style={plainLanguageWrap}>
                  {!analysisText && !analysisLoading && !analysisError && (
                    <div style={plainEmptyState}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
                      <div style={plainEmptyTitle}>Plain Language Analysis</div>
                      <p style={plainEmptyBody}>
                        Generate a short plain-English summary of the distribution using your uploaded data and active boundary layers.
                      </p>
                      <button
                        style={{ ...guideBtn, fontSize: 13, padding: '7px 18px', opacity: activeLayers.length === 0 ? 0.4 : 1 }}
                        disabled={activeLayers.length === 0}
                        onClick={handleGenerateAnalysis}
                      >
                        Generate Analysis
                      </button>
                      {activeLayers.length === 0 && (
                        <p style={{ fontSize: 11, color: '#7a8fa6', marginTop: 8 }}>Enable at least one boundary layer first.</p>
                      )}
                    </div>
                  )}

                  {analysisLoading && (
                    <div style={plainEmptyState}>
                      <div style={{ fontSize: 22, animation: 'spin 1s linear infinite', marginBottom: 8 }}>↻</div>
                      <div style={{ fontSize: 13, color: '#7a8fa6' }}>Generating analysis…</div>
                    </div>
                  )}

                  {analysisError && !analysisLoading && (
                    <div style={plainEmptyState}>
                      <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{analysisError}</p>
                      <button style={{ ...guideBtn, fontSize: 12 }} onClick={handleGenerateAnalysis}>
                        Try Again
                      </button>
                    </div>
                  )}

                  {analysisText && !analysisLoading && (
                    <div style={plainResult}>
                      {analysisText.split('\n\n').filter(Boolean).map((para, i) => (
                        <p key={i} style={plainPara}>{para}</p>
                      ))}
                      <button style={plainRegenerateBtn} onClick={handleGenerateAnalysis}>
                        ↻ Regenerate
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── OVERVIEW ── */}
              {isOverview && (
                <div data-guide="overview-cards" style={overviewScroll}>
                  {sortedLayers.map((layerId) => {
                    const scope = getScope(layerId);
                    const colors = SCOPE_COLORS[scope];
                    const layerRows = layerSummary[layerId] || [];
                    const matched = layerRows.reduce((s, r) => s + r.count, 0);
                    const unmatched = points.length - matched;
                    const topMax = layerRows[0]?.count || 1;
                    return (
                      <div key={layerId} style={{ ...overviewCard, borderTopColor: colors.active }}>
                        <div style={overviewCardHead}>
                          <span style={overviewLayerName}>{getDisplayName(layerId)}</span>
                        </div>
                        <div style={overviewStats}>
                          <span>{layerRows.length} districts</span>
                          <span style={overviewDot}>·</span>
                          <span>{matched.toLocaleString()} pts matched</span>
                          {unmatched > 0 && (
                            <>
                              <span style={overviewDot}>·</span>
                              <span style={{ color: 'var(--red)' }}>{unmatched.toLocaleString()} unmatched</span>
                            </>
                          )}
                        </div>
                        <div style={overviewTopList}>
                          {layerRows.slice(0, 3).map((r, i) => (
                            <div key={r.districtName} style={overviewTopRow}>
                              <span style={overviewRank}>#{i + 1}</span>
                              <div style={overviewBarTrack}>
                                <div style={{ ...overviewBar, width: `${(r.count / topMax) * 100}%`, background: colors.active }} />
                              </div>
                              <span style={overviewDistName}>{r.districtName}</span>
                              <span style={overviewDistCount}>{r.count.toLocaleString()}</span>
                              <span style={overviewDistPct}>{r.pct}%</span>
                            </div>
                          ))}
                          {layerRows.length === 0 && (
                            <span style={{ fontSize: 11, color: '#7a8fa6', fontStyle: 'italic' }}>No matches yet</span>
                          )}
                        </div>
                        <button style={overviewViewBtn} onClick={() => handleTabClick(layerId)}>
                          View details →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── LAYER DETAIL ── */}
              {!isOverview && activeLayer && selectedLayer !== 'plain-language' && (
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

                  <div data-guide="district-table" style={tableWrap}>
                    <table style={table}>
                      <thead>
                        <tr>
                          <th style={{ ...th, width: 28, padding: '5px 4px 5px 12px' }}>
                            <input ref={selectAllRef} type="checkbox" onChange={toggleSelectAll} title="Select all districts" />
                          </th>
                          <th style={th}>District</th>
                          {activeLayer === 'congressional' && (
                            <th style={th}>Representative</th>
                          )}
                          {activeLayer === 'congressional' && (
                            <th style={{ ...th, textAlign: 'center' }}>Party</th>
                          )}
                          <th style={{ ...th, textAlign: 'right' }}>Points</th>
                          <th style={{ ...th, textAlign: 'right' }}>% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => {
                          const isMapFiltered =
                            selectedDistrict?.layerId === activeLayer &&
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
                              <td style={{ ...td, cursor: 'pointer' }} onClick={() => onDistrictSelect(activeLayer, row.districtName)}>
                                {row.districtName}
                              </td>
                              {activeLayer === 'congressional' && (
                                <td style={td}>{renderRep(row.districtName, officials)}</td>
                              )}
                              {activeLayer === 'congressional' && (
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
                            {activeLayer === 'congressional' && <td style={td} />}
                            {activeLayer === 'congressional' && <td style={td} />}
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
            </>
          )}

        </div>
      )}
      <AnalysisGuide open={showGuide} onClose={() => setShowGuide(false)} />
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
const hintStyle = { fontSize: 12, color: '#7a8fa6' };
const toggleBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#7a8fa6' };
const guideBtn = {
  background: '#f5a800', border: 'none', borderRadius: 20,
  padding: '4px 12px', fontSize: 11, fontWeight: 700, color: '#fff',
  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  boxShadow: '0 2px 6px rgba(245,168,0,0.4)',
};
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
const layerTabs = { display: 'flex', gap: 4, padding: '8px 12px', flexShrink: 0, flexWrap: 'wrap' };
const tabBtn = {
  padding: '4px 10px', border: 'none', borderRadius: 3,
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
};
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

// Overview styles
const overviewScroll = {
  flex: 1, display: 'flex', flexDirection: 'row', gap: 10,
  padding: '8px 12px', overflowX: 'auto', overflowY: 'hidden', alignItems: 'flex-start',
};
const overviewCard = {
  minWidth: 200, maxWidth: 240, flex: '0 0 auto',
  border: '1px solid #dde3ea', borderTop: '3px solid #ccc',
  borderRadius: 4, padding: '10px 12px',
  display: 'flex', flexDirection: 'column', gap: 6,
  background: '#fff',
};
const overviewCardHead = { display: 'flex', flexDirection: 'column', gap: 3 };
const overviewScopePill = {
  display: 'inline-block', alignSelf: 'flex-start',
  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  padding: '2px 6px', borderRadius: 10,
};
const overviewLayerName = { fontSize: 12, fontWeight: 700, color: '#1c3557', lineHeight: 1.3 };
const overviewStats = {
  display: 'flex', flexWrap: 'wrap', gap: 3,
  fontSize: 11, color: '#7a8fa6',
};
const overviewDot = { color: '#c5d0da' };
const overviewTopList = { display: 'flex', flexDirection: 'column', gap: 4 };
const overviewTopRow = {
  display: 'grid',
  gridTemplateColumns: '14px 40px 1fr auto auto',
  alignItems: 'center', gap: 4,
};
const overviewRank = { fontSize: 10, color: '#a0aec0', textAlign: 'right' };
const overviewBarTrack = { height: 4, background: '#edf2f7', borderRadius: 2, overflow: 'hidden' };
const overviewBar = { height: '100%', borderRadius: 2, transition: 'width 0.3s ease' };
const overviewDistName = { fontSize: 11, color: '#1c3557', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const overviewDistCount = { fontSize: 11, fontWeight: 600, color: '#1c3557', textAlign: 'right', whiteSpace: 'nowrap' };
const overviewDistPct = { fontSize: 10, color: '#7a8fa6', textAlign: 'right', whiteSpace: 'nowrap', minWidth: 32 };
const overviewViewBtn = {
  marginTop: 2, padding: '3px 0',
  background: 'none', border: 'none',
  fontSize: 11, fontWeight: 600, color: 'var(--mid-blue)',
  cursor: 'pointer', textAlign: 'right', alignSelf: 'flex-end',
};

// Plain Language tab styles
const plainLanguageWrap = {
  flex: 1, overflowY: 'auto', padding: '16px 20px',
};
const plainEmptyState = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', textAlign: 'center',
  padding: '32px 24px', maxWidth: 400, margin: '0 auto',
};
const plainEmptyTitle = {
  fontFamily: 'Poppins, sans-serif', fontWeight: 700,
  fontSize: 14, color: '#1c3557', marginBottom: 8,
};
const plainEmptyBody = {
  fontSize: 13, color: '#7a8fa6', lineHeight: 1.5,
  marginBottom: 16,
};
const plainResult = {
  maxWidth: 680,
};
const plainPara = {
  fontSize: 14, color: '#2d3748', lineHeight: 1.7,
  marginBottom: 14, fontFamily: "'Open Sans', sans-serif",
};
const plainRegenerateBtn = {
  marginTop: 8,
  background: 'none', border: 'none',
  fontSize: 12, color: '#7a8fa6',
  cursor: 'pointer', padding: 0,
  textDecoration: 'underline',
};
