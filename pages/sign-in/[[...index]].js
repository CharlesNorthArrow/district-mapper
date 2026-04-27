import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f9fc',
    }}>
      <SignIn fallbackRedirectUrl="/onboarding-check" signInFallbackRedirectUrl="/onboarding-check" />
    </div>
  );
}
