import { eComConfig } from "@/ecom.config";
import db from "@/plugins/db";
import type { FastifyBaseLogger, FastifyInstance, FastifyTypeProvider, RawServerDefault } from "fastify";
import fastifyBcrypt from "fastify-bcrypt";
import type { IncomingMessage, ServerResponse } from "http";
import fastifyValkey from "@fastify/valkey-glide";
import fastifyJwt from "@fastify/jwt";
import bullMq from "@/plugins/bullMq";
import fastifyCookie from "@fastify/cookie";
import { RateLimiterValkey } from "rate-limiter-flexible";
import { authModule } from "./modules/auth/jwt";

export async function register(instance: FastifyInstance<RawServerDefault, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, FastifyTypeProvider>) {
    await instance.register(db, {
        url: eComConfig.env.DATABASE_URL
    });
    await instance.register(fastifyJwt, {
        secret: eComConfig.env.JWT_SECRET
    })
    await instance.register(fastifyBcrypt, {
        saltWorkFactor: 12
    });
    await instance.register(fastifyCookie, {
        secret: eComConfig.env.SECRET_KEY
    });
    await instance.register(fastifyValkey, {
        addresses: [{
            host: eComConfig.env.VALKEY.HOST,
            port: eComConfig.env.VALKEY.PORT
        }]
    });
    await instance.register(bullMq);
    const rateLimiter = new RateLimiterValkey({
        storeClient: instance.valkey,
        points: 60,
        duration: 60,
        keyPrefix: "ecom_rate_limit"
    });
    instance.addHook("onRequest", async (request, reply) => {
        try {
            const key = request.ip;
            await rateLimiter.consume(key);
        } catch (error) {
            reply.code(429).send({
                statusCode: 429,
                error: "Too Many Requests",
                message: "You have exceeded your request limit. Please try again later."
            });
        }
    });
    await instance.register(authModule);
}