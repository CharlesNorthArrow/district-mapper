import Head from 'next/head';
import Link from 'next/link';

const LAST_UPDATED = 'May 8, 2026';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Data & Privacy Policy — District Mapper</title>
        <meta name="description" content="How District Mapper handles your constituent data" />
      </Head>

      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.header}>
            <Link href="/" style={styles.backLink}>← Back to District Mapper</Link>
            <div style={styles.logoRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/North_Arrow_icon.png" alt="North Arrow" style={styles.icon} />
              <span style={styles.productName}>District Mapper</span>
            </div>
            <h1 style={styles.title}>Data &amp; Privacy Policy</h1>
            <p style={styles.subtitle}>
              You're trusting us with your constituents' data. Here's exactly what we do with it —
              in plain language, not legal boilerplate.
            </p>
            <p style={styles.updated}>Last updated: {LAST_UPDATED}</p>
          </div>

          <Section title="The short version">
            <Callout>
              Your uploaded constituent data is stored securely, accessible only to your
              organization, and used for nothing other than the analysis you request. We will
              never sell it, share it, or use it to train AI models. Ever.
            </Callout>
          </Section>

          <Section title="What we store">
            <p style={styles.p}>We collect two categories of data:</p>
            <ul style={styles.ul}>
              <li style={styles.li}>
                <strong>Account information</strong> — your name, organization name, job title,
                state, and email address. Collected when you sign up. Used to manage your account
                and communicate with you about the service.
              </li>
              <li style={styles.li}>
                <strong>Uploaded datasets</strong> — the CSV or Excel files you upload, including
                coordinates, addresses, and any other columns in your file. Stored privately and
                accessible only to your organization. We do not inspect, analyze, or read your
                data except to provide the features you use.
              </li>
            </ul>
            <p style={styles.p}>
              We do not use cookies for tracking or advertising. We do not build profiles of your
              constituents. We do not track individual user behavior beyond what's needed for
              authentication and basic service operation.
            </p>
          </Section>

          <Section title="How your data is isolated">
            <p style={styles.p}>
              Every organization on District Mapper has a unique ID. Your uploaded dataset is
              stored at a private path keyed to that ID, and every data access requires
              authentication through your account. No other user — including us — can retrieve
              your data through the application.
            </p>
            <p style={styles.p}>
              This isolation is enforced at the database level, not just the interface. A request
              for your data must pass both Clerk authentication and a database check that confirms
              the requesting user belongs to your organization.
            </p>
          </Section>

          <Section title="Third-party services that touch your data">
            <p style={styles.p}>
              We use a small number of reputable third-party services to operate District Mapper.
              Here's exactly what each one sees:
            </p>

            <ServiceRow
              name="Clerk"
              url="https://clerk.com/legal/privacy"
              what="Handles authentication. Sees your email address, name, and login activity."
              constituent="No — Clerk never sees your uploaded constituent data."
            />
            <ServiceRow
              name="Vercel"
              url="https://vercel.com/legal/privacy-policy"
              what="Hosts the application and stores your uploaded datasets. All data is encrypted in transit (HTTPS) and at rest (AES-256)."
              constituent="Your dataset files are stored on Vercel's infrastructure, but are private and not publicly accessible."
            />
            <ServiceRow
              name="Stripe"
              url="https://stripe.com/privacy"
              what="Handles billing and payment processing. Sees your payment information when you subscribe."
              constituent="No — Stripe never sees your uploaded constituent data. We never see your card details."
            />
            <ServiceRow
              name="Mapbox"
              url="https://www.mapbox.com/legal/privacy"
              what="Used to convert street addresses into coordinates (geocoding) when you upload an address-based dataset. Addresses are sent to Mapbox's API through our server — your browser never contacts Mapbox directly."
              constituent="Street addresses are sent to Mapbox during the geocoding step. Per Mapbox's API terms, they do not retain or use geocoded address data submitted via the API."
            />
            <ServiceRow
              name="Anthropic (Claude)"
              url="https://www.anthropic.com/legal/privacy"
              what='Used only when you click "Plain Language Analysis" in the Analysis tab. Up to 15 sample rows of your dataset and aggregated district counts are sent to Anthropic\'s Claude API to generate a plain-language summary.'
              constituent='A small sample of your constituent data is sent to Anthropic when you explicitly use the AI Analysis feature. Anthropic\'s API usage policy prohibits using API-submitted data to train their models. We do not send your data to Anthropic for any other reason.'
            />
          </Section>

          <Section title="What we will never do">
            <ul style={styles.ul}>
              <li style={styles.li}>Sell, share, rent, or monetize your constituent data — to anyone, for any price.</li>
              <li style={styles.li}>Use your uploaded data to train AI models, whether our own or a third party's.</li>
              <li style={styles.li}>Access your constituent data for our own analysis, research, or product development.</li>
              <li style={styles.li}>Provide your data to government agencies, law enforcement, or other organizations unless legally compelled and after notifying you (if permitted).</li>
            </ul>
          </Section>

          <Section title="Data retention and deletion">
            <p style={styles.p}>
              Your uploaded dataset is kept until you delete it or close your account. You can
              delete your current dataset at any time from the main interface — click the trash
              icon next to any dataset in the left panel.
            </p>
            <p style={styles.p}>
              Deletion is permanent. When you delete a dataset, it is removed from our servers
              immediately and cannot be recovered.
            </p>
            <p style={styles.p}>
              To delete your account and all associated data (account info, datasets, billing
              records), contact{' '}
              <a href="mailto:charles@north-arrow.org" style={styles.link}>charles@north-arrow.org</a>.
              We will complete the deletion within 30 days.
            </p>
          </Section>

          <Section title="Security">
            <ul style={styles.ul}>
              <li style={styles.li}>All data is transmitted over HTTPS. Unencrypted connections are not accepted.</li>
              <li style={styles.li}>Uploaded datasets are stored with private access — they are not publicly accessible URLs.</li>
              <li style={styles.li}>Access to your data requires authentication and is scoped to your organization ID.</li>
              <li style={styles.li}>Infrastructure is hosted on Vercel, which maintains SOC 2 Type 2 certification.</li>
            </ul>
            <p style={styles.p}>
              If you discover a security vulnerability, please report it to{' '}
              <a href="mailto:charles@north-arrow.org" style={styles.link}>charles@north-arrow.org</a>{' '}
              rather than disclosing it publicly.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p style={styles.p}>
              If we make material changes to how we handle your data, we will notify you by email
              and update the "last updated" date above. Continued use of the service after a
              change constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section title="Contact">
            <p style={styles.p}>
              Questions about this policy or your data? Contact Charles at{' '}
              <a href="mailto:charles@north-arrow.org" style={styles.link}>charles@north-arrow.org</a>.
            </p>
            <p style={styles.p}>
              District Mapper is operated by{' '}
              <a href="https://north-arrow.org" style={styles.link} target="_blank" rel="noopener noreferrer">
                North Arrow
              </a>
              , a data visualization consultancy serving nonprofits.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Callout({ children }) {
  return (
    <div style={styles.callout}>
      <span style={styles.calloutIcon}>🔒</span>
      <p style={styles.calloutText}>{children}</p>
    </div>
  );
}

function ServiceRow({ name, url, what, constituent }) {
  return (
    <div style={styles.serviceRow}>
      <div style={styles.serviceName}>
        <a href={url} style={styles.link} target="_blank" rel="noopener noreferrer">{name}</a>
      </div>
      <div style={styles.serviceDetail}>
        <p style={{ ...styles.p, marginBottom: 4 }}>{what}</p>
        <p style={{ ...styles.p, color: '#467c9d', fontStyle: 'italic', marginBottom: 0 }}>
          Constituent data: {constituent}
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f2f8ee',
    padding: '40px 20px 80px',
    overflowY: 'auto',
  },
  container: {
    maxWidth: 680,
    margin: '0 auto',
  },
  header: {
    marginBottom: 40,
  },
  backLink: {
    fontSize: 13,
    color: '#467c9d',
    textDecoration: 'none',
    fontFamily: "'Open Sans', sans-serif",
    display: 'inline-block',
    marginBottom: 20,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  icon: {
    width: 28,
    height: 28,
    objectFit: 'contain',
  },
  productName: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    color: '#1c3557',
  },
  title: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 28,
    color: '#1c3557',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 1.6,
    color: '#467c9d',
    fontFamily: "'Open Sans', sans-serif",
    marginBottom: 8,
  },
  updated: {
    fontSize: 12,
    color: '#aab8c5',
    fontFamily: "'Open Sans', sans-serif",
  },
  section: {
    marginBottom: 36,
    paddingBottom: 36,
    borderBottom: '1px solid #e0eeef',
  },
  sectionTitle: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 18,
    color: '#1c3557',
    marginBottom: 14,
  },
  p: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#2d4a66',
    fontFamily: "'Open Sans', sans-serif",
    marginBottom: 12,
  },
  ul: {
    paddingLeft: 20,
    marginBottom: 12,
  },
  li: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#2d4a66',
    fontFamily: "'Open Sans', sans-serif",
    marginBottom: 8,
  },
  link: {
    color: '#467c9d',
    textDecoration: 'underline',
  },
  callout: {
    background: '#fff',
    border: '1.5px solid #a9dadc',
    borderRadius: 10,
    padding: '16px 20px',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  calloutIcon: {
    fontSize: 18,
    flexShrink: 0,
    marginTop: 1,
  },
  calloutText: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#1c3557',
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 600,
    margin: 0,
  },
  serviceRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
    padding: '14px 16px',
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #e8f0f2',
  },
  serviceName: {
    minWidth: 90,
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "'Open Sans', sans-serif",
    color: '#1c3557',
    paddingTop: 2,
  },
  serviceDetail: {
    flex: 1,
  },
};
