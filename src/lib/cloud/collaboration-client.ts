import type {
  CareSyncEvent,
  PetCollaborator,
  SitterViewData,
} from "@/lib/domain/collaboration";

export async function fetchCollaborators(
  petId: string,
  userId: string,
): Promise<PetCollaborator[]> {
  const res = await fetch(
    `/api/cloud/collaborators?petId=${encodeURIComponent(petId)}`,
    {
      headers: {
        "X-PetHub-User": userId,
      },
    },
  );
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errorJson.error || "Não foi possível carregar os colaboradores.",
    );
  }
  const json = (await res.json()) as { collaborators: PetCollaborator[] };
  return json.collaborators;
}

export async function inviteCollaborator(
  userId: string,
  input: {
    petId: string;
    petName: string;
    collaboratorEmail: string;
    collaboratorName: string;
    role: "co_tutor" | "cuidador";
  },
): Promise<PetCollaborator> {
  const res = await fetch("/api/cloud/collaborators", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PetHub-User": userId,
    },
    body: JSON.stringify({
      action: "invite",
      ...input,
    }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errorJson.error || "Não foi possível enviar o convite.");
  }
  const json = (await res.json()) as { collaborator: PetCollaborator };
  return json.collaborator;
}

export async function acceptInvite(
  userId: string,
  inviteCode: string,
): Promise<PetCollaborator> {
  const res = await fetch("/api/cloud/collaborators", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PetHub-User": userId,
    },
    body: JSON.stringify({
      action: "accept",
      inviteCode,
    }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errorJson.error || "Código de convite inválido ou expirado.",
    );
  }
  const json = (await res.json()) as { collaborator: PetCollaborator };
  return json.collaborator;
}

export async function removeCollaborator(
  userId: string,
  collaboratorId: string,
): Promise<boolean> {
  const res = await fetch("/api/cloud/collaborators", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-PetHub-User": userId,
    },
    body: JSON.stringify({
      action: "remove",
      collaboratorId,
    }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errorJson.error || "Não foi possível remover o colaborador.",
    );
  }
  return true;
}

export async function fetchCareSyncEvents(
  userId: string,
  petId: string,
  since?: string,
): Promise<CareSyncEvent[]> {
  const url = new URL("/api/cloud/care-sync", window.location.origin);
  url.searchParams.set("petId", petId);
  if (since) url.searchParams.set("since", since);

  const res = await fetch(url.toString(), {
    headers: {
      "X-PetHub-User": userId,
    },
  });
  if (!res.ok)
    throw new Error("Não foi possível atualizar os cuidados compartilhados.");
  const json = (await res.json()) as { events?: CareSyncEvent[] };
  return json.events ?? [];
}

export async function postCareSyncEvent(
  userId: string,
  input: {
    petId: string;
    actorName: string;
    eventType: "medication_dose";
    recordId: string;
    scheduleId: string;
    eventKey: string;
    status: "given" | "skipped" | "missed" | "unrecorded";
    payload: Record<string, unknown>;
  },
): Promise<CareSyncEvent | null> {
  const res = await fetch("/api/cloud/care-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PetHub-User": userId },
    body: JSON.stringify(input),
  });
  // Pets kept only on this device continue to work locally.
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(
      "Não foi possível confirmar a dose compartilhada. Tente novamente.",
    );
  return ((await res.json()) as { event: CareSyncEvent }).event;
}

export async function createSitterPassCloud(
  userId: string,
  input: {
    petId: string;
    passData: SitterViewData;
    pin?: string | null;
    expiresInDays?: number;
    sitterName?: string | null;
  },
): Promise<{ token: string; url: string; expiresAt: string }> {
  const res = await fetch("/api/cloud/sitter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PetHub-User": userId,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errorJson.error || "Não foi possível gerar o link de cuidador.",
    );
  }
  return res.json() as Promise<{
    token: string;
    url: string;
    expiresAt: string;
  }>;
}
