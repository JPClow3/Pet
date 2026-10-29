import "server-only";
import {
  createSitterPassToken,
  hashSitterPassToken,
  hashSitterPin,
  verifySitterPin,
  type CareSyncEvent,
  type PetCollaborator,
  type SitterViewData,
} from "@/lib/domain/collaboration";
import { dbIso, setLocalRole, withPethubApi } from "./pethub-postgres";

const unavailable = "Cloud database not configured";

function collaborator(row: Record<string, unknown>): PetCollaborator {
  return {
    id: String(row.id),
    petId: String(row.pet_id),
    petName: String(row.pet_name),
    ownerUserId: String(row.owner_user_id),
    collaboratorEmail: String(row.collaborator_email),
    collaboratorUserId: row.collaborator_user_id
      ? String(row.collaborator_user_id)
      : null,
    collaboratorName: String(row.collaborator_name),
    role: row.role as "co_tutor" | "cuidador",
    inviteCode: String(row.invite_code),
    status: row.status as "pending" | "accepted" | "revoked",
    createdAt: dbIso(row.created_at),
    acceptedAt: row.accepted_at ? dbIso(row.accepted_at) : null,
    updatedAt: dbIso(row.updated_at),
  };
}

function careEvent(row: Record<string, unknown>): CareSyncEvent {
  return {
    id: String(row.id),
    petId: String(row.pet_id),
    ownerUserId: String(row.owner_user_id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    actorName: String(row.actor_name),
    actorRole: row.actor_role as "tutor" | "co_tutor" | "cuidador",
    eventType: row.event_type as "medication_dose" | "meal" | "care_note" | "walk",
    recordId: row.record_id ? String(row.record_id) : null,
    scheduleId: row.schedule_id ? String(row.schedule_id) : null,
    eventKey: String(row.event_key),
    status: row.status as "given" | "skipped" | "missed" | "served" | "completed",
    payload: (row.payload as Record<string, unknown>) ?? {},
    occurredAt: dbIso(row.occurred_at),
    createdAt: dbIso(row.created_at),
  };
}

// ----------------- PET COLLABORATORS -----------------

export async function listPetCollaborators(
  userId: string,
  petId: string,
): Promise<PetCollaborator[]> {
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${userId}, true)`;
    return await sql`select id, pet_id, pet_name, owner_user_id, collaborator_email, collaborator_user_id, collaborator_name, role, invite_code, status, created_at, accepted_at, updated_at
        from pethub.pet_collaborators
        where pet_id = ${petId} and (owner_user_id = ${userId} or collaborator_user_id = ${userId})
        order by created_at asc`;
  });
  return rows.map((row) => collaborator(row as Record<string, unknown>));
}

export async function invitePetCollaborator(
  ownerUserId: string,
  params: {
    petId: string;
    petName: string;
    collaboratorEmail: string;
    collaboratorName: string;
    role: "co_tutor" | "cuidador";
  },
): Promise<PetCollaborator> {
  const inviteCode = `inv_${crypto.randomUUID().replace(/-/g, "")}`;
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${ownerUserId}, true)`;
    return await sql`insert into pethub.pet_collaborators (
          owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, role, invite_code, status
        ) values (
          ${ownerUserId}, ${params.petId}, ${params.petName}, ${params.collaboratorEmail.toLowerCase().trim()},
          ${params.collaboratorName.trim()}, ${params.role}, ${inviteCode}, 'pending'
        ) returning *`;
  });
  return collaborator(rows[0] as Record<string, unknown>);
}

export async function acceptCollaborationInvite(
  userId: string,
  userEmail: string,
  inviteCode: string,
): Promise<PetCollaborator | null> {
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${userId}, true)`;
    await sql`select set_config('app.user_email', ${userEmail.toLowerCase().trim()}, true)`;
    return await sql`update pethub.pet_collaborators
        set status = 'accepted', collaborator_user_id = ${userId}, accepted_at = now(), updated_at = now()
        where invite_code = ${inviteCode.trim()} and status = 'pending'
        returning *`;
  });
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...collaborator(row), status: "accepted" };
}

export async function removePetCollaborator(
  userId: string,
  collaboratorId: string,
): Promise<boolean> {
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${userId}, true)`;
    return await sql`delete from pethub.pet_collaborators
        where id = ${collaboratorId}::uuid and (owner_user_id = ${userId} or collaborator_user_id = ${userId})
        returning id`;
  });
  return rows.length > 0;
}

// ----------------- SHARED CARE EVENTS (ANTI-DOUBLE DOSING) -----------------

