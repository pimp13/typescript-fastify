export type SsoConfig = {
  issuerBaseUrl: string;
  apiPrefix: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  requirePkce: boolean;
  frontendOrigins: string[];
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function loadSsoConfig(): SsoConfig {
  const frontendOrigins = (process.env.SSO_FRONTEND_ORIGINS ?? process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return {
    issuerBaseUrl: (process.env.SSO_ISSUER_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, ''),
    apiPrefix: (process.env.SSO_API_PREFIX ?? '/api').replace(/\/$/, '') || '',
    clientId: required('SSO_CLIENT_ID'),
    clientSecret: required('SSO_CLIENT_SECRET'),
    redirectUri: required('SSO_REDIRECT_URI'),
    scopes: process.env.SSO_SCOPES?.trim() || 'openid profile email',
    requirePkce: boolEnv('SSO_REQUIRE_PKCE', true),
    frontendOrigins,
  };
}

export function ssoEndpoint(cfg: SsoConfig, path: string): string {
  return `${cfg.issuerBaseUrl}${cfg.apiPrefix}${path}`;
}
