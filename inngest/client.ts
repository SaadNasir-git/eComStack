import { eComConfig } from "@/ecom.config";
import { Inngest } from "inngest";

export const inngest = new Inngest({
    id: eComConfig.projectName
});