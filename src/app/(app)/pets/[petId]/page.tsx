"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAppStore } from "@/lib/store/app-store";

export default function PetRedirectPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const setActivePet = useAppStore((state) => state.setActivePet);
  const pets = useAppStore((state) => state.pets);

  useEffect(() => {
    if (params?.petId && pets.some((p) => p.id === params.petId)) {
      setActivePet(params.petId);
    }
    router.replace("/pets");
  }, [params?.petId, pets, router, setActivePet]);

  return null;
}
