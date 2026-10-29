import "server-only";
import { dbIso, setLocalRole, withPethubApi } from "./pethub-postgres";
import {
  createSitterPassToken,
  hashSitterPassToken,
  hashSitterPin,
  verifySitterPin,
  type CareSyncEvent,
  type PetCollaborator,
  type SitterViewData,
} from "@/lib/domain/collaboration";

const unavailable = "Cloud database not configured";

// ----------------- PET COLLABORATORS -----------------

export async function listPetCollaborators(
  userId: string,
  petId: string,
): Promise<PetCollaborator[]> {
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${userId}, true)`,
      await sql`select id, pet_id, pet_name, owner_user_id, collaborator_email, collaborator_user_id, collaborator_name, role, invite_code, status, created_at, accepted_at, updated_at
        from pethub.pet_collaborators
        where pet_id = ${petId} and (owner_user_id = ${userId} or collaborator_user_id = ${userId})
        order by created_at asc`,
    ];
  });
  const rows = result[2] as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    petId: String(r.pet_id),
    petName: String(r.pet_name),
    ownerUserId: String(r.owner_user_id),
    collaboratorEmail: String(r.collaborator_email),
    collaboratorUserId: r.collaborator_user_id
      ? String(r.collaborator_user_id)
      : null,
    collaboratorName: String(r.collaborator_name),
    role: r.role as "co_tutor" | "cuidador",
    inviteCode: String(r.invite_code),
    status: r.status as "pending" | "accepted" | "revoked",
    createdAt: dbIso(r.created_at),
    acceptedAt: r.accepted_at ? dbIso(r.accepted_at) : null,
    updatedAt: dbIso(r.updated_at),
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
  const inviteCode = `inv_${crypto.randomUUID().replace(/-/g, "")}`;
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${ownerUserId}, true)`,
      await sql`insert into pethub.pet_collaborators (
          owner_user_id, pet_id, pet_name, collaborator_email, collaborator_name, role, invite_code, status
        ) select ${ownerUserId}, ${params.petId}, pet->>'name', ${params.collaboratorEmail.toLowerCase().trim()},
          ${params.collaboratorName.trim()}, ${params.role}, ${inviteCode}, 'pending'
        from pethub.user_snapshots s, jsonb_array_elements(coalesce(s.snapshot->'pets', '[]'::jsonb)) pet
        where s.user_id = ${ownerUserId} and pet->>'id' = ${params.petId}
        returning *`,
    ];
  });
  const r = result[2][0] as Record<string, unknown>;
  if (!r)
    throw new Error(
      "Salve este pet na cópia da sua conta na nuvem antes de convidar um colaborador.",
    );
  return {
    id: String(r.id),
    petId: String(r.pet_id),
    petName: String(r.pet_name),
    ownerUserId: String(r.owner_user_id),
    collaboratorEmail: String(r.collaborator_email),
    collaboratorUserId: r.collaborator_user_id
      ? String(r.collaborator_user_id)
      : null,
    collaboratorName: String(r.collaborator_name),
    role: r.role as "co_tutor" | "cuidador",
    inviteCode: String(r.invite_code),
    status: r.status as "pending" | "accepted" | "revoked",
    createdAt: dbIso(r.created_at),
    acceptedAt: r.accepted_at ? dbIso(r.accepted_at) : null,
    updatedAt: dbIso(r.updated_at),
  };
}

export async function acceptCollaborationInvite(
  userId: string,
  userEmail: string,
  inviteCode: string,
): Promise<PetCollaborator | null> {
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${userId}, true)`,
      await sql`select set_config('app.user_email', ${userEmail.toLowerCase().trim()}, true)`,
      await sql`update pethub.pet_collaborators
        set status = 'accepted', collaborator_user_id = ${userId}, accepted_at = now(), updated_at = now()
        where invite_code = ${inviteCode.trim()} and status = 'pending'
          and collaborator_email = ${userEmail.toLowerCase().trim()} and owner_user_id <> ${userId}
        returning *`,
    ];
  });
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
    createdAt: dbIso(r.created_at),
    acceptedAt: dbIso(r.accepted_at),
    updatedAt: dbIso(r.updated_at),
  };
}

export async function removePetCollaborator(
  userId: string,
  collaboratorId: string,
): Promise<boolean> {
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${userId}, true)`,
      await sql`delete from pethub.pet_collaborators
        where id = ${collaboratorId}::uuid and (owner_user_id = ${userId} or collaborator_user_id = ${userId})
        returning id`,
    ];
  });
  return (result[2] as unknown[]).length > 0;
}

