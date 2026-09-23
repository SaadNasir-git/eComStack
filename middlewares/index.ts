import fp from 'fastify-plugin';
import { registerMiddlewares } from '@/lib/middleware/registry';
import './redirectIfAuthed'

export const middlewaresPlugin = fp(
  async (app) => {
    await registerMiddlewares(app);
  },
  { name: 'middlewares' }
);