import fp from 'fastify-plugin';
import { RateLimiterValkeyGlide } from 'rate-limiter-flexible';

export default fp(
  async (fastify) => {
    const limiter = new RateLimiterValkeyGlide({
      storeClient: fastify.valkey,
      points: 100,
      duration: 60,
    });

    fastify.decorate('rateLimiter', limiter);

    fastify.addHook('onRequest', async (req, reply) => {
      try {
        await limiter.consume(req.ip);
      } catch (rejRes) {
        if (rejRes instanceof Error) {
          req.log.error({ err: rejRes }, 'rate limiter error');
          return;
        }
        const secs = Math.round((rejRes as any).msBeforeNext / 1000) || 1;
        reply.header('Retry-After', String(secs));
        reply.code(429).send({ error: 'TOO_MANY_REQUESTS' });
      }
    });
  },
  { name: 'rateLimiter', dependencies: ['valkey'] }
);