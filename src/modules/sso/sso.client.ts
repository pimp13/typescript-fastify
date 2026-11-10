import type { SsoConfig } from './sso.config.js';
import { ssoEndpoint } from './sso.config.js';
import type {
  SsoDiscoveryDocument,
  SsoIntrospectResponse,
  SsoTokenResponse,
  SsoUserInfo,
} from './sso.types.js';

export class SsoHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'SsoHttpError';
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class SsoClient {
  constructor(private readonly cfg: SsoConfig) {}

  buildAuthorizeUrl(input: {
    state: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): string {
    const url = new URL(ssoEndpoint(this.cfg, '/sso/authorize'));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.cfg.clientId);
    url.searchParams.set('redirect_uri', this.cfg.redirectUri);
    url.searchParams.set('scope', this.cfg.scopes);
    url.searchParams.set('state', input.state);
    if (input.codeChallenge) {
      url.searchParams.set('code_challenge', input.codeChallenge);
      url.searchParams.set('code_challenge_method', input.codeChallengeMethod ?? 'S256');
    }
    return url.toString();
  }

  async discovery(): Promise<SsoDiscoveryDocument> {
    return this.getJson<SsoDiscoveryDocument>('/sso/.well-known/openid-configuration');
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier?: string;
  }): Promise<SsoTokenResponse> {
    return this.postJson<SsoTokenResponse>('/sso/token', {
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: this.cfg.redirectUri,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      ...(input.codeVerifier ? { code_verifier: input.codeVerifier } : {}),
    });
  }

  async userInfo(accessToken: string): Promise<SsoUserInfo> {
    const res = await fetch(ssoEndpoint(this.cfg, '/sso/userinfo'), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    const body = await parseJson(res);
    if (!res.ok) {
      throw new SsoHttpError('SSO userinfo failed', res.status, body);
    }
    return body as SsoUserInfo;
  }

  async introspect(accessToken: string): Promise<SsoIntrospectResponse> {
    return this.postJson<SsoIntrospectResponse>('/sso/introspect', {
      token: accessToken,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
    });
  }

  private async getJson<T>(path: string): Promise<T> {
    const res = await fetch(ssoEndpoint(this.cfg, path), {
      headers: { Accept: 'application/json' },
    });
    const body = await parseJson(res);
    if (!res.ok) {
      throw new SsoHttpError(`SSO GET ${path} failed`, res.status, body);
    }
    return body as T;
  }

  private async postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(ssoEndpoint(this.cfg, path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      throw new SsoHttpError(`SSO POST ${path} failed`, res.status, body);
    }
    return body as T;
  }
}
