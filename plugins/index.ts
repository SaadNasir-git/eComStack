import fp from 'fastify-plugin';
import db from './db';
import fastifyJwt from '@fastify/jwt';
import fastifyBcrypt from 'fastify-bcrypt';
import fastifyCookie from '@fastify/cookie';
import bullMq from './bullMq';
import rateLimiter from './rateLimiter';
import valkey from './valkey';
import { eComConfig } from '@/ecom.config';
import type { FastifyInstance } from 'fastify';
import { fastifyPlugin as InngestPlugin } from 'inngest/fastify'
import { inngest } from '@/inngest/client'
import { functions } from '@/inngest/functions';

export const registerPlugins = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(db, { url: eComConfig.env.DATABASE_URL });
    await fastify.register(fastifyJwt, { secret: eComConfig.env.JWT_SECRET });
    await fastify.register(fastifyBcrypt, { saltWorkFactor: 12 });
    await fastify.register(fastifyCookie, { secret: eComConfig.env.SECRET_KEY });
    await fastify.register(valkey, { host: eComConfig.env.VALKEY.HOST, port: eComConfig.env.VALKEY.PORT });
    await fastify.register(bullMq);
    await fastify.register(rateLimiter);
    await fastify.register(InngestPlugin, {
      client: inngest,
      functions: functions(fastify)
    })
  },
  { name: 'registerPlugins' }
);