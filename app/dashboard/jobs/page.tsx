import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrFetchJobs } from "@/lib/jobs/brave-search";
import { JobsView } from "@/components/dashboard/jobs/jobs-view";
import { ProfileData } from "@/components/dashboard/profile-form";

export const instant = false;

export default async function JobsPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirectedFrom=/dashboard/jobs");
  }

  // Fetch candidate profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const initialProfile: ProfileData = {
    id: user.id,
    email: profile?.email || user.email || "",
    full_name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Candidate",
    phone: profile?.phone || "",
    location: profile?.location || "",
    headline: profile?.headline || "Software Engineer",
    summary: profile?.summary || "",
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    experience: Array.isArray(profile?.experience) ? profile.experience : [],
    education: Array.isArray(profile?.education) ? profile.education : [],
    projects: Array.isArray(profile?.projects) ? profile.projects : [],
    certifications: Array.isArray(profile?.certifications) ? profile.certifications : [],
    links: Array.isArray(profile?.links) ? profile.links : [],
    onboarded: profile?.onboarded ?? false,
  };

  // Fetch jobs using 6-hour caching logic
  const result = await getOrFetchJobs(supabase, user.id, false, "all");

  return (
    <JobsView
      initialJobs={result.jobs}
      profile={initialProfile}
      fromCache={result.fromCache}
      lastFetchedAt={result.lastFetchedAt}
    />
  );
}
