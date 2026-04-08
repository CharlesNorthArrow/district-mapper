// Main container. Opens as a right-side drawer over the map.
// Receives district context from AnalysisPanel.
// Orchestrates the full keyword → fetch → score pipeline.

import { useState, useEffect } from 'react';
import { getOrgContext } from '../../lib/orgContext';
import OrgContextForm from './OrgContextForm';
import BillFeed from './BillFeed';

export default function PolicyDrawer({ layerId, districtName, stateFips, onClose }) {
  const [orgContext, setOrgContextState] = useState('');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | form | scanning | results
  const [scanStep, setScanStep] = useState(null); // null | 'keywords' | 'bills' | 'scoring'
  const [candidateCount, setCandidateCount] = useState(null);

  useEffect(() => {
    const saved = getOrgContext();
    if (saved) {
      setOrgContextState(saved);
      setPhase('scanning');
      runScan(saved);
    } else {
      setPhase('form');
    }
  }, [layerId, districtName]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runScan(missionText) {
    setLoading(true);
    setError('');
    setBills([]);
    setCandidateCount(null);

    try {
      // Step 1: Extract keywords
      setScanStep('keywords');
      const kwRes = await fetch('/api/pulse/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionText }),
      });
      if (!kwRes.ok) {
        const e = await kwRes.json().catch(() => ({}));
        throw new Error(e.error || `Keywords API error ${kwRes.status}`);
      }
      const { keywords } = await kwRes.json();
      if (!keywords?.length) throw new Error('No keywords returned from Claude');

      // Step 2: Fetch candidate bills
      // [EXPAND] Replace 'NY' with dynamic state derived from stateFips
      setScanStep('bills');
      const billsRes = await fetch(
        `/api/pulse/bills?state=NY&keywords=${encodeURIComponent(keywords.join(','))}`
      );
      if (!billsRes.ok) {
        const e = await billsRes.json().catch(() => ({}));
        throw new Error(e.error || `Bills API error ${billsRes.status}`);
      }
      const { bills: candidates } = await billsRes.json();
      if (!candidates?.length) {
        setBills([]);
        setPhase('results');
        return;
      }
      setCandidateCount(candidates.length);

      // Step 3: Score bills
      // [EXPAND] Pass actual rep names from geo lookup for sponsor matching
      // For Phase 1, repNames is empty — sponsor badge won't show
      setScanStep('scoring');
      const scoreRes = await fetch('/api/pulse/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionText,
          bills: candidates,
          districtName,
          level: layerId,
          repNames: [], // [EXPAND] Fetch from /people.geo using a constituent point
        }),
      });
      if (!scoreRes.ok) {
        const e = await scoreRes.json().catch(() => ({}));
        throw new Error(e.error || `Score API error ${scoreRes.status}`);
      }
      const { bills: scored } = await scoreRes.json();

      setBills(scored || []);
      setPhase('results');
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setScanStep(null);
    }
  }

  function handleMissionSubmit(text) {
    setOrgContextState(text);
    setPhase('scanning');
    runScan(text);
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 420,
      height: '100%',
      background: '#fff',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.2s ease',
      fontFamily: "'Open Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#1c3557',
        color: '#fff',
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Policy Pulse</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {districtName || 'Legislative Scan'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
        >
          ×
        </button>
      </div>

      {/* Edit mission link (when context already exists) */}
      {phase !== 'form' && orgContext && (
        <div style={{
          padding: '8px 20px',
          background: '#f7f9fc',
          borderBottom: '1px solid #eee',
          fontSize: 12,
          color: '#555',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
            {orgContext}
          </span>
          <button
            onClick={() => setPhase('form')}
            style={{ background: 'none', border: 'none', color: '#e63947', fontSize: 11, cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
          >
            Edit
          </button>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {phase === 'form' && (
          <OrgContextForm onSubmit={handleMissionSubmit} />
        )}
        {(phase === 'scanning' || phase === 'results') && (
          <BillFeed
            bills={bills}
            loading={loading}
            error={error}
            scanStep={scanStep}
            candidateCount={candidateCount}
          />
        )}
      </div>
    </div>
  );
}
