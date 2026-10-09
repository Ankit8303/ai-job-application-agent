import { Inngest } from "inngest";

// Initialize the Inngest client for background orchestration
// In development, isDev: true allows running without cloud signing keys
export const inngest = new Inngest({
  id: "ai-job-application-agent",
  name: "AI Job Application Agent",
  isDev: process.env.NODE_ENV !== "production" || process.env.INNGEST_DEV === "1",
});

/**
 * Safely send an event to Inngest without throwing unhandled network exceptions
 * when the local Inngest dev server (port 8288) is not running.
 */
export async function sendInngestEvent(event: any): Promise<boolean> {
  try {
    await inngest.send(event);
    return true;
  } catch (err: any) {
    const isConnRefused =
      err?.cause?.code === "ECONNREFUSED" ||
      err?.code === "ECONNREFUSED" ||
      err?.message?.includes("ECONNREFUSED") ||
      (Array.isArray(err?.cause?.errors) &&
        err.cause.errors.some((e: any) => e.code === "ECONNREFUSED"));

    if (isConnRefused) {
      // In local dev without `npx inngest-cli dev`, immediate execution handles the task seamlessly
      return false;
    }
    console.warn("Inngest event dispatch notice:", err?.message || err);
    return false;
  }
}
