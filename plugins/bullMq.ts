import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Queue, createValkeyGlideClient, type JobsOptions } from 'bullmq';

export type AuthJobMap = {
  url: { email: string; token: string };
  otp: { email: string; code: string };
  reset: { email: string; forgotPasswordUrl: string };
  resetWarn: { email: string };
};

export type AuthJobName = keyof AuthJobMap;

type AuthQueue = Omit<Queue, 'add'> & {
  add<T extends AuthJobName>(
    name: T,
    data: AuthJobMap[T],
    opts?: JobsOptions,
  ): Promise<unknown>;
};

declare module 'fastify' {
  interface FastifyInstance {
    authQueue: AuthQueue;
    bulkQueue: Queue;
  }
}

async function bullMqPlugin(instance: FastifyInstance) {
  if (!instance.valkey) {
    throw new Error('fastify-valkey-glide must be registered before the BullMQ plugin');
  }

  const connection = createValkeyGlideClient(instance.valkey);

  const authQueue = new Queue('auth-email-queue', {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 1000,
    },
  });

  const bulkQueue = new Queue('bulk-email-queue', {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  instance.decorate('authQueue', authQueue as AuthQueue);
  instance.decorate('bulkQueue', bulkQueue);

  instance.addHook('onClose', async () => {
    await Promise.all([authQueue.close(), bulkQueue.close()]);
  });
}

export default fp(bullMqPlugin);