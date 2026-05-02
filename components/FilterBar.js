import { useState, useMemo, useRef } from 'react';

const TEXT_CONDITIONS = [
  { value: 'contains',     label: 'contains' },
  { value: 'not_contains', label: 'does not include' },
  { value: 'equals',       label: 'equals' },
  { value: 'not_equals',   label: 'does not equal' },
  { value: 'starts',       label: 'starts with' },
];
const NUM_CONDITIONS = [
  { value: '=',  label: '=' },
  { value: '!=', label: '≠' },
  { value: '>',  label: '>' },
  { value: '>=', label: '≥' },
  { value: '<',  label: '<' },
  { value: '<=', label: '≤' },
];

function isNumericCol(colName, sampleRows) {
  const vals = sampleRows.map(r => r[colName]).filter(v => v !== '' && v != null);
  return vals.length > 0 && vals.slice(0, 20).filter(v => !isNaN(parseFloat(v))).length > vals.slice(0, 20).length * 0.7;
}

function evalDataFilter(point, filter) {
  const raw = point[filter.column];
  const val = String(raw ?? '');
  const fval = filter.value;
  switch (filter.condition) {
    case 'contains':     return val.toLowerCase().includes(fval.toLowerCase());
    case 'not_contains': return !val.toLowerCase().includes(fval.toLowerCase());
    case 'equals':       return val.toLowerCase() === fval.toLowerCase();
    case 'not_equals':   return val.toLowerCase() !== fval.toLowerCase();
    case 'starts':       return val.toLowerCase().startsWith(fval.toLowerCase());
    case '=':  return parseFloat(val) === parseFloat(fval);
    case '!=': return parseFloat(val) !== parseFloat(fval);
    case '>':  return parseFloat(val) > parseFloat(fval);
    case '>=': return parseFloat(val) >= parseFloat(fval);
    case '<':  return parseFloat(val) < parseFloat(fval);
    case '<=': return parseFloat(val) <= parseFloat(fval);
    default:   return true;
  }
}

export function applyFilters(points, filters) {
  if (filters.length === 0) return points;
  return points.filter(p => filters.every(f => {
    if (f.type === 'district') {
      const pointVal = p[f.layerId] ?? null;
      const match = pointVal === f.value;
      return f.mode === 'include' ? match : !match;
    }
    return evalDataFilter(p, f);
  }));
}

