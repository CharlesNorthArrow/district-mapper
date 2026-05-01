import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/policy',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding',
  '/onboarding-check',
  '/api/boundaries(.*)',
  '/api/geocode(.*)',
  '/api/city-councils(.*)',
  '/api/district-lookup(.*)',
  '/api/officials(.*)',
  '/api/unlock(.*)',
  '/api/auth/me',
  '/api/pulse/(.*)',
  '/api/analyze(.*)',
  '/api/request-geography(.*)',
  '/api/request-upgrade(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
