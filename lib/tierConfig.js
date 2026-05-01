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

export function isLayerLocked(layerId, tier) {
  return false;
}

export function getRowLimit(isLatLon, tier) {
  const t = TIERS[tier] || TIERS.free_anonymous;
  return isLatLon ? t.maxLatLon : t.maxAddresses;
}

export function isPolicyPulseLocked(tier) {
  return tier === 'free' || tier === 'free_anonymous';
}
