import { LucideIcon } from "lucide-react";

interface BlankPagePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export function BlankPagePlaceholder({
  title,
  description,
  icon: Icon,
  badge = "Under Development",
}: BlankPagePlaceholderProps) {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-300">
      <div className="relative mb-6">
        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
          <Icon className="w-8 h-8" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
        <span>{badge}</span>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
        {title}
      </h2>
      <p className="text-sm text-slate-400 max-w-md leading-relaxed">
        {description}
      </p>

      <div className="mt-8 p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 max-w-sm w-full">
        <p className="text-xs text-slate-500">
          Ready for implementation. Page layout and routing are configured.
        </p>
      </div>
    </div>
  );
}
