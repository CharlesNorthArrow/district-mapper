import { useState, useMemo } from 'react';
import { summarizeByLayer } from '../lib/pointInDistrict';
import { LAYER_CONFIG } from '../lib/layerConfig';
import ExportControls from './ExportControls';

export default function AnalysisPanel({
  uploadedData,
  enrichedPoints,
  activeLayers,
  layerGeojson,
  selectedDistrict,
  onDistrictSelect,
}) {
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [open, setOpen] = useState(true);

  const { points, originalRows, headers } = uploadedData;

  // Detect numeric fields from headers
  const numericFields = useMemo(() => {
    return headers.filter((h) => {
      const vals = originalRows.slice(0, 20).map((r) => r[h]);
      return vals.some((v) => v !== '' && !isNaN(parseFloat(v)));
    });
  }, [headers, originalRows]);

  const layerSummary = useMemo(() => {
    if (activeLayers.length === 0) return {};
    return summarizeByLayer(enrichedPoints, activeLayers, numericFields);
  }, [enrichedPoints, activeLayers, numericFields]);

  const activeLayer = selectedLayer || activeLayers[0] || null;
  const rows = activeLayer ? (layerSummary[activeLayer] || []) : [];
  const unmatchedCount = enrichedPoints.filter((p) => p.unmatched).length;

  function handleTabClick(id) {
    setSelectedLayer(id);
    // Clear filter when switching tabs
    if (selectedDistrict) onDistrictSelect(selectedDistrict.layerId, selectedDistrict.districtName);
  }

  function getDisplayName(layerId) {
    if (LAYER_CONFIG[layerId]) return LAYER_CONFIG[layerId].displayName;
    if (layerId.startsWith('council-')) return `Council Districts (${layerId.replace('council-', '')})`;
    if (layerId.startsWith('custom-')) return `Custom: ${layerId.replace('custom-', '')}`;
    return layerId;
  }

  return (
    <div style={{ ...panel, height: open ? 'var(--panel-height)' : 40 }}>
      <div style={panelHeader}>
        <span style={panelTitle}>Analysis — {points.length.toLocaleString()} points</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedDistrict && (
            <span style={filterBadge}>
              {selectedDistrict.districtName}
              <button
                style={clearFilterBtn}
                onClick={() => onDistrictSelect(selectedDistrict.layerId, selectedDistrict.districtName)}
              >
                ✕
              </button>
            </span>
          )}
          {activeLayers.length === 0 && !selectedDistrict && (
            <span style={hint}>Enable boundary layers to analyze districts</span>
          )}
          <button style={toggleBtn} onClick={() => setOpen((o) => !o)}>
            {open ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {open && (
        <div style={panelBody}>
          {activeLayers.length > 0 && (
            <>
              <div style={layerTabs}>
                {activeLayers.map((id) => (
                  <button
                    key={id}
                    style={{
                      ...tabBtn,
                      background: activeLayer === id ? 'var(--dark-navy)' : '#edf2f7',
                      color: activeLayer === id ? '#fff' : 'var(--dark-navy)',
                    }}
                    onClick={() => handleTabClick(id)}
                  >
                    {getDisplayName(id)}
                  </button>
                ))}
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>District</th>
                      <th style={{ ...th, textAlign: 'right' }}>Points</th>
                      <th style={{ ...th, textAlign: 'right' }}>% of Total</th>
                      {numericFields.slice(0, 3).map((f) => (
                        <th key={f} style={{ ...th, textAlign: 'right' }}>Avg {f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const isSelected =
                        selectedDistrict?.layerId === activeLayer &&
                        selectedDistrict?.districtName === row.districtName;
                      return (
                        <tr
                          key={i}
                          style={{
                            ...(i % 2 === 0 ? {} : { background: '#f7fafc' }),
                            ...(isSelected ? selectedRow : {}),
                            cursor: 'pointer',
                          }}
                          onClick={() => onDistrictSelect(activeLayer, row.districtName)}
                        >
                          <td style={td}>{row.districtName}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{row.count.toLocaleString()}</td>
                          <td style={{ ...td, textAlign: 'right' }}>{row.pct}%</td>
                          {numericFields.slice(0, 3).map((f) => (
                            <td key={f} style={{ ...td, textAlign: 'right' }}>
                              {row.fieldAverages[f] !== undefined
                                ? row.fieldAverages[f].toFixed(2)
                                : '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {unmatchedCount > 0 && (
                      <tr style={{ background: '#fff5f5' }}>
                        <td style={{ ...td, color: 'var(--red)' }}>⚠ No district match</td>
                        <td style={{ ...td, textAlign: 'right', color: 'var(--red)' }}>
                          {unmatchedCount.toLocaleString()}
                        </td>
                        <td style={{ ...td, textAlign: 'right', color: 'var(--red)' }}>
                          {((unmatchedCount / points.length) * 100).toFixed(1)}%
                        </td>
                        {numericFields.slice(0, 3).map((f) => (
                          <td key={f} style={{ ...td, textAlign: 'right' }}>—</td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <ExportControls
            originalRows={originalRows}
            enrichedPoints={enrichedPoints}
            activeLayers={activeLayers}
            layerSummary={layerSummary}
            numericFields={numericFields}
            pointCount={points.length}
          />
        </div>
      )}
    </div>
  );
}

const panel = {
  position: 'absolute',
  bottom: 0, left: 0, right: 0,
  background: '#fff',
  borderTop: '2px solid var(--dark-navy)',
  display: 'flex', flexDirection: 'column',
  transition: 'height 0.25s ease',
  zIndex: 20,
  overflow: 'hidden',
};
const panelHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 16px',
  borderBottom: '1px solid #dde3ea',
  flexShrink: 0,
};
const panelTitle = {
  fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--dark-navy)',
};
const hint = { fontSize: 12, color: '#7a8fa6' };
const toggleBtn = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#7a8fa6',
};
const panelBody = {
  flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const layerTabs = {
  display: 'flex', gap: 4, padding: '8px 12px', flexShrink: 0, flexWrap: 'wrap',
};
const tabBtn = {
  padding: '4px 10px', border: 'none', borderRadius: 3,
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
};
const tableWrap = {
  flex: 1, overflowY: 'auto', padding: '0 12px',
};
const table = {
  width: '100%', borderCollapse: 'collapse', fontSize: 12,
};
const th = {
  padding: '5px 8px', background: '#f0f4f8',
  borderBottom: '1px solid #dde3ea',
  textAlign: 'left', fontWeight: 600, color: 'var(--dark-navy)',
  position: 'sticky', top: 0,
};
const td = {
  padding: '4px 8px', borderBottom: '1px solid #f0f4f8', fontSize: 12,
};
const selectedRow = {
  background: '#e8f0fe',
  borderLeft: '3px solid var(--mid-blue)',
};
const filterBadge = {
  display: 'flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 600,
  background: '#e8f0fe', color: 'var(--mid-blue)',
  borderRadius: 3, padding: '2px 6px',
};
const clearFilterBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 10, color: 'var(--mid-blue)', padding: 0, lineHeight: 1,
};