// ----------------- SHARED CARE EVENTS (ANTI-DOUBLE DOSING) -----------------

export async function resolveCareAccess(
  userId: string,
  petId: string,
  ownerUserId?: string,
) {
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${userId}, true)`,
      await sql`select owner_user_id, role from pethub.pet_collaborators
        where pet_id = ${petId} and collaborator_user_id = ${userId} and status = 'accepted'
          and (${ownerUserId ?? null}::text is null or owner_user_id = ${ownerUserId ?? null})
        union all
        select ${userId}, 'tutor' where pethub.owns_cloud_pet(${petId})
          and (exists (select 1 from pethub.pet_collaborators c
            where c.owner_user_id = ${userId} and c.pet_id = ${petId} and c.status in ('pending', 'accepted'))
            or exists (select 1 from pethub.pet_sitter_passes p
              where p.owner_user_id = ${userId} and p.pet_id = ${petId} and p.revoked_at is null and p.expires_at > now()))
          and (${ownerUserId ?? null}::text is null or ${userId} = ${ownerUserId ?? null})`,
    ];
  });
  const row = result[2][0];
  return row
    ? {
        ownerUserId: String(row.owner_user_id),
        actorRole: row.role as "tutor" | "co_tutor" | "cuidador",
      }
    : null;
}

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
    status:
      "given" | "skipped" | "missed" | "unrecorded" | "served" | "completed";
    payload?: Record<string, unknown>;
  },
): Promise<CareSyncEvent> {
  const payloadJson = JSON.stringify(event.payload ?? {});
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${userId}, true)`,
      await sql`insert into pethub.shared_care_events (
          pet_id, owner_user_id, actor_user_id, actor_name, actor_role,
          event_type, record_id, schedule_id, event_key, status, payload, occurred_at
        ) values (
          ${event.petId}, ${event.ownerUserId}, ${userId}, ${event.actorName}, ${event.actorRole},
          ${event.eventType}, ${event.recordId ?? null}, ${event.scheduleId ?? null},
          ${event.eventKey}, ${event.status}, ${payloadJson}::jsonb, now()
        ) on conflict (owner_user_id, pet_id, event_key) do update set
          actor_user_id = excluded.actor_user_id, actor_name = excluded.actor_name,
          actor_role = excluded.actor_role, status = excluded.status, payload = excluded.payload, occurred_at = now()
        where coalesce(shared_care_events.payload->>'eventId', 'shared-' || shared_care_events.id::text) = excluded.payload->>'correctsId'
        returning *`,
      await sql`select * from pethub.shared_care_events
        where owner_user_id = ${event.ownerUserId} and pet_id = ${event.petId} and event_key = ${event.eventKey}`,
    ];
  });
  const r = (result[2][0] ?? result[3][0]) as Record<string, unknown>;
  return {
    id: String(r.id),
    petId: String(r.pet_id),
    ownerUserId: String(r.owner_user_id),
    actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
    actorName: String(r.actor_name),
    actorRole: r.actor_role as "tutor" | "co_tutor" | "cuidador",
    eventType: r.event_type as
      "medication_dose" | "meal" | "care_note" | "walk",
    recordId: r.record_id ? String(r.record_id) : null,
    scheduleId: r.schedule_id ? String(r.schedule_id) : null,
    eventKey: String(r.event_key),
    status: r.status as "given" | "skipped" | "missed" | "served" | "completed",
    payload: (r.payload as Record<string, unknown>) ?? {},
    occurredAt: dbIso(r.occurred_at),
    createdAt: dbIso(r.created_at),
  };
}

