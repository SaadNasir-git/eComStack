import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";

export const FastifyTypeProvider = (baseFastify: FastifyInstance) => {
    return baseFastify.withTypeProvider<TypeBoxTypeProvider>();
}