// adding: null | 'data' | 'district'
// Accepts optional controlled props `adding` + `onAddingChange`; falls back to internal state.
export default function FilterBar({
  headers,
  sampleRows,
  activeFilters,
  onFiltersChange,
  activeLayers,
  allEnrichedPoints,
  getLayerName,
  adding: addingProp,
  onAddingChange,
}) {
  const [addingInternal, setAddingInternal] = useState(null);
  const adding = addingProp !== undefined ? addingProp : addingInternal;
  const setAdding = onAddingChange || setAddingInternal;

  // Draft state for program-data filter
  const [draft, setDraft] = useState({ column: headers[0] || '', condition: 'contains', value: '' });

  // Draft state for district filter
  const [draftDistrict, setDraftDistrict] = useState({
    layerId: activeLayers?.[0] || '',
    mode: 'include',
    value: '',
  });

  const numericCols = useMemo(
    () => new Set(headers.filter(h => isNumericCol(h, sampleRows))),
    [headers, sampleRows]
  );

  // Unique sorted district values for the selected layer
  const districtOptions = useMemo(() => {
    if (!draftDistrict.layerId || !allEnrichedPoints?.length) return [];
    const vals = new Set(
      allEnrichedPoints.map(p => p[draftDistrict.layerId]).filter(v => v != null && v !== '')
    );
    return [...vals].sort();
  }, [draftDistrict.layerId, allEnrichedPoints]);

  function setDraftField(k, v) {
    setDraft(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'column') {
        const isNum = numericCols.has(v);
        next.condition = isNum ? '=' : 'contains';
        next.value = '';
      }
      return next;
    });
  }

  function addDataFilter() {
    if (!draft.column || !draft.value.trim()) return;
    onFiltersChange([...activeFilters, { type: 'data', ...draft, value: draft.value.trim() }]);
    setDraft({ column: draft.column, condition: draft.condition, value: '' });
    setAdding(null);
  }

  function addDistrictFilter() {
    if (!draftDistrict.layerId || !draftDistrict.value) return;
    const layerName = getLayerName?.(draftDistrict.layerId) || draftDistrict.layerId;
    onFiltersChange([...activeFilters, { type: 'district', ...draftDistrict, layerName }]);
    setDraftDistrict(prev => ({ ...prev, value: '' }));
    setAdding(null);
  }

  function removeFilter(i) {
    onFiltersChange(activeFilters.filter((_, idx) => idx !== i));
  }

  // When the parent opens the district form, reset to first layer so it's always fresh
  const prevAdding = useRef(null);
  if (adding === 'district' && prevAdding.current !== 'district') {
    setDraftDistrict(prev => ({ ...prev, layerId: activeLayers?.[0] || prev.layerId, value: '' }));
  }
  prevAdding.current = adding;

  const isNum = numericCols.has(draft.column);
  const conditions = isNum ? NUM_CONDITIONS : TEXT_CONDITIONS;

  // Nothing to show — don't render wrapper at all
  if (!activeFilters.length && adding === null) return null;

  return (
    <div style={wrap}>
      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div style={chipRow}>
          {activeFilters.map((f, i) => (
            <span key={i} style={f.type === 'district' ? districtChip : dataChip}>
              {f.type === 'district'
                ? <>{f.layerName} <em style={{ fontStyle: 'normal', opacity: 0.8 }}>{f.mode === 'include' ? 'includes' : 'does not include'}</em> &ldquo;{f.value}&rdquo;</>
                : <>{f.column} {TEXT_CONDITIONS.find(c => c.value === f.condition)?.label ?? f.condition} &ldquo;{f.value}&rdquo;</>
              }
              <button style={chipX} onClick={() => removeFilter(i)}>×</button>
            </span>
          ))}
          <button style={clearAll} onClick={() => onFiltersChange([])}>Clear all</button>
        </div>
      )}

      {/* Add filter UI */}
      {adding === 'data' && (
        <div style={addRow}>
          <span style={filterTypeLabel}>Program Data</span>
          <select style={sel} value={draft.column} onChange={e => setDraftField('column', e.target.value)}>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <select style={{ ...sel, width: 90 }} value={draft.condition} onChange={e => setDraftField('condition', e.target.value)}>
            {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            style={valInput}
            placeholder="value"
            value={draft.value}
            onChange={e => setDraftField('value', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addDataFilter(); if (e.key === 'Escape') setAdding(null); }}
            autoFocus
          />
          <button style={applyBtn} onClick={addDataFilter} disabled={!draft.value.trim()}>Add</button>
          <button style={cancelBtn} onClick={() => setAdding(null)}>Cancel</button>
        </div>
      )}

      {adding === 'district' && (
        <div style={addRow}>
          <span style={filterTypeLabel}>District</span>
          <select
            style={sel}
            value={draftDistrict.layerId}
            onChange={e => setDraftDistrict(prev => ({ ...prev, layerId: e.target.value, value: '' }))}
          >
            {(activeLayers || []).map(id => (
              <option key={id} value={id}>{getLayerName?.(id) || id}</option>
            ))}
          </select>
          <select
            style={{ ...sel, width: 90 }}
            value={draftDistrict.mode}
            onChange={e => setDraftDistrict(prev => ({ ...prev, mode: e.target.value }))}
          >
            <option value="include">includes</option>
            <option value="exclude">does not include</option>
          </select>
          <select
            style={{ ...sel, minWidth: 120 }}
            value={draftDistrict.value}
            onChange={e => setDraftDistrict(prev => ({ ...prev, value: e.target.value }))}
          >
            <option value="">— select district —</option>
            {districtOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <button style={applyDistrictBtn} onClick={addDistrictFilter} disabled={!draftDistrict.value}>Add</button>
          <button style={cancelBtn} onClick={() => setAdding(null)}>Cancel</button>
        </div>
      )}

    </div>
  );
}

const wrap = { padding: '6px 12px 4px', borderBottom: '1px solid #eef1f4', display: 'flex', flexDirection: 'column', gap: 4 };
const chipRow = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 };
const dataChip = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 10,
  fontSize: 11, color: '#1e3a8a', padding: '2px 8px',
};
const districtChip = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10,
  fontSize: 11, color: '#065f46', padding: '2px 8px',
};
const chipX = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#60a5fa', padding: 0, lineHeight: 1 };
const clearAll = { background: 'none', border: 'none', fontSize: 11, color: '#7a8fa6', cursor: 'pointer', textDecoration: 'underline', padding: 0 };
const addRow = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const filterTypeLabel = { fontSize: 10, fontWeight: 700, color: '#7a8fa6', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const sel = { padding: '4px 6px', border: '1px solid #c5d0da', borderRadius: 3, fontSize: 12, flex: 1, minWidth: 80 };
const valInput = { padding: '4px 8px', border: '1px solid #c5d0da', borderRadius: 3, fontSize: 12, flex: 1, minWidth: 80 };
const applyBtn = { padding: '4px 10px', background: '#1c3557', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const applyDistrictBtn = { padding: '4px 10px', background: '#047857', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const cancelBtn = { background: 'none', border: 'none', fontSize: 11, color: '#7a8fa6', cursor: 'pointer', textDecoration: 'underline' };
