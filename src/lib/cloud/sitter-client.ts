import type { SitterViewData } from "@/lib/domain/collaboration";

export type SitterPassResponse = {
  petId: string | null;
  hasPin: boolean;
  sitterName: string | null;
  expiresAt: string;
  data: SitterViewData | null;
};

export async function fetchSitterPass(
  token: string,
): Promise<SitterPassResponse> {
  const res = await fetch(`/api/cloud/sitter/${token}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      errorJson.error || "Não foi possível carregar os dados do cuidador.",
    );
  }
  return res.json() as Promise<SitterPassResponse>;
}

export async function verifySitterPassPin(
  token: string,
  pin: string,
): Promise<SitterViewData> {
  const res = await fetch(`/api/cloud/sitter/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "verify_pin",
      pin,
    }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errorJson.error || "PIN incorreto. Tente novamente.");
  }
  const json = (await res.json()) as { data: SitterViewData };
  return json.data;
}

export async function recordSitterCareAction(
  token: string,
  input: {
    eventType: "medication_dose" | "meal";
    eventKey: string;
    status: "given" | "served";
    actorName: string;
    payload?: Record<string, unknown>;
    pin?: string;
  },
): Promise<boolean> {
  const res = await fetch(`/api/cloud/sitter/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "record_care",
      ...input,
    }),
  });
  if (!res.ok) {
    const errorJson = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errorJson.error || "Não foi possível registrar o cuidado.");
  }
  return true;
}
