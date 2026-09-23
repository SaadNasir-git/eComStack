import type { FastifyRequest, FastifyReply } from 'fastify';

export type MiddlewareHandler = (
    request: FastifyRequest,
    reply: FastifyReply
) => Promise<void> | void;

export type MiddlewareConfig = {
    /** Where the middleware runs. Supports `*` wildcards. */
    paths: string[];
    /** Paths to skip, even if they match `paths`. Exact match or wildcard. */
    exclude?: string[];
    /** The middleware function. Short-circuit with reply.send() to stop. */
    handler: MiddlewareHandler;
    /** Optional name for logs. */
    name?: string;
};