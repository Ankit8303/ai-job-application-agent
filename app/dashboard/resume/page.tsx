import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ResumeList } from "@/components/dashboard/resume-list";

export const instant = false;

export default async function ResumePage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirectedFrom=/dashboard/resume");
  }

  // Fetch all user resumes from Supabase
  const { data: resumes } = await supabase
    .from("resumes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Resumes
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload, manage, and review AI-parsed resumes used for automated job matching.
        </p>
      </div>

      <ResumeList initialResumes={resumes || []} />
    </div>
  );
}
