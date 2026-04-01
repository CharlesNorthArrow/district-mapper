import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/North_Arrow_icon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/North_Arrow_icon.png" />

        {/* Primary meta */}
        <meta name="application-name" content="District Mapper" />
        <meta name="description" content="Upload constituent data, overlay US legislative and local boundary layers, and analyze how your program participants are distributed across districts. Export enriched CSVs and PDF reports." />
        <meta name="author" content="North Arrow" />
        <meta name="theme-color" content="#1c3557" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://districts.north-arrow.org" />
        <meta property="og:site_name" content="District Mapper — North Arrow" />
        <meta property="og:title" content="District Mapper" />
        <meta property="og:description" content="Map your constituents to legislative districts. Upload program data, enable boundary layers, and export enriched analysis — built for nonprofits." />
        <meta property="og:image" content="https://districts.north-arrow.org/North_Arrow_logo.png" />

        {/* Twitter / X card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="District Mapper — North Arrow" />
        <meta name="twitter:description" content="Map your constituents to legislative districts. Upload program data, enable boundary layers, and export enriched analysis." />
        <meta name="twitter:image" content="https://districts.north-arrow.org/North_Arrow_logo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
