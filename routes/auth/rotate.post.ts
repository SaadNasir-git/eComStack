import { userDevices, users } from "@/drizzle/schema";
import { eComConfig } from "@/ecom.config";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const fastify = request.server;
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
        return reply.code(401).send({ message: 'Unauthorized' });
    }

    let decoded: { deviceId: string; iat: number };
    try {
        decoded = fastify.jwt.verify<{ deviceId: string; iat: number }>(refreshToken);
    } catch {
        return reply.code(401).send({ message: 'Session expired. Please log in again.' });
    }

    const [user] = await fastify.db
        .select({
            deviceId: userDevices.id,
            userId: userDevices.userId,
            email: users.email,
            name: users.name,
            refreshToken: userDevices.refreshToken,
            role: users.role
        })
        .from(userDevices)
        .innerJoin(users, eq(users.id, userDevices.userId))
        .where(eq(userDevices.id, decoded.deviceId));

    if (!user) {
        reply.clearCookie('refreshToken', { path: '/auth' });
        return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
    }

    const isCorrect = await fastify.bcrypt.compare(refreshToken, user.refreshToken);
    if (!isCorrect) {
        reply.clearCookie('refreshToken', { path: '/auth' });
        return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
    }

    const accessToken = fastify.jwt.sign({
        userId: user.userId,
        email: user.email,
        name: user.name,
        deviceId: user.deviceId,
        role: user.role
    }, { expiresIn: '15m' });

    const ageSeconds = Math.floor(Date.now() / 1000) - decoded.iat;
    const shouldRotate = ageSeconds >= 24 * 60 * 60;

    if (!shouldRotate) {
        return reply.send({ accessToken });
    }

    const newRefreshToken = fastify.jwt.sign(
        { deviceId: user.deviceId },
        { expiresIn: '7d' }
    );

    const newHash = await fastify.bcrypt.hash(newRefreshToken);

    const [updated] = await fastify.db.update(userDevices)
        .set({ refreshToken: newHash })
        .where(and(
            eq(userDevices.id, user.deviceId),
            eq(userDevices.refreshToken, user.refreshToken)
        ))
        .returning({ id: userDevices.id })

    if (!updated) {
        return reply.send({ accessToken });
    }

    reply.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: eComConfig.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
    });

    return reply.send({ accessToken });

}