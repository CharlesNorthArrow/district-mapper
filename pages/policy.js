import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import BillFeed from '../components/PolicyPulse/BillFeed';
import PolicyPDFDoc from '../components/PolicyPulse/PolicyPDF';
import { downloadPdfBlob } from '../lib/exportHelpers';

const BODIES = [
  { value: 'state-senate', label: 'State Senate' },
  { value: 'state-house',  label: 'State Assembly' },
  { value: 'congressional', label: 'U.S. House (Congressional)' },
];

const STATES = [
  { value: 'NY', label: 'New York' },
  // [EXPAND] Add states as STATE_CONFIG grows
];

function buildDistrictName(state, body, district) {
  const stateLabel = STATES.find(s => s.value === state)?.label || state;
  const bodyLabel  = BODIES.find(b => b.value === body)?.label || body;
  return `${stateLabel} ${bodyLabel} District ${district}`;
}

const fieldLabel = {
  fontSize: 12, fontWeight: 700, color: '#1c3557',
  marginBottom: 6, display: 'block', letterSpacing: '0.02em',
};
const fieldHint = { fontSize: 11, color: '#7a8fa6', marginTop: 3 };
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  fontFamily: "'Open Sans', sans-serif", fontSize: 13,
  padding: '9px 12px', border: '1.5px solid #dde3ea',
  borderRadius: 6, outline: 'none', color: '#1c3557', background: '#fff',
};
const errorStyle = { fontSize: 11, color: '#e63947', marginTop: 4 };

export default function PolicyPage() {
  const [mission,  setMission]  = useState('');
  const [state,    setState]    = useState('NY');
  const [body,     setBody]     = useState('state-senate');
  const [district, setDistrict] = useState('');
  const [errors,   setErrors]   = useState({});

  const [phase,          setPhase]          = useState('form'); // 'form' | 'scanning' | 'results'
  const [bills,          setBills]          = useState([]);
  const [error,          setError]          = useState('');
  const [scanStep,       setScanStep]       = useState(null);
  const [candidateCount, setCandidateCount] = useState(null);
  const [pdfLoading,     setPdfLoading]     = useState(false);
  const [districtLabel,  setDistrictLabel]  = useState('');

  function validate() {
    const nextErrors = {};
    if (mission.trim().length < 20) nextErrors.mission = 'Please describe your mission in at least a sentence.';
    if (!district.trim() || !/^\d+$/.test(district.trim())) nextErrors.district = 'Enter a valid district number.';
    if (Object.keys(nextErrors).length > 0) setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleScan() {
    if (!validate()) return;

    const missionText = mission.trim();
    const label = buildDistrictName(state, body, district.trim());
    setDistrictLabel(label);
    setPhase('scanning');
    setError('');
    setBills([]);
    setCandidateCount(null);

    try {
      setScanStep('keywords');
      const kwRes = await fetch('/api/pulse/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionText }),
      });
      if (!kwRes.ok) {
        const errData = await kwRes.json().catch(() => ({}));
        throw new Error(errData.error || `Keywords API error ${kwRes.status}`);
      }
      const { keywords } = await kwRes.json();
      if (!keywords?.length) throw new Error('No keywords returned from Claude');

      setScanStep('bills');
      const billsRes = await fetch(
        `/api/pulse/bills?state=${state}&keywords=${encodeURIComponent(keywords.join(','))}`
      );
      if (!billsRes.ok) {
        const errData = await billsRes.json().catch(() => ({}));
        throw new Error(errData.error || `Bills API error ${billsRes.status}`);
      }
      const { bills: allCandidates } = await billsRes.json();
      if (!allCandidates?.length) {
        setBills([]);
        setPhase('results');
        return;
      }
      const candidates = allCandidates.slice(0, 25);
      setCandidateCount(candidates.length);

      setScanStep('scoring');
      const scoreRes = await fetch('/api/pulse/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionText,
          bills: candidates,
          districtName: label,
          level: body,
          repNames: [],
        }),
      });
      if (!scoreRes.ok) {
        const errData = await scoreRes.json().catch(() => ({}));
        throw new Error(errData.error || `Score API error ${scoreRes.status}`);
      }
      const { bills: scored } = await scoreRes.json();
      setBills(scored || []);
      setPhase('results');
    } catch (err) {
      setError(`Error: ${err.message}`);
      setPhase('results');
    } finally {
      setScanStep(null);
    }
  }

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      const blob = await pdf(
        <PolicyPDFDoc
          bills={bills}
          districtName={districtLabel}
          mission={mission}
          savedAt={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        />
      ).toBlob();
      downloadPdfBlob(blob, `policy-pulse-${districtLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto',
      background: '#f2f8ee',
      fontFamily: "'Open Sans', sans-serif",
    }}>
      {/* Nav */}
      <div style={{
        background: '#1c3557', padding: '12px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/North_Arrow_icon.png" alt="North Arrow" style={{ height: 28 }} />
          <span style={{ color: '#fff', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16 }}>
            Policy Pulse
          </span>
        </div>
        <a href="/" style={{ color: '#a9dadc', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          ← District Mapper
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", color: '#1c3557', fontSize: 26, marginBottom: 8 }}>
            Scan state legislation for your district
          </h1>
          <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6 }}>
            Describe your mission, pick your district, and Policy Pulse will find and rank relevant
            active bills — scored for your specific policy area.
          </p>
        </div>

        {/* Form card */}
        {phase === 'form' && (
          <div style={{
            background: '#fff', borderRadius: 10,
            boxShadow: '0 2px 16px rgba(28,53,87,0.08)',
            padding: '28px 28px 24px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div>
              <label style={fieldLabel}>What is your organization's area of work or mission?</label>
              <textarea
                value={mission}
                onChange={ev => { setMission(ev.target.value); setErrors(v => ({ ...v, mission: '' })); }}
                placeholder="e.g. We provide free legal services to low-income immigrants facing deportation in New York City, with a focus on asylum seekers and victims of trafficking."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              />
              {errors.mission && <p style={errorStyle}>{errors.mission}</p>}
              <p style={fieldHint}>2–3 sentences works best. This shapes the keyword search and bill scoring.</p>
            </div>

            <div>
              <label style={fieldLabel}>State</label>
              <select value={state} onChange={ev => setState(ev.target.value)} style={inputStyle}>
                {STATES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <p style={fieldHint}>Additional states coming soon.</p>
            </div>

            <div>
              <label style={fieldLabel}>Legislative body</label>
              <select value={body} onChange={ev => setBody(ev.target.value)} style={inputStyle}>
                {BODIES.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={fieldLabel}>District number</label>
              <input
                type="text"
                inputMode="numeric"
                value={district}
                onChange={ev => { setDistrict(ev.target.value); setErrors(v => ({ ...v, district: '' })); }}
                placeholder="e.g. 12"
                style={{ ...inputStyle, maxWidth: 140 }}
              />
              {errors.district && <p style={errorStyle}>{errors.district}</p>}
            </div>

            <button
              onClick={handleScan}
              style={{
                background: '#e63947', color: '#fff',
                border: 'none', borderRadius: 6, padding: '11px 28px',
                fontFamily: "'Open Sans', sans-serif",
                fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start',
              }}
            >
              Scan Policies →
            </button>
          </div>
        )}

        {/* Scanning / results */}
        {(phase === 'scanning' || phase === 'results') && (
          <div>
            <div style={{
              background: '#fff', borderRadius: 8, border: '1px solid #e8edf2',
              padding: '10px 16px', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, color: '#555',
            }}>
              <div>
                <span style={{ fontWeight: 700, color: '#1c3557' }}>{districtLabel}</span>
                <span style={{ marginLeft: 10, color: '#7a8fa6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380, display: 'inline-block', verticalAlign: 'bottom' }}>
                  {mission}
                </span>
              </div>
              <button
                onClick={() => { setPhase('form'); setBills([]); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#e63947', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
              >
                Edit
              </button>
            </div>

            {phase === 'results' && bills.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDownloadPDF}
                  disabled={pdfLoading}
                  style={{
                    background: 'none', color: '#467c9d',
                    border: '1px solid #a9dadc', borderRadius: 4, padding: '5px 14px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {pdfLoading ? 'Generating…' : '⬇ Download PDF'}
                </button>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(28,53,87,0.08)', minHeight: 200 }}>
              <BillFeed
                bills={bills}
                loading={phase === 'scanning'}
                error={error}
                scanStep={scanStep}
                candidateCount={candidateCount}
                isExpanded={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
