// After sign-in, check if org profile exists.
// If yes → redirect to /    If no → redirect to /onboarding
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OnboardingCheck() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.orgId) {
          router.replace('/');
        } else {
          router.replace('/onboarding');
        }
      })
      .catch(() => router.replace('/'));
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Open Sans', sans-serif",
      color: '#7a8fa6',
      fontSize: 14,
    }}>
      Setting up your account…
    </div>
  );
}
