import { users } from "@/drizzle/schema";
import { eComConfig } from "@/ecom.config";
import type { RouteConfig } from "@/types/router";
import { Type, type Static } from "@sinclair/typebox";
import { TimeUnit } from "@valkey/valkey-glide";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

const schema = Type.Object({
    email: Type.String({ format: 'email' })
});

export const config = {
    schema: {
        body: schema
    }
} satisfies RouteConfig;

export const handler = async (request: FastifyRequest<{ Body: Static<typeof schema> }>, reply: FastifyReply) => {
    const fastify = request.server;
    const body = request.body;

    const [result] = await fastify.db.select({
        id: users.id
    }).from(users)
        .where(eq(users.email, body.email));

    if (!result) {
        return reply.code(200).send({
            message: "Email sent successfully."
        })
    }

    const tokenId = randomUUID();
    const token = fastify.jwt.sign({
        userId: result.id,
        tokenId: tokenId,
        purpose: 'forgot-password'
    }, { expiresIn: '30m' });

    await fastify.valkey.set(`RESET_PASSWORD:${result.id}`, tokenId, {
        expiry: {
            type: TimeUnit.Seconds,
            count: 30 * 60
        }
    });

    await fastify.authQueue.add('reset', {
        email: body.email,
        forgotPasswordUrl: `${eComConfig.env.BASE_URL}/reset-password?token=${token}`
    });

    return reply.code(200).send({
        message: "Email sent successfully."
    })

}