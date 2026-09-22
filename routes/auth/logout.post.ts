import { userDevices } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

export const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    const fastify = request.server;
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
        try {
            const decoded = fastify.jwt.verify<{ deviceId: string }>(refreshToken);
            await fastify.db
                .delete(userDevices)
                .where(eq(userDevices.id, decoded.deviceId));
        } catch (error) {
            request.log.warn({ err: error }, 'logout: invalid refresh token');
        }
    }

    return reply.code(200).clearCookie('refreshToken', { path: '/auth' }).send({ message: 'Logged out.' });
}