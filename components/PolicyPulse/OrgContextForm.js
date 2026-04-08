// Shown when no org context is saved yet.
// On submit: saves to localStorage + calls onSubmit(missionText)

import { useState } from 'react';
import { setOrgContext } from '../../lib/orgContext';

export default function OrgContextForm({ onSubmit }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (text.trim().length < 20) {
      setError('Please describe your mission in at least a sentence.');
      return;
    }
    setOrgContext(text.trim());
    onSubmit(text.trim());
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 14, color: '#1c3557', marginBottom: 8, fontWeight: 600 }}>
        Tell us about your organization
      </p>
      <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 13, color: '#555', marginBottom: 16 }}>
        Describe your mission in 2–3 sentences. This helps us find legislation relevant to your work.
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
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Scan Policy →
      </button>
    </div>
  );
}