export async function fetchRecentCareEvents(
  userId: string,
  petId: string,
  since?: string,
  ownerUserId?: string,
): Promise<CareSyncEvent[]> {
  const sinceDate = since
    ? new Date(since).toISOString()
    : new Date(Date.now() - 7 * 86400000).toISOString();
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${userId}, true)`,
      await sql`select id, pet_id, owner_user_id, actor_user_id, actor_name, actor_role, event_type, record_id, schedule_id, event_key, status, payload, occurred_at, created_at
        from pethub.shared_care_events
        where pet_id = ${petId} and occurred_at >= ${sinceDate}::timestamptz
          and (${ownerUserId ?? null}::text is null or owner_user_id = ${ownerUserId ?? null})
        order by occurred_at desc
        limit 1000`,
    ];
  });
  const rows = result[2] as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    petId: String(r.pet_id),
    ownerUserId: String(r.owner_user_id),
    actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
    actorName: String(r.actor_name),
    actorRole: r.actor_role as "tutor" | "co_tutor" | "cuidador",
    eventType: r.event_type as
      "medication_dose" | "meal" | "care_note" | "walk",
    recordId: r.record_id ? String(r.record_id) : null,
    scheduleId: r.schedule_id ? String(r.schedule_id) : null,
    eventKey: String(r.event_key),
    status: r.status as "given" | "skipped" | "missed" | "served" | "completed",
    payload: (r.payload as Record<string, unknown>) ?? {},
    occurredAt: dbIso(r.occurred_at),
    createdAt: dbIso(r.created_at),
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
  const token = createSitterPassToken();
  const tokenHash = await hashSitterPassToken(token);
  const pinHash = options.pin ? await hashSitterPin(options.pin) : null;
  const days =
    options.expiresInDays && options.expiresInDays > 0
      ? options.expiresInDays
      : 7;
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const passJson = JSON.stringify(passData);

  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_app");
    return [
      [],
      await sql`select set_config('app.user_id', ${ownerUserId}, true)`,
      await sql`insert into pethub.pet_sitter_passes (
          owner_user_id, pet_id, token_hash, pin_hash, sitter_name, pass_data, expires_at
        ) select ${ownerUserId}, ${petId}, ${tokenHash}, ${pinHash}, ${options.sitterName ?? null}, ${passJson}::jsonb, ${expiresAt}::timestamptz
        where pethub.owns_cloud_pet(${petId})
        on conflict (owner_user_id, pet_id) do update set
          token_hash = ${tokenHash},
          pin_hash = ${pinHash},
          sitter_name = ${options.sitterName ?? null},
          pass_data = ${passJson}::jsonb,
          expires_at = ${expiresAt}::timestamptz,
          revoked_at = null,
          pin_attempt_count = 0,
          pin_window_started_at = now(),
          updated_at = now()
        returning id, expires_at`,
    ];
  });
  const row = result[2][0] as Record<string, unknown>;
  if (!row)
    throw new Error(
      "Salve este pet na cópia da sua conta na nuvem antes de criar o link de cuidador.",
    );
  return {
    passId: String(row.id),
    token,
    expiresAt: dbIso(row.expires_at),
  };
}

export async function readSitterPassByToken(token: string): Promise<{
  petId: string | null;
  hasPin: boolean;
  sitterName: string | null;
  expiresAt: string;
  data: SitterViewData | null;
} | null> {
  const tokenHash = await hashSitterPassToken(token);
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    return [
      [],
      await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
      await sql`select id, pet_id, pin_hash, sitter_name, pass_data, expires_at
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`,
    ];
  });
  const row = result[2]?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  const hasPin = Boolean(row.pin_hash);
  // If pass has PIN, we omit sensitive care routines until PIN verification
  const data = hasPin ? null : (row.pass_data as SitterViewData);

  return {
    petId: hasPin ? null : String(row.pet_id),
    hasPin,
    sitterName: row.sitter_name ? String(row.sitter_name) : null,
    expiresAt: dbIso(row.expires_at),
    data,
  };
}

export class SitterAccessError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function authorizeSitterPass(token: string, pin?: string) {
  const tokenHash = await hashSitterPassToken(token);
  const result = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    return [
      [],
      await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
      await sql`select pin_hash, pass_data, pet_id, owner_user_id
        from pethub.pet_sitter_passes
        where token_hash = ${tokenHash} and revoked_at is null and expires_at > now()`,
    ];
  });
  const row = result[2]?.[0] as Record<string, unknown> | undefined;
  if (!row)
    throw new SitterAccessError(
      "Acesso de cuidador expirado ou revogado.",
      404,
    );

  const expectedHash = row.pin_hash ? String(row.pin_hash) : null;
  if (!expectedHash) return row;
  if (!pin)
    throw new SitterAccessError("Informe o PIN para registrar o cuidado.", 401);

  // Reserve before hashing. UPDATE serializes simultaneous requests across workers.
  const reserved = await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    return [
      [],
      await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
      await sql`update pethub.pet_sitter_passes set
        pin_attempt_count = case when pin_window_started_at <= now() - interval '15 minutes' then 1 else pin_attempt_count + 1 end,
        pin_window_started_at = case when pin_window_started_at <= now() - interval '15 minutes' then now() else pin_window_started_at end
        where token_hash = ${tokenHash} and pin_hash = ${expectedHash}
          and revoked_at is null and expires_at > now()
          and (pin_attempt_count < 5 or pin_window_started_at <= now() - interval '15 minutes')
        returning id`,
      await sql`select greatest(1, ceil(extract(epoch from (pin_window_started_at + interval '15 minutes' - now()))))::integer as retry_after
        from pethub.pet_sitter_passes where token_hash = ${tokenHash}`,
    ];
  });
  if (!reserved[2].length) {
    throw new SitterAccessError(
      "Muitas tentativas de PIN. Aguarde para tentar novamente.",
      429,
      Number(reserved[3][0]?.retry_after ?? 900),
    );
  }

  const isValid = await verifySitterPin(pin, expectedHash);
  if (!isValid)
    throw new SitterAccessError("PIN incorreto. Tente novamente.", 401);
  await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    return [
      [],
      await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
      await sql`update pethub.pet_sitter_passes set pin_attempt_count = 0, pin_window_started_at = now()
        where token_hash = ${tokenHash} and pin_hash = ${expectedHash} and revoked_at is null and expires_at > now()`,
    ];
  });
  return row;
}

export async function verifySitterPassPinAndRead(token: string, pin: string) {
  const pass = await authorizeSitterPass(token, pin);
  return { verified: true, data: pass.pass_data as SitterViewData };
}

export async function recordSitterCareAction(
  token: string,
  event: {
    eventType: "medication_dose" | "meal";
    eventKey: string;
    status: "given" | "served";
    actorName: string;
    payload?: Record<string, unknown>;
    pin?: string;
  },
): Promise<boolean> {
  const tokenHash = await hashSitterPassToken(token);
  const payloadJson = JSON.stringify(event.payload ?? {});
  const pass = await authorizeSitterPass(token, event.pin);

  await withPethubApi(unavailable, async (sql) => {
    await setLocalRole(sql, "pethub_card_reader");
    return [
      [],
      await sql`select set_config('app.sitter_pass_hash', ${tokenHash}, true)`,
      await sql`select set_config('app.sitter_verified_pin_hash', ${String(pass.pin_hash ?? "")}, true)`,
      await sql`insert into pethub.shared_care_events (
          pet_id, owner_user_id, actor_name, actor_role, event_type, record_id, schedule_id, event_key, status, payload, occurred_at
        ) values (
          ${String(pass.pet_id)}, ${String(pass.owner_user_id)}, ${event.actorName.trim()}, 'cuidador',
          ${event.eventType}, ${typeof event.payload?.recordId === "string" ? event.payload.recordId : null},
          ${typeof event.payload?.scheduleId === "string" ? event.payload.scheduleId : null},
          ${event.eventKey}, ${event.status}, ${payloadJson}::jsonb, now()
        ) on conflict (owner_user_id, pet_id, event_key) do nothing`,
    ];
  });
  return true;
}
