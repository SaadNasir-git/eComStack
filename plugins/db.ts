import fp from 'fastify-plugin';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { type FastifyPluginAsync } from 'fastify';

interface dbPluginOptions {
  url: string;
}

const dbPlugin: FastifyPluginAsync<dbPluginOptions> = async (fastify, options) => {
  const pool = new Pool({
    connectionString: options.url,
  });

  const db = drizzle({ client: pool });
  fastify.decorate('db', db);

  fastify.addHook('onClose', () => pool.end());
}

export default fp(dbPlugin, { name: 'db' });