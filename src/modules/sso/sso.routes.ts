import { FastifyPluginAsync } from 'fastify';
import { requireLogin } from '../../hooks/requireLogin.js';
import { prisma } from '../../lib/prisma.js';
import { loadSsoConfig } from './sso.config.js';
import { SsoClient, SsoHttpError } from './sso.client.js';
import { createPkcePair, randomUrlSafe } from './sso.pkce.js';
import { upsertLocalUserFromSso } from './sso.service.js';
import type { SsoOAuthState } from './sso.types.js';

const AUTH_COOKIE = '__token_auth__';
const SSO_STATE_COOKIE = '__sso_oauth__';
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const ssoRoutes: FastifyPluginAsync = async (app) => {
  const cfg = loadSsoConfig();
  const client = new SsoClient(cfg);

  const authCookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_MAX_AGE_SECONDS,
  };

  const stateCookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60,
  };

  app.get('/discovery', async (_request, reply) => {
    try {
      const doc = await client.discovery();
      return {
        ok: true,
        message: 'SSO discovery fetched',
        data: doc,
      };
    } catch (error) {
      return sendSsoError(reply, error);
    }
  });

  app.get<{ Querystring: { return_to?: string } }>(
    '/login',
    async (request, reply) => {
      const state = randomUrlSafe(24);
      const pkce = cfg.requirePkce ? createPkcePair() : undefined;

      const oauthState: SsoOAuthState = {
        state,
        codeVerifier: pkce?.verifier,
        returnTo: sanitizeReturnTo(request.query.return_to),
      };

      reply.setCookie(SSO_STATE_COOKIE, JSON.stringify(oauthState), stateCookieOptions);

      const authorizeUrl = client.buildAuthorizeUrl({
        state,
        codeChallenge: pkce?.challenge,
        codeChallengeMethod: pkce?.method,
      });

      return reply.redirect(authorizeUrl);
    },
  );

  app.get<{
    Querystring: { code?: string; state?: string; error?: string; error_description?: string };
  }>('/callback', async (request, reply) => {
    if (request.query.error) {
      return reply.code(400).send({
        ok: false,
        message: request.query.error_description || request.query.error,
      });
    }

    const code = request.query.code?.trim();
    const state = request.query.state?.trim();
    if (!code || !state) {
      return reply.code(400).send({
        ok: false,
        message: 'Missing authorization code or state',
      });
    }

    const rawState = request.cookies[SSO_STATE_COOKIE];
    reply.clearCookie(SSO_STATE_COOKIE, { path: '/' });

    let oauthState: SsoOAuthState | null = null;
    try {
      oauthState = rawState ? (JSON.parse(rawState) as SsoOAuthState) : null;
    } catch {
      oauthState = null;
    }

    if (!oauthState?.state || oauthState.state !== state) {
      return reply.code(400).send({
        ok: false,
        message: 'Invalid OAuth state',
      });
    }

    if (cfg.requirePkce && !oauthState.codeVerifier) {
      return reply.code(400).send({
        ok: false,
        message: 'Missing PKCE verifier',
      });
    }

    try {
      const token = await client.exchangeCode({
        code,
        codeVerifier: oauthState.codeVerifier,
      });
      const info = await client.userInfo(token.access_token);
      const user = await upsertLocalUserFromSso(info);

      if (!user.isActive) {
        return reply.code(403).send({
          ok: false,
          message: 'Forbidden: your account is not active',
        });
      }

      const localToken = await reply.jwtSign({
        sub: user.id,
        email: user.email,
      });
      reply.setCookie(AUTH_COOKIE, localToken, authCookieOptions);

      if (oauthState.returnTo) {
        return reply.redirect(oauthState.returnTo);
      }

      return {
        ok: true,
        message: 'SSO login successful',
        data: {
          user,
          sso: {
            accessToken: token.access_token,
            tokenType: token.token_type,
            expiresIn: token.expires_in,
            scope: token.scope,
            profile: info,
          },
        },
      };
    } catch (error) {
      return sendSsoError(reply, error);
    }
  });

  app.get(
    '/me',
    { preHandler: [requireLogin] },
    async (request, reply) => {
      const user = await upsertLookup(request.user.sub);
      if (!user) {
        return reply.code(401).send({
          ok: false,
          message: 'Unauthorized',
        });
      }

      return {
        ok: true,
        message: 'Authenticated SSO user fetched successfully',
        data: user,
      };
    },
  );

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(AUTH_COOKIE, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    reply.clearCookie(SSO_STATE_COOKIE, { path: '/' });

    return {
      ok: true,
      message: 'Logged out successfully',
    };
  });
};

async function upsertLookup(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      meta: true,
    },
  });
}

function sanitizeReturnTo(value?: string): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

function sendSsoError(reply: import('fastify').FastifyReply, error: unknown) {
  if (error instanceof SsoHttpError) {
    return reply.code(error.status >= 400 && error.status < 600 ? error.status : 502).send({
      ok: false,
      message: error.message,
      details: error.body,
    });
  }

  throw error;
}

export default ssoRoutes;
