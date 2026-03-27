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

export default function Legend({ activeLayers, layerColors }) {
  if (activeLayers.length === 0) return null;

  return (
    <div style={styles.box}>
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
    </div>
  );
}

const styles = {
  box: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 5,
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
};
