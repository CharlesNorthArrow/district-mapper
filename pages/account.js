import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AccountPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace('/'); return; }

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.orgId) { router.replace('/onboarding'); return; }
        setProfile(data);
      })
      .catch(() => router.replace('/'));
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleManageBilling() {
    setPortalLoading(true);
    setPortalError('');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location = data.url;
      } else {
        setPortalError(data.error || 'Something went wrong.');
        setPortalLoading(false);
      }
    } catch {
      setPortalError('Something went wrong — please try again.');
      setPortalLoading(false);
    }
  }

  if (!isLoaded || !profile) {
    return (
      <div style={loadingWrap}>
        <p style={loadingText}>Loading…</p>
      </div>
    );
  }

  const isPro = profile.tier === 'pro' || profile.tier === 'enterprise';
  const hasStripeSubscription = !!profile.subscriptionStatus;
  const isProViaCode = isPro && !hasStripeSubscription;
  const renewalDate = profile.currentPeriodEnd
    ? new Date(profile.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <>
      <Head>
        <title>Account — District Mapper</title>
      </Head>
      <div style={page}>
        <div style={card}>
          <div style={header}>
            <a href="/" style={backLink}>← Back to District Mapper</a>
            <h1 style={title}>Account</h1>
          </div>

          <div style={section}>
            <div style={sectionLabel}>Current plan</div>
            <div style={planRow}>
              <span style={{
                ...planBadge,
                background: profile.tier === 'enterprise' ? '#1c3557'
                           : isPro ? '#e63947'
                           : '#dde3ea',
                color: isPro ? '#fff' : '#555',
              }}>
                {profile.tier === 'enterprise' ? 'Enterprise'
                 : isPro ? 'Pro'
                 : 'Free'}
              </span>
              {profile.orgName && <span style={orgName}>{profile.orgName}</span>}
            </div>
          </div>

          {isPro && (
            <div style={section}>
              <div style={sectionLabel}>Billing</div>

              {isProViaCode ? (
                <p style={infoText}>Pro access granted via invite code — no billing on file.</p>
              ) : (
                <>
                  {profile.subscriptionStatus && (
                    <p style={infoText}>
                      Status: <strong style={{ textTransform: 'capitalize' }}>{profile.subscriptionStatus.replace('_', ' ')}</strong>
                    </p>
                  )}
                  {renewalDate && (
                    <p style={infoText}>
                      {profile.cancelAtPeriodEnd
                        ? <>Access ends <strong>{renewalDate}</strong></>
                        : <>Renews <strong>{renewalDate}</strong></>}
                    </p>
                  )}
                  {profile.cancelAtPeriodEnd && (
                    <p style={warningText}>Your subscription has been canceled and will not renew.</p>
                  )}
                  <button
                    style={manageBillingBtn}
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                  >
                    {portalLoading ? 'Opening billing portal…' : 'Manage billing'}
                  </button>
                  {portalError && <p style={errorText}>{portalError}</p>}
                  <p style={portalHint}>Update your card, switch plans, view invoices, or cancel — all in the Stripe billing portal.</p>
                </>
              )}
            </div>
          )}

          {!isPro && (
            <div style={section}>
              <div style={sectionLabel}>Upgrade</div>
              <p style={infoText}>You're on the free plan. Upgrade to Pro for all layers, AI analysis, and PDF export.</p>
              <a href="/" style={upgradeBtn}>View Pro plans →</a>
            </div>
          )}

          <div style={section}>
            <div style={sectionLabel}>Account</div>
            <p style={infoText}>{profile.email}</p>
          </div>
        </div>
      </div>
    </>
  );
}

const page = { minHeight: '100vh', background: '#f2f8ee', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', fontFamily: "'Open Sans', sans-serif" };
const card = { background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.1)', width: '100%', maxWidth: 480, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 0 };
const header = { marginBottom: 24 };
const backLink = { fontSize: 12, color: '#467c9d', textDecoration: 'none', display: 'inline-block', marginBottom: 16 };
const title = { margin: 0, fontSize: 22, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#1c3557' };
const section = { borderTop: '1px solid #eef0f3', paddingTop: 20, paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 };
const sectionLabel = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7a8fa6' };
const planRow = { display: 'flex', alignItems: 'center', gap: 10 };
const planBadge = { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em' };
const orgName = { fontSize: 14, color: '#374151', fontWeight: 600 };
const infoText = { fontSize: 14, color: '#374151', margin: 0 };
const warningText = { fontSize: 13, color: '#b45309', margin: 0, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, padding: '8px 12px' };
const manageBillingBtn = { padding: '9px 18px', background: '#1c3557', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Open Sans', sans-serif", alignSelf: 'flex-start' };
const portalHint = { fontSize: 12, color: '#7a8fa6', margin: 0 };
const errorText = { fontSize: 12, color: '#e63947', margin: 0 };
const upgradeBtn = { padding: '9px 18px', background: '#e63947', color: '#fff', borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start', fontFamily: "'Open Sans', sans-serif" };
const loadingWrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const loadingText = { fontFamily: "'Open Sans', sans-serif", color: '#7a8fa6', fontSize: 14 };
