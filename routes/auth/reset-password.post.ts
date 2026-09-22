import { userDevices, users } from "@/drizzle/schema";
import { Type, type Static } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

const schema = Type.Object({
    token: Type.String(),
    password: Type.String({
        minLength: 8,
        maxLength: 72
    })
})

export const config = {
    schema: {
        body: schema
    }
}

export const handler = async (request: FastifyRequest<{ Body: Static<typeof config.schema.body> }>, reply: FastifyReply) => {
    const fastify = request.server;
    const body = request.body;
    let decodedPayload: { userId: string; tokenId: string; purpose: string };
    try {
        decodedPayload = fastify.jwt.verify<{ userId: string; tokenId: string; purpose: string }>(body.token);
    } catch {
        return reply.code(400).send({
            message: "Invalid Token"
        })
    }

    if (!decodedPayload || decodedPayload.purpose !== 'forgot-password') {
        return reply.code(400).send({
            message: "Invalid Token"
        })
    }

    const tokenId = await fastify.valkey.get(`RESET_PASSWORD:${decodedPayload.userId}`);
    if (!tokenId || tokenId.toString() !== decodedPayload.tokenId) {
        return reply.code(400).send({
            message: "Token has been expired"
        })
    }

    await fastify.valkey.del([`RESET_PASSWORD:${decodedPayload.userId}`]);

    const passwordHash = await fastify.bcrypt.hash(body.password)
    await fastify.db.update(users).set({
        passwordHash: passwordHash
    }).where(eq(users.id, decodedPayload.userId));

    await fastify.db.delete(userDevices)
        .where(eq(userDevices.userId, decodedPayload.userId));

    return reply.code(200).send({ message: "Password updated successfully" });

}