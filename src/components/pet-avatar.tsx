import { Cat, Dog, PawPrint } from "lucide-react";

import { Photo } from "@/components/ui/photo";
import { healthStatus } from "@/lib/domain/health";
import type { Pet, Species } from "@/lib/domain/schema";
import type { HealthRecord } from "@/lib/domain/schema";
import { cn } from "@/lib/utils";

const speciesIcon: Record<Species, typeof PawPrint> = {
  cao: Dog,
  gato: Cat,
  outro: PawPrint,
};

export function PetAvatar({
  pet,
  size = "md",
  className,
}: {
  pet: Pick<Pet, "name" | "photo" | "species">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const Icon = speciesIcon[pet.species];
  const sizeClasses = {
    sm: "size-9 text-meta",
    md: "size-12",
    lg: "size-24",
  }[size];
  const iconClasses = { sm: "size-4", md: "size-5", lg: "size-9" }[size];

  if (pet.photo) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full border border-line bg-surface",
          sizeClasses,
          className,
        )}
      >
        <Photo
          src={pet.photo}
          alt={`Foto de ${pet.name}`}
          className="size-full"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-mint text-teal-ink",
        sizeClasses,
        className,
      )}
    >
      <Icon className={iconClasses} />
    </span>
  );
}

/**
 * A quiet, segmented status ring for the active pet.
 *
 * The ring communicates schedule attention only. The adjacent copy owned by
 * the caller must carry the meaning so that colour never becomes the sole
 * status signal (and so the component remains useful with forced colours).
 */
export function CareHalo({
  pet,
  records = [],
  size = "lg",
  label,
  className,
}: {
  pet: Pick<Pet, "name" | "photo" | "species">;
  records?: HealthRecord[];
  size?: "md" | "lg";
  label?: string;
  className?: string;
}) {
  const status = healthStatus(records);
  const segments =
    status.state === "vencido" ? 4 : status.state === "atencao" ? 3 : 1;
  const ringColor =
    status.state === "vencido"
      ? "#B42318"
      : status.state === "atencao"
        ? "#8A5A00"
        : status.state === "em_dia"
          ? "#0B6B5D"
          : "#D8E2DE";
  const haloSize = size === "lg" ? "size-[6.75rem]" : "size-[4.25rem]";
  const avatarSize = size === "lg" ? "lg" : "md";
  const gap = size === "lg" ? "p-1.5" : "p-1";
  const segmentSize = 360 / 12;
  const filledEnd = Math.max(segmentSize, segments * 30 - 5);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        haloSize,
        className,
      )}
      aria-label={label}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from -90deg, ${ringColor} 0deg ${filledEnd}deg, transparent ${filledEnd}deg 360deg)`,
          mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
        }}
      />
      <span className={cn("relative rounded-full bg-canvas", gap)}>
        <PetAvatar pet={pet} size={avatarSize} />
      </span>
    </span>
  );
}

export function PetInitials({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full bg-mint text-[0.8rem] font-semibold text-teal-ink",
        className,
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
