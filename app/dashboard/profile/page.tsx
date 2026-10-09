import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const instant = false;

export default async function ProfilePage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirectedFrom=/dashboard/profile");
  }

  // Fetch candidate profile from public.profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const initialProfile = {
    id: user.id,
    email: profile?.email || user.email || "",
    full_name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    headline: profile?.headline || "Software Engineer",
    summary: profile?.summary || "",
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    experience: Array.isArray(profile?.experience) ? profile.experience : [],
    education: Array.isArray(profile?.education) ? profile.education : [],
    projects: Array.isArray(profile?.projects) ? profile.projects : [],
    certifications: Array.isArray(profile?.certifications)
      ? profile.certifications
      : [],
    links: Array.isArray(profile?.links) ? profile.links : [],
    onboarded: profile?.onboarded ?? false,
  };

  // Fetch any pending applications with status 'Missing Profile Info'
  const { data: pendingApplications } = await supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "Missing Profile Info")
    .order("updated_at", { ascending: false });

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Candidate Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review, customize, and save the profile information extracted by Gemini AI.
        </p>
      </div>

      <ProfileForm
        initialProfile={initialProfile}
        pendingApplications={pendingApplications || []}
      />
    </div>
  );
}
