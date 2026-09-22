import fp from 'fastify-plugin';
import fastifyValkey from '@fastify/valkey-glide';
import { eComConfig } from '@/ecom.config';

export default fp(
  async (fastify) => {
    await fastify.register(fastifyValkey, {
      addresses: [{
        host: eComConfig.env.VALKEY.HOST,
        port: eComConfig.env.VALKEY.PORT,
      }],
    });
  },
  { name: 'valkey' }
);