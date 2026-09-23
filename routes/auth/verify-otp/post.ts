import { userDevices, users } from "@/drizzle/schema";
import { cookiePath, eComConfig } from "@/ecom.config";
import { verifyHmac } from "@/utils/hmac";
import { Type, type Static } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

const schema = Type.Object({
    otp: Type.String()
});

export const config = {
    schema: {
        body: schema
    }
}

export const handler = async (request: FastifyRequest<{Body: Static<typeof config.schema.body>}>, reply: FastifyReply) => {
    const fastify = request.server;
    const body = request.body;
    const uniqueId = request.cookies.uniqueId;

    if (!uniqueId) {
        return reply.code(400).send({
            message: "OTP has been expired."
        })
    }

    const codeDetailsString = await fastify.valkey.get(`OTP:${uniqueId}`);
    if (!codeDetailsString) {
        return reply.code(400).send({
            message: "OTP has been expired."
        })
    }

    const codeDetails: { code: string; userId: string; tries: number; } = JSON.parse(codeDetailsString.toString());
    const isCorrect = verifyHmac(body.otp, codeDetails.code);

    if (!isCorrect) {
        codeDetails.tries += 1;
        if (codeDetails.tries >= 5) {
            await fastify.valkey.del([`OTP:${uniqueId}`, `LOGIN_SESSION:${uniqueId}`]);
            reply.clearCookie('uniqueId', { path: cookiePath })
            return reply.code(400).send({ message: 'Too many attempts. Please login again.' });
        }

        await fastify.valkey.set(`OTP:${uniqueId}`, JSON.stringify(codeDetails), {
            expiry: "keepExisting"
        });
        return reply.code(400).send({
            message: "Invalid OTP."
        })
    }

    await fastify.valkey.del([`OTP:${uniqueId}`, `LOGIN_SESSION:${uniqueId}`]);

    const [result] = await fastify.db.select({
        userId: users.id
    }).from(users)
        .where(eq(users.id, codeDetails.userId.toString()));

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
    })

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
    reply.clearCookie('uniqueId', { path: cookiePath })

    return reply.send({
        message: "User verified successfully"
    });

}