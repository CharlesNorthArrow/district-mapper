import { useState, useMemo } from 'react';

const TEXT_CONDITIONS = [
  { value: 'contains', label: 'contains' },
  { value: 'equals',   label: 'equals' },
  { value: 'starts',   label: 'starts with' },
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

function evalFilter(point, filter) {
  const raw = point[filter.column];
  const val = String(raw ?? '');
  const fval = filter.value;
  switch (filter.condition) {
    case 'contains': return val.toLowerCase().includes(fval.toLowerCase());
    case 'equals':   return val.toLowerCase() === fval.toLowerCase();
    case 'starts':   return val.toLowerCase().startsWith(fval.toLowerCase());
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
  return points.filter(p => filters.every(f => evalFilter(p, f)));
}

export default function FilterBar({ headers, sampleRows, activeFilters, onFiltersChange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ column: headers[0] || '', condition: 'contains', value: '' });

  const numericCols = useMemo(() => new Set(headers.filter(h => isNumericCol(h, sampleRows))), [headers, sampleRows]);

  function setDraftField(k, v) {
    setDraft(prev => {
      const next = { ...prev, [k]: v };
      // Reset condition to appropriate default when column type changes
      if (k === 'column') {
        const isNum = numericCols.has(v);
        next.condition = isNum ? '=' : 'contains';
        next.value = '';
      }
      return next;
    });
  }

  function addFilter() {
    if (!draft.column || !draft.value.trim()) return;
    onFiltersChange([...activeFilters, { ...draft, value: draft.value.trim() }]);
    setDraft({ column: draft.column, condition: draft.condition, value: '' });
    setAdding(false);
  }

  function removeFilter(i) {
    onFiltersChange(activeFilters.filter((_, idx) => idx !== i));
  }

  const isNum = numericCols.has(draft.column);
  const conditions = isNum ? NUM_CONDITIONS : TEXT_CONDITIONS;

  return (
    <div style={wrap}>
      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div style={chipRow}>
          {activeFilters.map((f, i) => (
            <span key={i} style={chip}>
              {f.column} {f.condition} "{f.value}"
              <button style={chipX} onClick={() => removeFilter(i)}>×</button>
            </span>
          ))}
          <button style={clearAll} onClick={() => onFiltersChange([])}>Clear all</button>
        </div>
      )}

      {/* Add filter row */}
      {adding ? (
        <div style={addRow}>
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
            onKeyDown={e => { if (e.key === 'Enter') addFilter(); if (e.key === 'Escape') setAdding(false); }}
            autoFocus
          />
          <button style={applyBtn} onClick={addFilter} disabled={!draft.value.trim()}>Add</button>
          <button style={cancelBtn} onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button style={filterToggle} onClick={() => setAdding(true)}>
          + Filter data
        </button>
      )}
    </div>
  );
}

const wrap = { padding: '6px 12px 4px', borderBottom: '1px solid #eef1f4', display: 'flex', flexDirection: 'column', gap: 4 };
const chipRow = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 };
const chip = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 10,
  fontSize: 11, color: '#1e3a8a', padding: '2px 8px',
};
const chipX = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#60a5fa', padding: 0, lineHeight: 1 };
const clearAll = { background: 'none', border: 'none', fontSize: 11, color: '#7a8fa6', cursor: 'pointer', textDecoration: 'underline', padding: 0 };
const addRow = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const sel = { padding: '4px 6px', border: '1px solid #c5d0da', borderRadius: 3, fontSize: 12, flex: 1, minWidth: 80 };
const valInput = { padding: '4px 8px', border: '1px solid #c5d0da', borderRadius: 3, fontSize: 12, flex: 1, minWidth: 80 };
const applyBtn = { padding: '4px 10px', background: '#1c3557', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const cancelBtn = { background: 'none', border: 'none', fontSize: 11, color: '#7a8fa6', cursor: 'pointer', textDecoration: 'underline' };
const filterToggle = {
  alignSelf: 'flex-start', background: 'none', border: '1px dashed #c5d0da', borderRadius: 3,
  fontSize: 11, fontWeight: 600, color: '#467c9d', cursor: 'pointer', padding: '3px 10px',
};
