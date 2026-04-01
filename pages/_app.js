import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/next';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
