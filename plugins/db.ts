import fp from 'fastify-plugin';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

export default fp(
  async (fastify) => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });

    const db = drizzle({ client: pool });
    fastify.decorate('db', db);

    fastify.addHook('onClose', () => pool.end());
  },
  { name: 'db' },
);