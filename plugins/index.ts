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

export const registerPlugins = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(db, { url: eComConfig.env.DATABASE_URL });
    await fastify.register(fastifyJwt, { secret: eComConfig.env.JWT_SECRET });
    await fastify.register(fastifyBcrypt, { saltWorkFactor: 12 });
    await fastify.register(fastifyCookie, { secret: eComConfig.env.SECRET_KEY });
    await fastify.register(valkey);
    await fastify.register(bullMq);
    await fastify.register(rateLimiter);
  },
  { name: 'registerPlugins' }
);