export async function logSharedCareEvent(
  userId: string,
  event: {
    petId: string;
    ownerUserId: string;
    actorName: string;
    actorRole: "tutor" | "co_tutor" | "cuidador";
    eventType: "medication_dose" | "meal" | "care_note" | "walk";
    recordId?: string | null;
    scheduleId?: string | null;
    eventKey: string;
    status: "given" | "skipped" | "missed" | "served" | "completed";
    payload?: Record<string, unknown>;
  },
): Promise<CareSyncEvent> {
  const payloadJson = JSON.stringify(event.payload ?? {});
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${userId}, true)`;
    return await sql`insert into pethub.shared_care_events (
          pet_id, owner_user_id, actor_user_id, actor_name, actor_role,
          event_type, record_id, schedule_id, event_key, status, payload, occurred_at
        ) values (
          ${event.petId}, ${event.ownerUserId}, ${userId}, ${event.actorName}, ${event.actorRole},
          ${event.eventType}, ${event.recordId ?? null}, ${event.scheduleId ?? null},
          ${event.eventKey}, ${event.status}, ${payloadJson}::jsonb, now()
        ) returning *`;
  });
  return careEvent(rows[0] as Record<string, unknown>);
}

export async function fetchRecentCareEvents(
  userId: string,
  petId: string,
  since?: string,
): Promise<CareSyncEvent[]> {
  const sinceDate = since
    ? new Date(since).toISOString()
    : new Date(Date.now() - 7 * 86400000).toISOString();
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${userId}, true)`;
    return await sql`select id, pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, record_id, schedule_id, event_key, status, payload, occurred_at, created_at
        from pethub.shared_care_events
        where pet_id = ${petId} and occurred_at >= ${sinceDate}::timestamptz
        order by occurred_at desc
        limit 50`;
  });
  return rows.map((row) => careEvent(row as Record<string, unknown>));
}

// ----------------- PET SITTER PASSES -----------------

export async function saveSitterPass(
  ownerUserId: string,
  petId: string,
  passData: SitterViewData,
  options: {
    pin?: string | null;
    expiresInDays?: number;
    sitterName?: string | null;
  },
): Promise<{ passId: string; token: string; expiresAt: string }> {
  const token = createSitterPassToken();
  const tokenHash = await hashSitterPassToken(token);
  const pinHash = options.pin ? await hashSitterPin(options.pin) : null;
  const days =
    options.expiresInDays && options.expiresInDays > 0
      ? options.expiresInDays
      : 7;
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const passJson = JSON.stringify(passData);

  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    await sql`select set_config('app.user_id', ${ownerUserId}, true)`;
    return await sql`insert into pethub.pet_sitter_passes (
          owner_user_id, pet_id, token_hash, pin_hash, sitter_name, pass_data, expires_at
        ) values (
          ${ownerUserId}, ${petId}, ${tokenHash}, ${pinHash}, ${options.sitterName ?? null}, ${passJson}::jsonb, ${expiresAt}::timestamptz
        )
        on conflict (owner_user_id, pet_id) do update set
          token_hash = ${tokenHash},
          pin_hash = ${pinHash},
          sitter_name = ${options.sitterName ?? null},
          pass_data = ${passJson}::jsonb,
          expires_at = ${expiresAt}::timestamptz,
          revoked_at = null,
          updated_at = now()
        returning id, expires_at`;
  });
  const row = rows[0] as Record<string, unknown>;
  return {
    passId: String(row.id),
    token,
    expiresAt: dbIso(row.expires_at),
  };
}

export async function readSitterPassByToken(token: string): Promise<{
  petId: string;
  hasPin: boolean;
  sitterName: string | null;
  expiresAt: string;
  data: SitterViewData | null;
} | null> {
  const tokenHash = await hashSitterPassToken(token);
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`;
    return await sql`select id, pet_id, pin_hash, sitter_name, pass_data, expires_at
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`;
  });
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  const hasPin = Boolean(row.pin_hash);
  // If pass has PIN, we omit sensitive care routines until PIN verification
  const data = hasPin ? null : (row.pass_data as SitterViewData);

  return {
    petId: String(row.pet_id),
    hasPin,
    sitterName: row.sitter_name ? String(row.sitter_name) : null,
    expiresAt: dbIso(row.expires_at),
    data,
  };
}

export async function verifySitterPassPinAndRead(
  token: string,
  pin: string,
): Promise<{
  verified: boolean;
  data: SitterViewData | null;
}> {
  const tokenHash = await hashSitterPassToken(token);
  const rows = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`;
    return await sql`select pin_hash, pass_data
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`;
  });
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return { verified: false, data: null };

  const expectedHash = row.pin_hash ? String(row.pin_hash) : null;
  if (!expectedHash) {
    return { verified: true, data: row.pass_data as SitterViewData };
  }

  const isValid = await verifySitterPin(pin, expectedHash);
  if (!isValid) return { verified: false, data: null };

  return { verified: true, data: row.pass_data as SitterViewData };
}

export async function recordSitterCareAction(
  token: string,
  event: {
    eventType: "medication_dose" | "meal";
    eventKey: string;
    status: "given" | "served";
    actorName: string;
    payload?: Record<string, unknown>;
  },
): Promise<boolean> {
  const tokenHash = await hashSitterPassToken(token);
  const payloadJson = JSON.stringify(event.payload ?? {});
  const passes = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`;
    return await sql`select id, pet_id, owner_user_id
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`;
  });
  const pass = passes[0] as Record<string, unknown> | undefined;
  if (!pass) return false;

  await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`;
    await sql`insert into pethub.shared_care_events (
          pet_id, owner_user_id, actor_name, actor_role, event_type, event_key, status, payload, occurred_at
        ) values (
          ${String(pass.pet_id)}, ${String(pass.owner_user_id)}, ${event.actorName.trim()}, 'cuidador',
          ${event.eventType}, ${event.eventKey}, ${event.status}, ${payloadJson}::jsonb, now()
        )`;
  });
  return true;
}
