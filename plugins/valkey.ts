import fp from 'fastify-plugin';
import fastifyValkey from '@fastify/valkey-glide';
import type { FastifyPluginAsync } from 'fastify';

interface valkeyPluginOptions {
  host: string;
  port: number;
}

const valkeyPlugin: FastifyPluginAsync<valkeyPluginOptions> = async (fastify, options) => {
  await fastify.register(fastifyValkey, {
    addresses: [{
      host: options.host,
      port: options.port,
    }],
  });
}

export default fp(valkeyPlugin, { name: 'valkey' });