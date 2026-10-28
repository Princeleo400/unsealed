/**
 * The site's public address. SITE_URL wins (set it once you have a domain). On Vercel
 * without it, production uses the project's own address (e.g. unsealed.vercel.app) and
 * preview deployments use their branch address, so links and share previews work there
 * too. Locally: http://localhost:3003.
 */
export function siteUrl(): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const vercelHost =
    process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);
  if (vercelHost) return `https://${vercelHost}`;
  return 'http://localhost:3003';
}
