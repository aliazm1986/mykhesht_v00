import Image from "next/image";

export function KhestLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`khest-logo ${compact ? "khest-logo-compact" : ""}`}>
      <Image
        src="/khesht-logo.png"
        alt="نشان خشت"
        width={compact ? 38 : 44}
        height={compact ? 38 : 44}
        priority={!compact}
        unoptimized
      />
      {!compact && <span>خشت</span>}
    </span>
  );
}
