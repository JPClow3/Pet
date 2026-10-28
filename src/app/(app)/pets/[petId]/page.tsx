"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAppStore } from "@/lib/store/app-store";
import { Button, ButtonLink } from "@/components/ui/button";

export default function PetRedirectPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const setActivePet = useAppStore((state) => state.setActivePet);
  const pets = useAppStore((state) => state.pets);
  const targetId = params?.petId;
  const exists = pets.some((pet) => pet.id === targetId);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!targetId || !exists) {
      router.replace("/pets");
      return;
    }
    let current = true;
    void setActivePet(targetId)
      .then(() => {
        if (current) router.replace("/pets");
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível selecionar este pet. Tente novamente.",
          );
      });
    return () => {
      current = false;
    };
  }, [targetId, exists, router, setActivePet, attempt]);

  return (
    <div className="flex flex-col gap-3 py-6">
      {error ? (
        <>
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
          <Button
            onClick={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
          >
            Tentar selecionar novamente
          </Button>
          <ButtonLink href="/pets" variant="secondary">
            Voltar aos pets
          </ButtonLink>
        </>
      ) : (
        <p role="status" className="text-sm text-muted">
          Abrindo o perfil do pet…
        </p>
      )}
    </div>
  );
}
