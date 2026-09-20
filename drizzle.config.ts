import { defineConfig } from 'drizzle-kit';
import { eComConfig } from './ecom.config';

export default defineConfig({
  out: './drizzle/migrations',
  schema: './drizzle/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: eComConfig.env.DATABASE_URL,
  }
});