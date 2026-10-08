import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrFetchJobs } from "@/lib/jobs/tavily-search";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = (searchParams.get("platform") || "all") as any;
    const forceRefresh = searchParams.get("refresh") === "true";
    const savedOnly = searchParams.get("savedOnly") === "true";

    if (savedOnly) {
      const { data: savedJobs, error: savedError } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .eq("saved_status", true)
        .order("created_at", { ascending: false });

      if (savedError) {
        return NextResponse.json({ error: savedError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        jobs: savedJobs || [],
        fromCache: true,
      });
    }

    const result = await getOrFetchJobs(supabase, user.id, forceRefresh, platform);

    return NextResponse.json({
      success: true,
      jobs: result.jobs,
      fromCache: result.fromCache,
      lastFetchedAt: result.lastFetchedAt,
    });
  } catch (err: unknown) {
    console.error("Jobs API error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, saved_status, applied_status } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof saved_status === "boolean") updates.saved_status = saved_status;
    if (typeof applied_status === "string") updates.applied_status = applied_status;

    const { data: updatedJob, error: updateError } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", jobId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
    });
  } catch (err: unknown) {
    console.error("Jobs patch error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
