import { createValkeyGlideClient, Worker } from 'bullmq';
import type { FastifyInstance } from 'fastify';

export default async function startBulkWorker(instance: FastifyInstance) {
  const connection = createValkeyGlideClient(instance.valkey);

  const bulkWorker = new Worker(
    'bulk-email-queue',
    async (job) => {
    //   await sendHeavyMarketingEmail(job.data);
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 1000,
      },
    },
  );

  instance.addHook('onClose', async () => {
    await bulkWorker.close();
  });

  return bulkWorker;
}