import { buildApp } from "./app.ts";
import { eComConfig } from '../ecom.config.ts'

const app = buildApp();

const start = async () => {
  try {
    await app.listen({
      port: eComConfig.env.PORT,
      host: '0.0.0.0',
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();