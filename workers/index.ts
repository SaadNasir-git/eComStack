import type { FastifyInstance } from 'fastify';
import type { Worker } from 'bullmq';
import { startAuthWorker } from './sendAuthEmail';

type AnyWorker = Worker<any, any, any>;
type WorkerStarter = (instance: FastifyInstance) => Promise<AnyWorker>;

const workers: Record<string, WorkerStarter> = {
  auth: startAuthWorker,
};

export async function registerWorkers(instance: FastifyInstance): Promise<void> {
  const started: AnyWorker[] = [];

  for (const [name, start] of Object.entries(workers)) {
    try {
      started.push(await start(instance));
    } catch (err) {
      instance.log.error({ err, worker: name }, 'failed to start worker');
      throw err;
    }
  }

  instance.addHook('onClose', async () => {
    instance.log.info({ count: started.length }, 'closing workers');
    await Promise.all(started.map((w) => w.close()));
  });

  instance.log.info({ count: started.length }, 'workers registered');
}