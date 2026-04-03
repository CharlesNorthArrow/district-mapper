// Priority: dm_tier localStorage > legacy dm_unlimited > default free
export function getTier() {
  try {
    const stored = localStorage.getItem('dm_tier');
    if (stored === 'pro' || stored === 'enterprise') return stored;
    if (localStorage.getItem('dm_unlimited') === 'true') return 'enterprise';
  } catch {}
  return 'free';
}

export function setTier(tier) {
  try {
    localStorage.setItem('dm_tier', tier);
    if (tier === 'enterprise') localStorage.setItem('dm_unlimited', 'true');
  } catch {}
}
