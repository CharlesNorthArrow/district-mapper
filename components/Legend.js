import { LAYER_CONFIG } from '../lib/layerConfig';
import { CITY_COUNCIL_REGISTRY } from '../lib/cityCouncilRegistry';

function getDisplayName(layerId) {
  if (LAYER_CONFIG[layerId]) return LAYER_CONFIG[layerId].displayName;

  if (layerId.startsWith('council-')) {
    const slug = layerId.slice('council-'.length);
    // Check if this is an extra layer (e.g. nyc-nta lives under nyc)
    for (const [, city] of Object.entries(CITY_COUNCIL_REGISTRY)) {
      const extra = (city.extraLayers || []).find((e) => e.slug === slug);
      if (extra) {
        const parentName = CITY_COUNCIL_REGISTRY[slug.split('-')[0]]?.name || slug;
        return `${parentName} – ${extra.label}`;
      }
    }
    const city = CITY_COUNCIL_REGISTRY[slug];
    return city ? `${city.name} Council` : `${slug} Council`;
  }

  if (layerId.startsWith('custom-')) {
    return layerId.slice('custom-'.length).replace(/-+/g, ' ').replace(/\.\w+$/, '');
  }

  return layerId;
}

export default function Legend({ activeLayers, layerColors, dataBatches = [], choroLayer, choroColor, choroMax }) {
  const hasContent = activeLayers.length > 0 || dataBatches.length > 0;
  if (!hasContent && !choroLayer) return null;

  return (
    <div style={styles.box}>
      {/* Program data batches */}
      {dataBatches.map((batch) => (
        <div key={batch.id} style={styles.row}>
          <div style={{ ...styles.dotSwatch, background: batch.color }} />
          <span style={{ ...styles.label, fontWeight: 600 }}>{batch.label}</span>
        </div>
      ))}

      {/* Separator between data and boundaries */}
      {dataBatches.length > 0 && activeLayers.length > 0 && (
        <div style={styles.divider} />
      )}

      {/* Boundary layers */}
      {activeLayers.map((id) => {
        const color = layerColors[id] || '#467c9d';
        return (
          <div key={id} style={styles.row}>
            <div style={styles.swatch}>
              <div style={{ ...styles.swatchLine, background: color }} />
              <div style={{ ...styles.swatchFill, background: color }} />
            </div>
            <span style={styles.label}>{getDisplayName(id)}</span>
          </div>
        );
      })}

      {/* Choropleth intensity scale */}
      {choroLayer && choroColor && (
        <>
          {hasContent && <div style={styles.divider} />}
          <div style={styles.scaleLabel}>Intensity</div>
          <div style={{ ...styles.scaleBar, background: buildGradient(choroColor) }} />
          <div style={styles.scaleEnds}>
            <span>0</span>
            <span>{typeof choroMax === 'number' ? choroMax.toLocaleString() : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}

function buildGradient(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `linear-gradient(to right, rgba(70,124,157,0.08), rgba(70,124,157,0.72))`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `linear-gradient(to right, rgba(${r},${g},${b},0.08), rgba(${r},${g},${b},0.72))`;
}

const styles = {
  box: {
    background: 'rgba(255,255,255,0.93)',
    border: '1px solid #dde3ea',
    borderRadius: 6,
    padding: '7px 10px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
    maxHeight: 260,
    overflowY: 'auto',
    minWidth: 180,
    maxWidth: 260,
    pointerEvents: 'none',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '3px 0',
  },
  swatch: {
    width: 22,
    height: 14,
    flexShrink: 0,
    position: 'relative',
    borderRadius: 2,
    overflow: 'hidden',
  },
  swatchFill: {
    position: 'absolute',
    inset: 0,
    opacity: 0.15,
  },
  swatchLine: {
    position: 'absolute',
    inset: 0,
    opacity: 0.85,
    // Shows as a border-like indicator
    top: '30%',
    bottom: '30%',
    left: 0,
    right: 0,
  },
  label: {
    fontSize: 11,
    color: '#1c3557',
    fontFamily: "'Open Sans', sans-serif",
    lineHeight: 1.3,
  },
  dotSwatch: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    border: '1.5px solid rgba(255,255,255,0.6)',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
  },
  divider: {
    borderTop: '1px solid #dde3ea',
    margin: '4px 0',
  },
  scaleLabel: {
    fontSize: 10,
    color: '#9aabb8',
    fontFamily: "'Open Sans', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  scaleBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 3,
  },
  scaleEnds: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#7a8fa6',
    fontFamily: "'Open Sans', sans-serif",
  },
};
