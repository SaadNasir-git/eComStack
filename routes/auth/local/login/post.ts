import { users } from "@/drizzle/schema";
import { eComConfig } from "@/ecom.config";
import { hmac } from "@/utils/hmac";
import { safeRedirect } from "@/utils/safeCallback";
import { Type, type Static } from "@sinclair/typebox";
import { TimeUnit } from "@valkey/valkey-glide";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomInt, randomUUID } from "node:crypto";

const schema = Type.Object({
    email: Type.String({ format: 'email' }),
    password: Type.String({
        minLength: 8,
        maxLength: 72
    }),
    strategy: Type.Union(
        [Type.Literal("url"), Type.Literal("otp")],
        { default: "url" }
    ),
    callBackUrl: Type.Optional(Type.String())
});

export const config = {
    schema: {
        body: schema
    }
}

export const handler = async (request: FastifyRequest<{ Body: Static<typeof config.schema.body> }>, reply: FastifyReply) => {
    const fastify = request.server
    const body = request.body;

    const [result] = await fastify.db.select({
        userId: users.id,
        passwordHash: users.passwordHash
    })
        .from(users)
        .where(eq(users.email, body.email))

    if (!result) {
        return reply.code(400).send({
            message: "User is not signed up, Signup first."
        })
    }

    if (!result.passwordHash) {
        return reply.code(400).send({
            message: "User signed up with provider before and now trying to login with email."
        })
    }

    const isCorrect = await fastify.bcrypt.compare(body.password, result.passwordHash);

    if (!isCorrect) {
        return reply.code(400).send({
            message: "Wrong Password!"
        })
    }

    const uniqueId = randomUUID();

    if (body.strategy === "url") {
        const token = fastify.jwt.sign({
            id: uniqueId,
            purpose: 'authentication'
        }, { expiresIn: '24h' })

        await fastify.valkey.set(`TOKEN:${uniqueId}`, JSON.stringify({ callBackUrl: safeRedirect(body.callBackUrl ?? '/'), userId: result.userId }), {
            expiry: {
                type: TimeUnit.Seconds,
                count: 24 * 60 * 60
            }
        });

        await fastify.authQueue.add('url', {
            email: body.email,
            token
        });

        return reply.code(202).send({
            message: "Verification Email will be sent to your email shortly."
        })
    } else {
        await fastify.valkey.set(`LOGIN_SESSION:${uniqueId}`, JSON.stringify({
            userId: result.userId,
            email: body.email,
            resendCount: 0,
            lastSentAt: Date.now(),
        }), { expiry: { type: TimeUnit.Seconds, count: 15 * 60 } });

        const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
        const hashedCode = hmac(code.toString());

        await fastify.valkey.set(`OTP:${uniqueId}`, JSON.stringify({ code: hashedCode, userId: result.userId, tries: 0 }), {
            expiry: {
                type: TimeUnit.Seconds,
                count: 5 * 60
            }
        });

        await fastify.authQueue.add('otp', {
            email: body.email,
            code
        })

        reply.setCookie('uniqueId', uniqueId, {
            httpOnly: true,
            secure: eComConfig.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60,
            path: '/auth'
        })

        return reply.code(202).send({
            message: "OTP will be sent to your email shortly"
        })
    }
}