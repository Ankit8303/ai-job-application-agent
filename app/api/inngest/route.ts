import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  detectJobFieldsFunction,
  submitJobApplicationFunction,
} from "@/lib/inngest/functions";

// Next.js route handler for Inngest background job orchestration
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [detectJobFieldsFunction, submitJobApplicationFunction],
});
