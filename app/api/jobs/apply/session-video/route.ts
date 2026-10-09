import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Browserbase } from "@browserbasehq/sdk";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const stream = searchParams.get("stream") === "true";

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 });
    }

    const recordingsDir = path.join(process.cwd(), "public", "recordings");

    // 1. Check for local Playwright video recording
    const possibleFiles = [
      path.join(recordingsDir, `${sessionId}-video.webm`),
      path.join(recordingsDir, `${sessionId}.webm`),
      path.join(recordingsDir, `${sessionId}-video.mp4`),
      path.join(recordingsDir, `${sessionId}.mp4`),
    ];

    const localVideoFile = possibleFiles.find((p) => fs.existsSync(p));

    if (localVideoFile) {
      const fileName = path.basename(localVideoFile);
      const isWebm = fileName.endsWith(".webm");
      const contentType = isWebm ? "video/webm" : "video/mp4";

      if (stream) {
        const stat = fs.statSync(localVideoFile);
        const fileSize = stat.size;
        const range = req.headers.get("range");

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = end - start + 1;
          const fileStream = fs.createReadStream(localVideoFile, { start, end });

          const headers = new Headers();
          headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
          headers.set("Accept-Ranges", "bytes");
          headers.set("Content-Length", chunkSize.toString());
          headers.set("Content-Type", contentType);

          return new NextResponse(fileStream as any, {
            status: 206,
            headers,
          });
        }

        const fileStream = fs.createReadStream(localVideoFile);
        const headers = new Headers();
        headers.set("Content-Length", fileSize.toString());
        headers.set("Content-Type", contentType);
        headers.set("Accept-Ranges", "bytes");

        return new NextResponse(fileStream as any, {
          status: 200,
          headers,
        });
      }

      return NextResponse.json({
        sessionId,
        status: "COMPLETED",
        isLive: false,
        liveUrl: null,
        videoUrl: `/recordings/${fileName}`,
        downloadUrl: `/recordings/${fileName}`,
        recordingStatus: "COMPLETED",
      });
    }

    // 2. Also check if job_applications has a recorded video_url or screenshot_url
    const supabase = await createClient();
    const { data: app } = await supabase
      .from("job_applications")
      .select("video_url, screenshot_url, status, session_replay_url")
      .or(`id.eq.${sessionId},browserbase_session_id.eq.${sessionId}`)
      .single();

    if (app?.video_url) {
      return NextResponse.json({
        sessionId,
        status: app.status || "COMPLETED",
        isLive: false,
        liveUrl: null,
        videoUrl: app.video_url,
        screenshotUrl: app.screenshot_url || null,
        recordingStatus: "COMPLETED",
      });
    }

    // 3. Fallback to Browserbase if configured
    const apiKey = process.env.BROWSERBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        sessionId,
        status: "COMPLETED",
        isLive: false,
        liveUrl: null,
        videoUrl: null,
        downloadUrl: null,
        consoleUrl: `https://www.browserbase.com/sessions/${sessionId}`,
      });
    }

    const browserbase = new Browserbase({ apiKey });
    let sessionStatus = "RUNNING";
    try {
      const session = await browserbase.sessions.retrieve(sessionId);
      sessionStatus = session.status || "RUNNING";
    } catch (sErr) {}

    let cdnDownloadUrl: string | null = null;
    let recordingStatus = "PENDING";

    try {
      const dlList = await browserbase.sessions.recording.downloads.list(sessionId);
      const completed = dlList.downloads?.find((d) => d.status === "COMPLETED" && d.downloadUrl);
      if (completed?.downloadUrl) {
        cdnDownloadUrl = completed.downloadUrl;
        recordingStatus = "COMPLETED";
      }
    } catch (recErr) {}

    return NextResponse.json({
      sessionId,
      status: sessionStatus,
      isLive: false,
      liveUrl: null,
      videoUrl: cdnDownloadUrl,
      downloadUrl: cdnDownloadUrl,
      recordingStatus,
    });
  } catch (err: any) {
    console.error("Session video endpoint error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
