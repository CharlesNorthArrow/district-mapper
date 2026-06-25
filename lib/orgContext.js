// Persists the Organization profile fields (description + constituency area).
// For signed-in users the DB is the source of truth.
// For anonymous users (and to carry over pre-existing data) we fall back to
// localStorage. Description uses the legacy key `dm_org_context`; constituency
// uses `dm_constituency_area`.

const LS_DESC_KEY = 'dm_org_context';
const LS_AREA_KEY = 'dm_constituency_area';

// Low-level localStorage helpers (anonymous-user fallback).
export function getOrgContext() {
  try { return localStorage.getItem(LS_DESC_KEY) || ''; } catch { return ''; }
}
export function setOrgContext(text) {
  try { localStorage.setItem(LS_DESC_KEY, text); } catch {}
}
export function clearOrgContext() {
  try { localStorage.removeItem(LS_DESC_KEY); } catch {}
}
export function getLocalConstituencyArea() {
  try { return localStorage.getItem(LS_AREA_KEY) || ''; } catch { return ''; }
}
export function setLocalConstituencyArea(text) {
  try { localStorage.setItem(LS_AREA_KEY, text); } catch {}
}

// High-level: picks DB > local > empty given an /api/auth/me response.
export function loadOrgProfile(me) {
  if (me?.loggedIn) {
    return {
      orgDescription: me.orgDescription || '',
      constituencyArea: me.constituencyArea || '',
      source: 'db',
    };
  }
  return {
    orgDescription: getOrgContext(),
    constituencyArea: getLocalConstituencyArea(),
    source: 'local',
  };
}

// High-level: writes both fields to DB if signed in, else to localStorage.
export async function saveOrgProfile({ orgDescription, constituencyArea }, { loggedIn }) {
  const desc = (orgDescription || '').trim();
  const area = (constituencyArea || '').trim();
  if (loggedIn) {
    const res = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgDescription: desc, constituencyArea: area }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `Save failed (${res.status})`);
    }
  } else {
    setOrgContext(desc);
    setLocalConstituencyArea(area);
  }
  return { ok: true, orgDescription: desc, constituencyArea: area };
}
