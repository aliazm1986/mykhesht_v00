import Image from "next/image";

type BlockArtProps = {
  accent?: "coral" | "brick" | "wine" | "sand";
  compact?: boolean;
  image?: string;
  alt?: string;
};

const defaultImages: Record<NonNullable<BlockArtProps["accent"]>, string> = {
  coral: "/pilot-assets/project-sarv-complete.webp",
  brick: "/pilot-assets/flip-niavaran-after.webp",
  wine: "/pilot-assets/project-narvan-office.webp",
  sand: "/pilot-assets/project-sepehr-complete.webp",
};

export function BlockArt({
  accent = "coral",
  compact = false,
  image,
  alt = "نمای معماری پروژه",
}: BlockArtProps) {
  const src = image || defaultImages[accent];
  return (
    <div className={`block-art image-art accent-${accent} ${compact ? "compact" : ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 700px) 100vw, 50vw"
        style={{ objectFit: "cover" }}
      />
      <span className="image-art-shade" />
    </div>
  );
}
