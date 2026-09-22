import { userDevices } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const fastify = request.server;
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
        return reply.code(401).send({ message: "Unauthorized" });
    }

    let decoded: { deviceId: string };
    try {
        decoded = fastify.jwt.verify<{ deviceId: string }>(refreshToken);
    } catch {
        reply.clearCookie('refreshToken', { path: '/auth' });
        return reply.code(401).send({ message: "Session expired." });
    }

    const [device] = await fastify.db
        .select({ userId: userDevices.userId })
        .from(userDevices)
        .where(eq(userDevices.id, decoded.deviceId));

    if (device) {
        await fastify.db
            .delete(userDevices)
            .where(eq(userDevices.userId, device.userId));
    }

    return reply.code(200).clearCookie('refreshToken', { path: '/auth' }).send({ message: 'Logged out of all devices.' });
}