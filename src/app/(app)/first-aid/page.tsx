"use client";

import { FirstAidGuide } from "@/components/first-aid-guide";
import { PageHeader } from "@/components/page-header";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store/app-store";
import { useActivePet, useHydrated } from "@/lib/store/hooks";

export default function FirstAidPage() {
  const ready = useHydrated();
  const activePet = useActivePet();
  const places = useAppStore((state) => state.places);

  if (!ready) return <SkeletonScreen label="Carregando primeiros socorros" />;

  return (
    <div className="flex flex-col pb-10">
      <PageHeader
        title="Primeiros socorros"
        subtitle="Busque um alimento, substância ou sintoma."
        backHref="/"
      />
      <FirstAidGuide activePet={activePet} places={places} />
    </div>
  );
}
