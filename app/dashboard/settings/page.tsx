import { Settings } from "lucide-react";
import { BlankPagePlaceholder } from "@/components/dashboard/blank-page-placeholder";

export default function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Profile Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure security credentials, notification preferences, and application integrations.
        </p>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 flex items-center justify-center">
        <BlankPagePlaceholder
          title="Account & Security Settings"
          description="Update password, manage Google OAuth links, configure email notifications, and data privacy."
          icon={Settings}
          badge="Ready for Content"
        />
      </div>
    </div>
  );
}
