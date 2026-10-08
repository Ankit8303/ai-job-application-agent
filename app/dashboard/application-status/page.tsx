import { Clock } from "lucide-react";
import { BlankPagePlaceholder } from "@/components/dashboard/blank-page-placeholder";

export default function ApplicationStatusPage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Application Status</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Monitor your application pipeline, interview requests, and responses.
        </p>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 flex items-center justify-center">
        <BlankPagePlaceholder
          title="Application Pipeline Tracker"
          description="View Kanban boards, track recruiter correspondence, and inspect AI agent submission logs."
          icon={Clock}
          badge="Ready for Content"
        />
      </div>
    </div>
  );
}
