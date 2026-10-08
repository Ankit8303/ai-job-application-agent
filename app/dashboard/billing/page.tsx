import { CreditCard } from "lucide-react";
import { BlankPagePlaceholder } from "@/components/dashboard/blank-page-placeholder";

export default function BillingPage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Billing / Credits</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review your subscription plan, credit consumption, and invoice receipts.
        </p>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 flex items-center justify-center">
        <BlankPagePlaceholder
          title="Billing & AI Credits Management"
          description="Manage payment methods, upgrade subscription tier, and top up AI application credits."
          icon={CreditCard}
          badge="Ready for Content"
        />
      </div>
    </div>
  );
}
