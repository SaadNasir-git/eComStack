import * as schema from '@/drizzle/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { FastifyBaseLogger, FastifyInstance, FastifyTypeProvider, RawServerDefault } from "fastify";
import type { IncomingMessage, ServerResponse } from "node:http";

declare module 'fastify' {
    interface FastifyInstance {
        db: ReturnType<typeof drizzle<typeof schema>>;
    }
}

export type fastify = FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProvider>