import type { FastifyInstance } from "fastify";
import { inngest } from "../client";
import { userDevices } from "@/drizzle/schema";
import { lt } from "drizzle-orm";

export const DeleteUnusedDevices = (fastify: FastifyInstance) =>
    inngest.createFunction(
        {
            id: "delete-devices",
            triggers: [{ cron: "0 0 * * *" }],
        },
        async ({ step }) => {
            await step.run("delete-devices", async () => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                await fastify.db
                    .delete(userDevices)
                    .where(lt(userDevices.lastUse, sevenDaysAgo));
            });
        }
    );