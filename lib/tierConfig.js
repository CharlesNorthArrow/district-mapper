export const TIERS = {
  // Unauthenticated visitors — lower limits
  free_anonymous: {
    label: 'Free',
    maxAddresses: 100,
    maxLatLon: 500,
    pdfExport: false,
    aiAnalysis: false,
    officials: true,
    policyPulse: false,
  },
  // Logged-in free accounts — higher limits
  free: {
    label: 'Free',
    maxAddresses: 500,
    maxLatLon: 2500,
    pdfExport: false,
    aiAnalysis: false,
    officials: true,
    policyPulse: false,
  },
  pro: {
    label: 'Pro',
    maxAddresses: 5000,
    maxLatLon: Infinity,
    pdfExport: true,
    aiAnalysis: true,
    officials: true,
    policyPulse: true,
  },
  enterprise: {
    label: 'Enterprise',
    maxAddresses: Infinity,
    maxLatLon: Infinity,
    pdfExport: true,
    aiAnalysis: true,
    officials: true,
    policyPulse: true,
  },
};

// Layers locked on the free tier
export const LOCKED_LAYERS = [
  'tribal-lands',
  'urban-areas',
  'school-elementary',
  'school-secondary',
  'incorporated-places',
  'opportunity-zones',
];

export function isLayerLocked(layerId, tier) {
  if (tier === 'pro' || tier === 'enterprise') return false;
  if (layerId.startsWith('council-')) return true;
  return LOCKED_LAYERS.includes(layerId);
}

export function getRowLimit(isLatLon, tier) {
  const t = TIERS[tier] || TIERS.free_anonymous;
  return isLatLon ? t.maxLatLon : t.maxAddresses;
}

export function isPolicyPulseLocked(tier) {
  return tier === 'free' || tier === 'free_anonymous';
}
