import * as schema from '@/drizzle/schema';
import { drizzle } from 'drizzle-orm/node-postgres';

declare module 'fastify' {
    interface FastifyInstance {
        db: ReturnType<typeof drizzle<typeof schema>>;
    }
}