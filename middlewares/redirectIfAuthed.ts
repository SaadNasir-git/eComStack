import { defineMiddleware } from '@/lib/middleware/registry';

export const redirectIfAuthed = defineMiddleware({
  name: 'redirectIfAuthed',
  paths: ['/auth/*', '/auth/**'],
  exclude: [
    '/auth/access-token',
    '/auth/logout',
    '/auth/verify-email',
  ],
  async handler(request, reply) {
    try {
      const fastify = request.server;
      const accessToken = request.headers.authorization;
      fastify.jwt.verify(accessToken!.replace(/^Bearer\s+/i, ''));
    } catch {
      return;
    }
    return reply.code(409).send({
      error: 'ALREADY_AUTHENTICATED',
      message: 'You are already logged in.',
    });
  },
});