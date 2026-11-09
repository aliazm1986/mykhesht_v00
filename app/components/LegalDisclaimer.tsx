import { Info } from "lucide-react";
import { legalDisclaimerShort } from "@/lib/data";

export function LegalDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`legal-banner ${className}`.trim()} role="note">
      <Info size={16} />
      <span>{legalDisclaimerShort}</span>
    </div>
  );
}
