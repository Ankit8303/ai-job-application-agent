import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionManager } from "@/lib/automation/session-manager";
import { adapterRegistry } from "@/lib/automation/adapters/adapter-registry";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId, action = "launch", loginUrl: customLoginUrl } = await req.json();

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    // Fetch the application
    const { data: application, error: appErr } = await supabase
      .from("job_applications")
      .select("*")
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const adapter = adapterRegistry.getAdapterForUrl(application.job_url);
    const portalId = adapter.id;
    const portalCaps = adapter.getPortalCapabilities();
    const loginUrl = customLoginUrl || portalCaps.loginUrl || application.job_url;

    // ── Action: Check Status ──
    if (action === "status") {
      const hasSession = await sessionManager.hasValidSession(user.id, portalId);
      return NextResponse.json({
        portalId,
        authenticated: hasSession,
        loginUrl,
      });
    }

    // ── Action: Clear Session ──
    if (action === "clear") {
      await sessionManager.clearSession(user.id, portalId);
      return NextResponse.json({ success: true, message: "Session cleared" });
    }

    // ── Action: Launch Interactive Login Window ──
    if (action === "launch") {
      // Update application state to WAITING_FOR_USER_LOGIN
      await supabase
        .from("job_applications")
        .update({
          workflow_state: "WAITING_FOR_USER_LOGIN",
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      // Launch interactive browser for candidate
      const result = await sessionManager.launchInteractiveLogin(
        user.id,
        portalId,
        loginUrl,
        {
          timeoutMs: 180000, // 3 minutes for human interaction
          isVerificationDone: async (context) => {
            const pages = context.pages();
            if (pages.length === 0) return false;
            const activePage = pages[0];
            const check = await adapter.detectAuthenticationState(activePage);
            return !check.requiresAuth && check.authState === "AUTHENTICATED";
          },
        }
      );

      if (result.success) {
        // Update DB: User is authenticated!
        await supabase
          .from("job_applications")
          .update({
            auth_status: "AUTHENTICATED",
            workflow_state: "AUTHENTICATED",
            session_ref: result.sessionRef,
            updated_at: new Date().toISOString(),
          })
          .eq("id", applicationId);

        return NextResponse.json({
          success: true,
          authenticated: true,
          message: "Login verified successfully! You can now resume your application.",
          sessionRef: result.sessionRef,
        });
      } else {
        return NextResponse.json({
          success: false,
          authenticated: false,
          error: result.error || "Interactive login not completed",
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Interactive login route error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
