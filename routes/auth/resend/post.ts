import { cookiePath } from "@/ecom.config";
import { hmac } from "@/utils/hmac";
import { TimeUnit } from "@valkey/valkey-glide";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomInt } from "node:crypto";

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const fastify = request.server;
    const uniqueId = request.cookies.uniqueId;
    if (!uniqueId) {
        return reply.code(400).send({ message: 'Session expired. Please login again.' });
    }

    const sessionRaw = await fastify.valkey.get(`LOGIN_SESSION:${uniqueId}`);
    if (!sessionRaw) {
        return reply.code(400).send({ message: 'Session expired. Please login again.' });
    }

    const session: {
        userId: string,
        email: string,
        resendCount: number,
        lastSentAt: number,
    } = JSON.parse(sessionRaw.toString());

    if (Date.now() - session.lastSentAt < 60_000) {
        return reply.code(429).send({ message: 'Please wait before requesting another code.' });
    }

    if (session.resendCount >= 5) {
        await fastify.valkey.del([`LOGIN_SESSION:${uniqueId}`, `OTP:${uniqueId}`]);
        reply.clearCookie('uniqueId', { path: cookiePath })
        return reply.code(429).send({ message: 'Too many resends. Please login again.' });
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await fastify.valkey.set(`OTP:${uniqueId}`, JSON.stringify({ userId: session.userId, code: hmac(code), tries: 0 }), {
        expiry: { type: TimeUnit.Seconds, count: 5 * 60 },
    });

    await fastify.valkey.set(`LOGIN_SESSION:${uniqueId}`, JSON.stringify({
        ...session,
        resendCount: session.resendCount + 1,
        lastSentAt: Date.now(),
    }), { expiry: "keepExisting" });

    await fastify.authQueue.add('otp', { email: session.email, code });

    return reply.code(202).send({ message: 'A new code has been sent.' });

}