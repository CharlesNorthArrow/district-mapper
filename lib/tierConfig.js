export const TIERS = {
  free: {
    label: 'Free',
    maxAddresses: 100,
    maxLatLon: 500,
    pdfExport: false,
    aiAnalysis: false,
    officials: true,
  },
  pro: {
    label: 'Pro',
    maxAddresses: 5000,
    maxLatLon: Infinity,
    pdfExport: true,
    aiAnalysis: true,
    officials: true,
  },
  enterprise: {
    label: 'Enterprise',
    maxAddresses: Infinity,
    maxLatLon: Infinity,
    pdfExport: true,
    aiAnalysis: true,
    officials: true,
  },
};

// Layers locked on the free tier
export const LOCKED_LAYERS = [
  'tribal-lands',
  'urban-areas',
  'school-elementary',
  'school-secondary',
  'incorporated-places',
];

export function isLayerLocked(layerId, tier) {
  if (tier === 'pro' || tier === 'enterprise') return false;
  if (layerId.startsWith('council-')) return true;
  return LOCKED_LAYERS.includes(layerId);
}

export function getRowLimit(isLatLon, tier) {
  const t = TIERS[tier] || TIERS.free;
  return isLatLon ? t.maxLatLon : t.maxAddresses;
}
