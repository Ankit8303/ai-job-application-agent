import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirectedFrom=/dashboard");
  }

  // Fetch user profile from public.profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Check if user has uploaded any resumes
  const { count: resumeCount } = await supabase
    .from("resumes")
    .select("*", { count: "exact", head: true });

  const needsOnboarding =
    !profile?.onboarded && (resumeCount === 0 || resumeCount === null);

  return (
    <DashboardLayoutClient
      user={{
        id: user.id,
        email: user.email,
        full_name:
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User",
        avatar_url:
          profile?.avatar_url ||
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          "",
        headline: profile?.headline || "",
      }}
      needsOnboarding={needsOnboarding}
    >
      {children}
    </DashboardLayoutClient>
  );
}
