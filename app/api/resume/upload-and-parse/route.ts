import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseResumeWithGemini } from "@/lib/gemini/resume-parser";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "application/pdf";

    // 1. Upload to Supabase Storage
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage: " + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("resumes").getPublicUrl(storagePath);

    // 2. Parse resume directly with Gemini AI model (supports PDF multimodal inlineData natively)
    const parsedData = await parseResumeWithGemini(buffer, mimeType);

    // 3. Save resume record in public.resumes
    const { data: resumeRecord, error: resumeDbError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        storage_path: storagePath,
        parsed_data: parsedData,
      })
      .select()
      .single();

    if (resumeDbError) {
      console.error("Failed to insert resume record:", resumeDbError);
    }

    // 4. Update user profile in public.profiles with extracted data
    const safeFullName =
      parsedData.full_name &&
      !parsedData.full_name.startsWith("%PDF") &&
      parsedData.full_name !== "Candidate"
        ? parsedData.full_name
        : user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Candidate";

    const profileUpdateData = {
      id: user.id,
      email: user.email,
      full_name: safeFullName,
      phone: parsedData.phone || null,
      location: parsedData.location || null,
      headline: parsedData.headline || "Software Engineer",
      summary: parsedData.summary || null,
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      experience: Array.isArray(parsedData.experience) ? parsedData.experience : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
      certifications: Array.isArray(parsedData.certifications) ? parsedData.certifications : [],
      links: Array.isArray(parsedData.links) ? parsedData.links : [],
      onboarded: true,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProfile, error: profileError } = await supabase
      .from("profiles")
      .upsert(profileUpdateData)
      .select()
      .single();

    if (profileError) {
      console.error("Failed to update profile with resume data:", profileError);
    }

    try {
      revalidatePath("/dashboard/profile");
      revalidatePath("/dashboard/resume");
      revalidatePath("/dashboard");
    } catch (e) {
      // Revalidation warning if in non-standard context
    }

    return NextResponse.json({
      success: true,
      resume: resumeRecord,
      profile: updatedProfile || profileUpdateData,
    });
  } catch (error: unknown) {
    console.error("Resume upload & parse route error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
