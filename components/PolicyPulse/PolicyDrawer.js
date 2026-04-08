import { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { getOrgContext } from '../../lib/orgContext';
import OrgContextForm from './OrgContextForm';
import BillFeed from './BillFeed';
import PolicyPDFDoc from './PolicyPDF';

export default function PolicyDrawer({ layerId, districtName, stateFips, onClose, onSaveScan }) {
  const [orgContext, setOrgContextState] = useState('');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle');
  const [scanStep, setScanStep] = useState(null);
  const [candidateCount, setCandidateCount] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

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

      setScanStep('bills');
      const billsRes = await fetch(
        `/api/pulse/bills?state=NY&keywords=${encodeURIComponent(keywords.join(','))}`
      );
      if (!billsRes.ok) {
        const e = await billsRes.json().catch(() => ({}));
        throw new Error(e.error || `Bills API error ${billsRes.status}`);
      }
      const { bills: allCandidates } = await billsRes.json();
      if (!allCandidates?.length) {
        setBills([]);
        setPhase('results');
        return;
      }
      // Cap at 25 — score.js returns at most 25 anyway, and candidates are
      // already ranked by keyword hit count so the best ones come first.
      const candidates = allCandidates.slice(0, 25);
      setCandidateCount(candidates.length);

      setScanStep('scoring');
      const scoreRes = await fetch('/api/pulse/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionText,
          bills: candidates,
          districtName,
          level: layerId,
          repNames: [],
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

  function handleSave() {
    onSaveScan?.({ districtName, layerId, mission: orgContext, bills });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  async function handleDownloadPDF(billsToExport, label) {
    setPdfLoading(true);
    try {
      const blob = await pdf(
        <PolicyPDFDoc
          bills={billsToExport}
          districtName={label || districtName}
          mission={orgContext}
          savedAt={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `policy-pulse-${(label || districtName).replace(/\s+/g, '-').toLowerCase()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  const drawerStyle = isExpanded
    ? {
        position: 'fixed',
        top: '5vh', left: '10vw',
        width: '80vw', height: '90vh',
        background: '#fff',
        boxShadow: '0 8px 48px rgba(0,0,0,0.28)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        borderRadius: 10,
        fontFamily: "'Open Sans', sans-serif",
      }
    : {
        position: 'absolute',
        top: 0, right: 0,
        width: 630, height: '100%',
        background: '#fff',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 30,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.2s ease',
        fontFamily: "'Open Sans', sans-serif",
      };

  return (
    <>
      {/* Dim backdrop when expanded */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 49,
          }}
        />
      )}

      <div style={drawerStyle}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1c3557', color: '#fff', flexShrink: 0,
          borderRadius: isExpanded ? '10px 10px 0 0' : 0,
        }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Policy Pulse</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{districtName || 'Legislative Scan'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setIsExpanded(e => !e)}
              title={isExpanded ? 'Collapse' : 'Expand'}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', opacity: 0.8, lineHeight: 1 }}
            >
              {isExpanded ? '⤡' : '⤢'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Mission context bar */}
        {phase !== 'form' && orgContext && (
          <div style={{
            padding: '8px 20px', background: '#f7f9fc',
            borderBottom: '1px solid #eee', fontSize: 12, color: '#555',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
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

        {/* Results action bar */}
        {phase === 'results' && bills.length > 0 && (
          <div style={{
            padding: '8px 16px', background: '#fff', borderBottom: '1px solid #eee',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <button
              onClick={handleSave}
              style={{
                background: savedFlash ? '#1c3557' : 'none',
                color: savedFlash ? '#fff' : '#1c3557',
                border: '1px solid #1c3557',
                borderRadius: 4, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {savedFlash ? 'Saved ✓' : '💾 Save to Panel'}
            </button>
            <button
              onClick={() => handleDownloadPDF(bills)}
              disabled={pdfLoading}
              style={{
                background: 'none', color: '#467c9d',
                border: '1px solid #a9dadc',
                borderRadius: 4, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {pdfLoading ? 'Generating…' : '⬇ Download PDF'}
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {phase === 'form' && <OrgContextForm onSubmit={handleMissionSubmit} />}
          {(phase === 'scanning' || phase === 'results') && (
            <BillFeed
              bills={bills}
              loading={loading}
              error={error}
              scanStep={scanStep}
              candidateCount={candidateCount}
              isExpanded={isExpanded}
            />
          )}
        </div>
      </div>
    </>
  );
}
