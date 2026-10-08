import { User } from "lucide-react";
import { BlankPagePlaceholder } from "@/components/dashboard/blank-page-placeholder";

export default function ProfilePage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Profile</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          View and edit your personal information, experience, and career preferences.
        </p>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 flex items-center justify-center">
        <BlankPagePlaceholder
          title="Professional Profile"
          description="Manage your verified contact info, portfolio links, desired salary, and preferred work arrangements."
          icon={User}
          badge="Ready for Content"
        />
      </div>
    </div>
  );
}
