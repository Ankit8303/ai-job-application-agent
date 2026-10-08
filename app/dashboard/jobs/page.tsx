import { Briefcase } from "lucide-react";
import { BlankPagePlaceholder } from "@/components/dashboard/blank-page-placeholder";

export default function JobsPage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Jobs</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Explore AI-recommended job opportunities and automated applications.
        </p>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 flex items-center justify-center">
        <BlankPagePlaceholder
          title="Jobs Board & Matching"
          description="This page will feature verified job listings, automated AI matching algorithms, and 1-click application workflows."
          icon={Briefcase}
          badge="Ready for Content"
        />
      </div>
    </div>
  );
}
