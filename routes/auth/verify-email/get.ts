import { userDevices, users } from "@/drizzle/schema";
import { cookiePath, eComConfig } from "@/ecom.config";
import { Type, type Static } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

const schema = Type.Object({
    token: Type.String()
});

export const config = {
    schema: {
        querystring: schema
    }
}

export const handler = async (request: FastifyRequest<{ Querystring: Static<typeof config.schema.querystring> }>, reply: FastifyReply) => {
    const fastify = request.server;
    const { token } = request.query;
    let decodedPayload: { id: string; purpose: string };

    try {
        decodedPayload = fastify.jwt.verify<{ id: string; purpose: string; }>(token);
    } catch {
        return reply.code(400).send({ message: 'Token is invalid or expired' });
    }

    if (!decodedPayload || decodedPayload.purpose !== 'authentication') {
        return reply.code(400).send({
            message: "Token is invalid"
        })
    }

    const uniqueId = decodedPayload.id;
    const tokenDetailsString = await fastify.valkey.getdel(`TOKEN:${uniqueId}`);

    if (!tokenDetailsString) {
        return reply.code(400).send({
            message: "Verification token has been expired!"
        });
    }

    const tokenDetails: { userId: string; callBackUrl: string } = JSON.parse(tokenDetailsString.toString())

    const [result] = await fastify.db.select({
        userId: users.id
    }).from(users).where(eq(users.id, tokenDetails.userId));

    if (!result) {
        return reply.code(400).send({
            message: "Token is invalid"
        })
    }

    const deviceId = randomUUID()
    const refreshToken = fastify.jwt.sign({
        deviceId: deviceId
    }, {
        expiresIn: '7d'
    });

    const [insertResult] = await fastify.db.insert(userDevices).values({
        userId: result.userId,
        refreshToken: (await fastify.bcrypt.hash(refreshToken)),
        id: deviceId
    }).returning({
        id: userDevices.id
    });

    if (!insertResult) {
        return reply.code(500).send({
            message: "Something went wrong!"
        });
    }

    reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: eComConfig.env.NODE_ENV === "production",
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: cookiePath
    });

    return reply.redirect(tokenDetails.callBackUrl);
}