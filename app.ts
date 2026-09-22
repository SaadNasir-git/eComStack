import Fastify from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eComConfig } from './ecom.config';
import { registerPlugins } from './plugins';
import { registerFileRoutes } from './lib/file-router';
import { registerWorkers } from './workers';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({ logger: true })
  .withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(registerPlugins);
await fastify.register(registerWorkers);

await fastify.register(
  async (scoped) => {
    await registerFileRoutes(scoped, join(__dirname, 'routes'));
  },
  { prefix: eComConfig.env.PREFIX }
);

try {
  await fastify.listen({ port: eComConfig.env.PORT, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}