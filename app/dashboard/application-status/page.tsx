import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApplicationStatusView, ApplicationRecord } from "@/components/dashboard/application-status-view";

export const instant = false;

export default async function ApplicationStatusPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?redirectedFrom=/dashboard/application-status");
  }

  // Fetch applications for current user
  const { data: applications } = await supabase
    .from("job_applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <ApplicationStatusView
        initialApplications={(applications || []) as ApplicationRecord[]}
        userId={user.id}
      />
    </div>
  );
}
