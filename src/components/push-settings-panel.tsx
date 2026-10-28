"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CheckboxRow, Field, Input } from "@/components/ui/field";
import { getCloudClient } from "@/lib/cloud/client";
import { useCurrentTime } from "@/lib/use-current-time";
import {
  defaultPushPreferences,
  pushPreferencesSchema,
  type PushPreferences,
} from "@/lib/push/schema";
import {
  disconnectPushForAccount,
  emptyPushBinding,
  enablePush,
  getPushBinding,
  pushSupported,
  readPushStatus,
  savePushPreferences,
  subscribePushBinding,
  syncPushAgenda,
  type PushStatus,
} from "@/lib/push/client";

export function PushSettingsPanel() {
  const now = useCurrentTime();
  const { data: session, isPending } = getCloudClient().useSession();
  const user = session?.user;
  const binding = useSyncExternalStore(
    subscribePushBinding,
    getPushBinding,
    emptyPushBinding,
  );
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [consent, setConsent] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences>(
    () =>
      binding?.preferences ??
      defaultPushPreferences(Intl.DateTimeFormat().resolvedOptions().timeZone),
  );
  const [support, setSupport] = useState<boolean | null>(null);
  const own = binding?.ownerId === user?.id ? binding : null;
  useEffect(() => {
    let current = true;
    void Promise.resolve().then(() => {
      if (current) setSupport(pushSupported());
    });
    if (user?.emailVerified)
      void readPushStatus(user.id).then(
        (value) => {
          if (current) {
            setStatus(value);
            setError("");
          }
        },
        () => {
          if (current)
            setError(
              "Não foi possível consultar a agenda remota. Confira a conexão e tente novamente.",
            );
        },
      );
    return () => {
      current = false;
    };
  }, [user?.id, user?.emailVerified]);
  const update = <K extends keyof PushPreferences>(
    key: K,
    value: PushPreferences[K],
  ) => setPreferences((current) => ({ ...current, [key]: value }));
  async function run(action: () => Promise<unknown>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      if (user?.emailVerified) setStatus(await readPushStatus(user.id));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar os avisos.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const active = own?.consented && !own.revocationPending;
  const serverDevice = status?.devices.find(
    (device) => device.installationId === own?.installationId,
  );
  return (
    <Card className="flex flex-col gap-4" aria-labelledby="push-title">
      <CardTitle id="push-title" className="flex items-center gap-2">
        <Bell aria-hidden="true" className="size-4" />
        Avisos com o app fechado
      </CardTitle>
      <p className="text-sm text-muted">
        Opcional por aparelho, para prevenção e rotina. São avisos de melhor
        esforço: rede, bateria e ajustes do sistema podem atrasar ou impedir a
        entrega. Não substituem alarmes ou orientação veterinária.
      </p>
      <p className="text-meta text-muted">
        Desativar cancela novos envios. Um aviso já aceito pelo serviço pode
        chegar depois do cancelamento.
      </p>
      {isPending ? (
        <p role="status">Verificando a conta…</p>
      ) : !user?.emailVerified ? (
        <>
          <p className="text-sm text-muted">
            Entre em uma conta com e-mail confirmado para preparar avisos. O
            cuidado local continua disponível.
          </p>
          <ButtonLink href="/account" variant="secondary">
            Conta e confirmação de e-mail
          </ButtonLink>
        </>
      ) : (
        <>
          {support === false ? (
            <p className="text-sm text-muted">
              Este navegador não oferece avisos web. No iPhone ou iPad, adicione
              a Zelupi à Tela de Início e abra o app instalado.
            </p>
          ) : null}
          {status && !status.configuration.enabled ? (
            <p className="text-sm text-muted">
              A entrega ainda não está configurada nesta instalação.
            </p>
          ) : null}
          <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
            <legend className="sr-only">
              Preferências de avisos deste aparelho
            </legend>
            <CheckboxRow
              id="push-prevention"
              label="Prevenção"
              description="Datas de vacinas e cuidados"
              checked={preferences.prevention}
              onChange={(v) => update("prevention", v)}
            />
            <CheckboxRow
              id="push-routine"
              label="Rotina e horários do plano"
              description="O aviso nunca confirma ou recomenda uma dose"
              checked={preferences.routine}
              onChange={(v) => update("routine", v)}
            />
            <Field
              label="Fuso dos avisos gerais"
              htmlFor="push-zone"
              hint="Os horários de medicação mantêm o fuso do plano"
            >
              <Input
                id="push-zone"
                value={preferences.timeZone}
                onChange={(e) => update("timeZone", e.target.value)}
                placeholder="America/Sao_Paulo"
              />
            </Field>
            <Field label="Horário dos lembretes sem hora" htmlFor="push-time">
              <Input
                id="push-time"
                type="time"
                value={preferences.dailyTime}
                onChange={(e) => update("dailyTime", e.target.value)}
              />
            </Field>
            <CheckboxRow
              id="push-quiet"
              label="Usar horário silencioso"
              checked={preferences.quietEnabled}
              onChange={(v) => update("quietEnabled", v)}
            />
            {preferences.quietEnabled ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Silêncio começa" htmlFor="push-quiet-start">
                    <Input
                      id="push-quiet-start"
                      type="time"
                      value={preferences.quietStart}
                      onChange={(e) => update("quietStart", e.target.value)}
                    />
                  </Field>
                  <Field label="Silêncio termina" htmlFor="push-quiet-end">
                    <Input
                      id="push-quiet-end"
                      type="time"
                      value={preferences.quietEnd}
                      onChange={(e) => update("quietEnd", e.target.value)}
                    />
                  </Field>
                </div>
                <p className="text-meta text-muted">
                  Horários dentro desta faixa não geram aviso, inclusive de
                  medicação. O plano de cuidado não muda e o aviso não é adiado.
                </p>
              </>
            ) : null}
            <p className="text-meta text-muted">
              A agenda enviada cobre os próximos sete dias e se renova ao abrir
              o app. Depois de ativar, mudanças locais atualizam os horários
              quando houver conexão. O backup da conta continua manual.
            </p>
            <p className="text-meta text-muted">
              Ao ativar ou atualizar, avisos recentes ainda válidos podem
              chegar: até 30 minutos após um horário de medicação e até seis
              horas nos demais lembretes. A data e o horário do cuidado
              permanecem iguais.
            </p>
            {!active ? (
              <CheckboxRow
                id="push-consent"
                label="Quero enviar os horários desta agenda e receber avisos neste aparelho"
                description="São enviados identificadores e horários, sem nomes, doses, fotos ou documentos. O texto na tela bloqueada é genérico."
                checked={consent}
                onChange={setConsent}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                className="max-w-full whitespace-normal"
                disabled={
                  !support ||
                  !status?.configuration.enabled ||
                  (!active && !consent)
                }
                onClick={() =>
                  void run(async () => {
                    const parsed = pushPreferencesSchema.safeParse(preferences);
                    if (!parsed.success)
                      throw new Error(
                        "Confira o fuso e os horários informados.",
                      );
                    if (active) await savePushPreferences(user.id, parsed.data);
                    else
                      await enablePush(
                        user.id,
                        parsed.data,
                        status!.configuration.publicKey!,
                      );
                  })
                }
              >
                {busy
                  ? "Aguarde…"
                  : active
                    ? "Salvar preferências dos avisos"
                    : "Ativar avisos neste aparelho"}
              </Button>
              <Button
                className="max-w-full whitespace-normal"
                variant="secondary"
                onClick={() =>
                  void run(async () => {
                    setStatus(await readPushStatus(user.id));
                    if (active) await syncPushAgenda(user.id, true);
                  })
                }
              >
                Atualizar agenda e estado
              </Button>
              {own && (active || own.revocationPending) ? (
                <Button
                  className="max-w-full whitespace-normal"
                  variant="secondary"
                  onClick={() =>
                    void run(() => disconnectPushForAccount(user.id))
                  }
                >
                  Desativar avisos
                </Button>
              ) : null}
            </div>
          </fieldset>
          {own ? (
            <div aria-live="polite" className="text-sm text-ink-soft">
              <p>
                {own.revocationPending
                  ? "Cancelamento remoto pendente."
                  : !own.consented
                    ? "Avisos desativados neste aparelho."
                    : own.validUntil &&
                        Date.parse(own.validUntil) <= now.getTime()
                      ? "A agenda enviada venceu. Atualize para preparar novos avisos."
                      : own.dirty
                        ? "Alterações ainda não confirmadas na agenda do servidor."
                        : "Agenda enviada ao servidor."}
              </p>
              {own.validUntil ? (
                <p>
                  Avisos preparados até{" "}
                  {new Date(own.validUntil).toLocaleString("pt-BR")}. Abra o app
                  para renovar.
                </p>
              ) : null}
              {serverDevice?.status === "expired" ? (
                <p>
                  A assinatura expirou. Desative e ative os avisos novamente.
                </p>
              ) : null}
              {serverDevice?.lastCode ? (
                <p>
                  {serverDevice.lastCode >= 200 && serverDevice.lastCode < 300
                    ? "Último envio aceito pelo serviço; isso não comprova entrega ou leitura."
                    : "O último envio não foi aceito pelo serviço. Confira a permissão e tente atualizar."}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
      {error || own?.error ? (
        <p role="alert" className="text-sm text-danger-ink">
          {error || own?.error}
        </p>
      ) : null}
    </Card>
  );
}
