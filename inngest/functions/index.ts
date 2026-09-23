import type { FastifyInstance } from "fastify";
import { DeleteUnusedDevices } from "./DeleteUnusedDevices";

export const functions = (fastify: FastifyInstance) => {
    return [
        DeleteUnusedDevices(fastify)
    ]
}