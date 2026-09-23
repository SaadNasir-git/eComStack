import { userDevices, users } from "@/drizzle/schema";
import { cookiePath } from "@/ecom.config";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const fastify = request.server;
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
        return reply.code(401).send({ message: 'Unauthorized' });
    }

    let decoded: { deviceId: string };
    try {
        decoded = fastify.jwt.verify<{ deviceId: string }>(refreshToken);
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
        reply.clearCookie('refreshToken', { path: cookiePath });
        return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
    }

    const isCorrect = await fastify.bcrypt.compare(refreshToken, user.refreshToken);

    if (!isCorrect) {
        reply.clearCookie('refreshToken', { path: cookiePath });
        return reply.code(401).send({ message: 'Session revoked. Please log in again.' });
    }

    const accessToken = fastify.jwt.sign({
        userId: user.userId,
        email: user.email,
        name: user.name,
        deviceId: user.deviceId,
        role: user.role
    }, { expiresIn: '15m' });

    return reply.send({ accessToken });
}