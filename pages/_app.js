import { ClerkProvider } from '@clerk/nextjs';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/next';

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
      <Analytics />
    </ClerkProvider>
  );
}
