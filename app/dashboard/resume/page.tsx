import { FileText } from "lucide-react";
import { BlankPagePlaceholder } from "@/components/dashboard/blank-page-placeholder";

export default function ResumePage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Resume</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage, customize, and generate ATS-optimized resumes with AI.
        </p>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 flex items-center justify-center">
        <BlankPagePlaceholder
          title="Resume Builder & Parser"
          description="Upload existing resumes, analyze keyword density against job descriptions, and create tailored versions."
          icon={FileText}
          badge="Ready for Content"
        />
      </div>
    </div>
  );
}
