import { users } from '@/drizzle/schema';
import type { RouteConfig } from '@/types/router';
import { Type, type Static } from '@sinclair/typebox';
import type { FastifyRequest, FastifyReply } from 'fastify';

const schema = Type.Object({
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
})

export const config = {
  schema: {
    body: schema
  },
} satisfies RouteConfig;

export const handler = async (request: FastifyRequest<{ Body: Static<typeof schema> }>, reply: FastifyReply) => {
  const fastify = request.server;
  const body = request.body;

  try {
    await fastify.db.insert(users).values({
      name: body.name,
      email: body.email,
      passwordHash: await fastify.bcrypt.hash(body.password),
    }).returning({ id: users.id, email: users.email });

    return reply.code(201).send({
      message: 'Account created. Now login and verify your account.',
    });
  } catch (error: any) {
    if ((error?.code ?? error?.cause?.code) === '23505') {
      return reply.code(409).send({ message: 'User already exists.' });
    }
    throw error;
  }
};