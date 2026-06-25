// Shown when no Organization description is saved yet, or when the user clicks Edit.
// On submit: persists via saveOrgDescription (DB if logged in, localStorage otherwise)
// then calls onSubmit(value) to trigger a scan.

import { useState } from 'react';
import { saveOrgDescription } from '../../lib/orgContext';

export default function OrgContextForm({ onSubmit, initialValue = '', loggedIn = false }) {
  const [text, setText] = useState(initialValue);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (text.trim().length < 20) {
      setError('Please describe your organization in at least a sentence.');
      return;
    }
    setSaving(true);
    try {
      const { value } = await saveOrgDescription(text, { loggedIn });
      onSubmit(value);
    } catch (e) {
      setError(e.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 14, color: '#1c3557', marginBottom: 8, fontWeight: 600 }}>
        Organization description
      </p>
      <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 13, color: '#555', marginBottom: 16 }}>
        What your organization does and who it serves — used to find relevant legislation.
      </p>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError(''); }}
        placeholder="e.g. We provide free legal services to low-income immigrants facing deportation in New York City, with a focus on asylum seekers and victims of trafficking."
        rows={4}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: "'Open Sans', sans-serif",
          fontSize: 13,
          padding: '10px 12px',
          border: '1.5px solid #a9dadc',
          borderRadius: 6,
          resize: 'vertical',
          outline: 'none',
          color: '#1c3557',
        }}
      />
      {error && (
        <p style={{ color: '#e63947', fontSize: 12, marginTop: 4 }}>{error}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={saving}
        style={{
          marginTop: 12,
          background: '#e63947',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '9px 20px',
          fontFamily: "'Open Sans', sans-serif",
          fontSize: 13,
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          width: '100%',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving…' : 'Scan Policies →'}
      </button>
    </div>
  );
}
