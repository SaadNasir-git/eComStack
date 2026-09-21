import Fastify from 'fastify';
import { eComConfig } from '@/ecom.config';
import { register } from './registration';

const start = async () => {
  const fastify = Fastify({
    logger: true,
  });

  fastify.get('/health', async () => ({ status: 'ok' }));

  try {
    await fastify.register((instance) => register(instance), { prefix: eComConfig.env.PREFIX });
    await fastify.listen({
      port: eComConfig.env.PORT,
      host: '0.0.0.0',
    });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();