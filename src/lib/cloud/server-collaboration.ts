import "server-only";
import { neon } from "@neondatabase/serverless";
import {
  createSitterPassToken,
  hashSitterPassToken,
  hashSitterPin,
  verifySitterPin,
  type CareSyncEvent,
  type PetCollaborator,
  type SitterViewData,
} from "@/lib/domain/collaboration";

function database() {
  if (!process.env.DATABASE_URL) throw new Error("Cloud database not configured");
  return neon(process.env.DATABASE_URL, {
    fetchOptions: { cache: "no-store" },
  });
}

// ----------------- PET COLLABORATORS -----------------

export async function listPetCollaborators(
  userId: string,
  petId: string,
): Promise<PetCollaborator[]> {
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`select id, pet_id, pet_name, owner_user_id, collaborator_email, collaborator_user_id, collaborator_name, role, invite_code, status, created_at, accepted_at, updated_at
        from pethub.pet_collaborators
        where pet_id = ${petId} and (owner_user_id = ${userId} or collaborator_user_id = ${userId})
        order by created_at asc`,
  ]);
  const rows = result[2] as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    petId: String(r.pet_id),
    petName: String(r.pet_name),
    ownerUserId: String(r.owner_user_id),
    collaboratorEmail: String(r.collaborator_email),
    collaboratorUserId: r.collaborator_user_id ? String(r.collaborator_user_id) : null,
    collaboratorName: String(r.collaborator_name),
    role: r.role as "co_tutor" | "cuidador",
    inviteCode: String(r.invite_code),
    status: r.status as "pending" | "accepted" | "revoked",
    createdAt: new Date(String(r.created_at)).toISOString(),
    acceptedAt: r.accepted_at ? new Date(String(r.accepted_at)).toISOString() : null,
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  }));
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
  const sql = database();
  const inviteCode = `inv_${crypto.randomUUID().replace(/-/g, "")}`;
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${ownerUserId}, true)`,
    sql`insert into pethub.pet_collaborators (
          owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, role, invite_code, status
        ) values (
          ${ownerUserId}, ${params.petId}, ${params.petName}, ${params.collaboratorEmail.toLowerCase().trim()},
          ${params.collaboratorName.trim()}, ${params.role}, ${inviteCode}, 'pending'
        ) returning *`,
  ]);
  const r = result[2][0] as Record<string, unknown>;
  return {
    id: String(r.id),
    petId: String(r.pet_id),
    petName: String(r.pet_name),
    ownerUserId: String(r.owner_user_id),
    collaboratorEmail: String(r.collaborator_email),
    collaboratorUserId: r.collaborator_user_id ? String(r.collaborator_user_id) : null,
    collaboratorName: String(r.collaborator_name),
    role: r.role as "co_tutor" | "cuidador",
    inviteCode: String(r.invite_code),
    status: r.status as "pending" | "accepted" | "revoked",
    createdAt: new Date(String(r.created_at)).toISOString(),
    acceptedAt: r.accepted_at ? new Date(String(r.accepted_at)).toISOString() : null,
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  };
}

export async function acceptCollaborationInvite(
  userId: string,
  userEmail: string,
  inviteCode: string,
): Promise<PetCollaborator | null> {
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`select set_config('app.user_email', ${userEmail.toLowerCase().trim()}, true)`,
    sql`update pethub.pet_collaborators
        set status = 'accepted', collaborator_user_id = ${userId}, accepted_at = now(), updated_at = now()
        where invite_code = ${inviteCode.trim()} and status = 'pending'
        returning *`,
  ]);
  const r = result[3]?.[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    id: String(r.id),
    petId: String(r.pet_id),
    petName: String(r.pet_name),
    ownerUserId: String(r.owner_user_id),
    collaboratorEmail: String(r.collaborator_email),
    collaboratorUserId: String(r.collaborator_user_id),
    collaboratorName: String(r.collaborator_name),
    role: r.role as "co_tutor" | "cuidador",
    inviteCode: String(r.invite_code),
    status: "accepted",
    createdAt: new Date(String(r.created_at)).toISOString(),
    acceptedAt: new Date(String(r.accepted_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  };
}

export async function removePetCollaborator(
  userId: string,
  collaboratorId: string,
): Promise<boolean> {
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`delete from pethub.pet_collaborators
        where id = ${collaboratorId}::uuid and (owner_user_id = ${userId} or collaborator_user_id = ${userId})
        returning id`,
  ]);
  return (result[2] as unknown[]).length > 0;
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
  const sql = database();
  const payloadJson = JSON.stringify(event.payload ?? {});
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`insert into pethub.shared_care_events (
          pet_id, owner_user_id, actor_user_id, actor_name, actor_role,
          event_type, record_id, schedule_id, event_key, status, payload, occurred_at
        ) values (
          ${event.petId}, ${event.ownerUserId}, ${userId}, ${event.actorName}, ${event.actorRole},
          ${event.eventType}, ${event.recordId ?? null}, ${event.scheduleId ?? null},
          ${event.eventKey}, ${event.status}, ${payloadJson}::jsonb, now()
        ) returning *`,
  ]);
  const r = result[2][0] as Record<string, unknown>;
  return {
    id: String(r.id),
    petId: String(r.pet_id),
    ownerUserId: String(r.owner_user_id),
    actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
    actorName: String(r.actor_name),
    actorRole: r.actor_role as "tutor" | "co_tutor" | "cuidador",
    eventType: r.event_type as "medication_dose" | "meal" | "care_note" | "walk",
    recordId: r.record_id ? String(r.record_id) : null,
    scheduleId: r.schedule_id ? String(r.schedule_id) : null,
    eventKey: String(r.event_key),
    status: r.status as "given" | "skipped" | "missed" | "served" | "completed",
    payload: (r.payload as Record<string, unknown>) ?? {},
    occurredAt: new Date(String(r.occurred_at)).toISOString(),
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

export async function fetchRecentCareEvents(
  userId: string,
  petId: string,
  since?: string,
): Promise<CareSyncEvent[]> {
  const sql = database();
  const sinceDate = since ? new Date(since).toISOString() : new Date(Date.now() - 7 * 86400000).toISOString();
  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${userId}, true)`,
    sql`select id, pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, record_id, schedule_id, event_key, status, payload, occurred_at, created_at
        from pethub.shared_care_events
        where pet_id = ${petId} and occurred_at >= ${sinceDate}::timestamptz
        order by occurred_at desc
        limit 50`,
  ]);
  const rows = result[2] as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    petId: String(r.pet_id),
    ownerUserId: String(r.owner_user_id),
    actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
    actorName: String(r.actor_name),
    actorRole: r.actor_role as "tutor" | "co_tutor" | "cuidador",
    eventType: r.event_type as "medication_dose" | "meal" | "care_note" | "walk",
    recordId: r.record_id ? String(r.record_id) : null,
    scheduleId: r.schedule_id ? String(r.schedule_id) : null,
    eventKey: String(r.event_key),
    status: r.status as "given" | "skipped" | "missed" | "served" | "completed",
    payload: (r.payload as Record<string, unknown>) ?? {},
    occurredAt: new Date(String(r.occurred_at)).toISOString(),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
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
  const sql = database();
  const token = createSitterPassToken();
  const tokenHash = await hashSitterPassToken(token);
  const pinHash = options.pin ? await hashSitterPin(options.pin) : null;
  const days = options.expiresInDays && options.expiresInDays > 0 ? options.expiresInDays : 7;
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const passJson = JSON.stringify(passData);

  const result = await sql.transaction([
    sql`set local role pethub_app`,
    sql`select set_config('app.user_id', ${ownerUserId}, true)`,
    sql`insert into pethub.pet_sitter_passes (
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
        returning id, expires_at`,
  ]);
  const row = result[2][0] as Record<string, unknown>;
  return {
    passId: String(row.id),
    token,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
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
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_card_reader`,
    sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
    sql`select id, pet_id, pin_hash, sitter_name, pass_data, expires_at
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`,
  ]);
  const row = result[2]?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  const hasPin = Boolean(row.pin_hash);
  // If pass has PIN, we omit sensitive care routines until PIN verification
  const data = hasPin ? null : (row.pass_data as SitterViewData);

  return {
    petId: String(row.pet_id),
    hasPin,
    sitterName: row.sitter_name ? String(row.sitter_name) : null,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
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
  const sql = database();
  const result = await sql.transaction([
    sql`set local role pethub_card_reader`,
    sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
    sql`select pin_hash, pass_data
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`,
  ]);
  const row = result[2]?.[0] as Record<string, unknown> | undefined;
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
  const sql = database();
  const payloadJson = JSON.stringify(event.payload ?? {});

  const result = await sql.transaction([
    sql`set local role pethub_card_reader`,
    sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
    sql`select id, pet_id, owner_user_id
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`,
  ]);
  const pass = result[2]?.[0] as Record<string, unknown> | undefined;
  if (!pass) return false;

  await sql.transaction([
    sql`set local role pethub_card_reader`,
    sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
    sql`insert into pethub.shared_care_events (
          pet_id, owner_user_id, actor_name, actor_role, event_type, event_key, status, payload, occurred_at
        ) values (
          ${String(pass.pet_id)}, ${String(pass.owner_user_id)}, ${event.actorName.trim()}, 'cuidador',
          ${event.eventType}, ${event.eventKey}, ${event.status}, ${payloadJson}::jsonb, now()
        )`,
  ]);
  return true;
}
