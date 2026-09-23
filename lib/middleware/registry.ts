import type { FastifyInstance } from 'fastify';
import type { MiddlewareConfig } from './types'
import { shouldRun } from './match';

const registry: MiddlewareConfig[] = [];

export function defineMiddleware(config: MiddlewareConfig): MiddlewareConfig {
  registry.push(config);
  return config;
}

export async function registerMiddlewares(app: FastifyInstance): Promise<void> {
  if (registry.length === 0) return;

  app.addHook('onRequest', async (request, reply) => {
    for (const mw of registry) {
      if (!shouldRun(request.url, mw.paths, mw.exclude)) continue;

      try {
        await mw.handler(request, reply);
      } catch (err) {
        request.log.error({ err, middleware: mw.name }, 'middleware error');
        throw err;
      }

      if (reply.sent) return;
    }
  });

  app.log.info({ count: registry.length }, 'middlewares registered');
}