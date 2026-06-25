// Persists "Organization description" — shown in the Policy Pulse drawer and
// on the Account page. For signed-in users the DB is the source of truth.
// For anonymous users (and to carry over data from before this change) we
// fall back to localStorage under the legacy key `dm_org_context`.

const LS_KEY = 'dm_org_context';

// Low-level localStorage helpers (anonymous-user fallback).
export function getOrgContext() {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}

export function setOrgContext(text) {
  try { localStorage.setItem(LS_KEY, text); } catch {}
}

export function clearOrgContext() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// High-level: picks DB > local > empty given an /api/auth/me response.
export function loadOrgDescription(me) {
  if (me?.loggedIn && me.orgDescription) {
    return { value: me.orgDescription, source: 'db' };
  }
  const local = getOrgContext();
  if (local) return { value: local, source: 'local' };
  return { value: '', source: 'none' };
}

// High-level: writes to DB if signed in, else localStorage.
export async function saveOrgDescription(text, { loggedIn }) {
  const value = (text || '').trim();
  if (loggedIn) {
    const res = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgDescription: value }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `Save failed (${res.status})`);
    }
  } else {
    setOrgContext(value);
  }
  return { ok: true, value };
}
