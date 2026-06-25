// Custom resolver — appends .js to bare relative imports that lack an extension,
// matching Next.js / Webpack behavior. Used only by scripts/verify-pulse-bills.mjs.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z0-9]+$/i.test(specifier)) {
    try {
      const candidate = new URL(specifier + '.js', context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return next(specifier + '.js', context);
      }
    } catch {}
  }
  return next(specifier, context);
}
