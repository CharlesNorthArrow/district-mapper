import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import AddressLookup from './mobile/AddressLookup';

const BATCH_COLORS = ['#e63947', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

export default function MobileLanding({ onContinue }) {
  const { isLoaded, isSignedIn } = useUser();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    setLoadingPreview(true);
    fetch('/api/auth/load-dataset')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const dataset = body?.dataset;
        if (!dataset) { setLoadingPreview(false); return; }

        const batches =
          dataset.version === 2 && Array.isArray(dataset.batches)
            ? dataset.batches
            : [dataset];

        const pointBatches = batches
          .filter((b) => b.points?.length)
          .map((b, i) => ({
            label: b.title || `Dataset ${i + 1}`,
            color: BATCH_COLORS[i % BATCH_COLORS.length],
            pts: b.points.slice(0, 5000).map((p) => [
              Math.round(p.lat * 10000) / 10000,
              Math.round(p.lng * 10000) / 10000,
            ]),
          }));

        if (!pointBatches.length) { setLoadingPreview(false); return; }

        const allPts = pointBatches.flatMap((b) => b.pts);
        const avgLat = allPts.reduce((s, [lat]) => s + lat, 0) / allPts.length;
        const avgLng = allPts.reduce((s, [, lng]) => s + lng, 0) / allPts.length;

        const state = { center: [avgLng, avgLat], zoom: 5, layers: [], choro: null, pointBatches };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
        setPreviewUrl(`/preview?s=${encoded}`);
        setLoadingPreview(false);
      })
      .catch(() => setLoadingPreview(false));
  }, [isLoaded, isSignedIn]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/North_Arrow_icon.png" alt="North Arrow" style={styles.icon} />
          <span style={styles.productName}>District Mapper</span>
        </div>

        <h1 style={styles.headline}>Built for desktop</h1>
        <p style={styles.body}>
          District Mapper is a full GIS analysis tool — upload data, map district boundaries,
          and export reports. For the complete experience, open it on your computer.
        </p>

        {isSignedIn && (
          <div style={styles.previewSection}>
            {loadingPreview ? (
              <p style={styles.loadingText}>Loading your last map…</p>
            ) : previewUrl ? (
              <a href={previewUrl} style={styles.previewBtn}>
                View your last map →
              </a>
            ) : null}
          </div>
        )}

        <div style={styles.divider} />

        <AddressLookup />

        <button style={styles.continueBtn} onClick={onContinue}>
          Continue anyway
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f2f8ee',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '32px 16px 48px',
    overflowY: 'auto',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '28px 24px 24px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 4px 20px rgba(28,53,87,0.1)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  icon: {
    width: 32,
    height: 32,
    objectFit: 'contain',
  },
  productName: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    color: '#1c3557',
  },
  headline: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 22,
    color: '#1c3557',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.55,
    color: '#467c9d',
    fontFamily: "'Open Sans', sans-serif",
    marginBottom: 0,
  },
  previewSection: {
    marginTop: 18,
  },
  loadingText: {
    fontSize: 13,
    color: '#7a8fa6',
    fontFamily: "'Open Sans', sans-serif",
  },
  previewBtn: {
    display: 'inline-block',
    background: '#1c3557',
    color: '#fff',
    borderRadius: 8,
    padding: '11px 20px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Open Sans', sans-serif",
    textDecoration: 'none',
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  divider: {
    height: 1,
    background: '#e8f0f2',
    margin: '24px 0 0',
  },
  continueBtn: {
    marginTop: 24,
    background: 'none',
    border: 'none',
    color: '#7a8fa6',
    fontSize: 13,
    fontFamily: "'Open Sans', sans-serif",
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    display: 'block',
    width: '100%',
    textAlign: 'center',
  },
};
