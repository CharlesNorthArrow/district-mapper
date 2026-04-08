// Persists org mission text across sessions via localStorage

export function getOrgContext() {
  try { return localStorage.getItem('dm_org_context') || ''; } catch { return ''; }
}

export function setOrgContext(text) {
  try { localStorage.setItem('dm_org_context', text); } catch {}
}

export function clearOrgContext() {
  try { localStorage.removeItem('dm_org_context'); } catch {}
}
