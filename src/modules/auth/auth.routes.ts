import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import {
  getAuthUserById,
  loginUser,
  registerUser,
} from './auth.service.js';
import {
  LoginBody,
  loginBodySchema,
  RegisterBody,
  registerBodySchema,
} from './auth.schema.js';

const COOKIE_NAME = 'token';
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const authRoutes: FastifyPluginAsync = async (app) => {
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_MAX_AGE_SECONDS,
  };

  app.post<{ Body: RegisterBody }>(
    '/register',
    { schema: { body: registerBodySchema } },
    async (request, reply) => {
      try {
        const user = await registerUser(request.body);

        const token = await reply.jwtSign({
          sub: user.id,
          email: user.email,
        });

        reply.setCookie(COOKIE_NAME, token, cookieOptions);

        return reply.code(201).send({
          ok: true,
          message: 'User registered successfully',
          data: user,
        });
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.code(409).send({
            ok: false,
            message: 'Email already exists',
          });
        }

        throw error;
      }
    },
  );

  app.post<{ Body: LoginBody }>(
    '/login',
    { schema: { body: loginBodySchema } },
    async (request, reply) => {
      const user = await loginUser(request.body);

      if (!user) {
        return reply.code(401).send({
          ok: false,
          message: 'Invalid email or password',
        });
      }

      const token = await reply.jwtSign({
        sub: user.id,
        email: user.email,
      });

      reply.setCookie(COOKIE_NAME, token, cookieOptions);

      return {
        ok: true,
        message: 'Logged in successfully',
        data: user,
      };
    },
  );

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return {
      ok: true,
      message: 'Logged out successfully',
    };
  });

  app.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({
        ok: false,
        message: 'Unauthorized',
      });
    }

    const user = await getAuthUserById(request.user.sub);

    if (!user) {
      return reply.code(401).send({
        ok: false,
        message: 'Unauthorized',
      });
    }

    return {
      ok: true,
      message: 'Authenticated user fetched successfully',
      data: user,
    };
  });
};

export default authRoutes;
