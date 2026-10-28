"use client";

import { Cloud, Download, LogOut, RefreshCw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AccountSecurityPanel } from "@/components/account-security-panel";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CheckboxRow, Field, Input } from "@/components/ui/field";
import { getCloudClient, type CloudUser } from "@/lib/cloud/client";
import {
  backupContentSignature,
  CloudConflictError,
  deleteCloudSnapshot,
  readCloudSnapshot,
  saveCloudSnapshot,
  type CloudSnapshot,
} from "@/lib/cloud/snapshots";
import { parseBackup } from "@/lib/domain/backup";
import { disconnectPushForAccount } from "@/lib/push/client";
import {
  exportSnapshot,
  deviceContentSignature,
  restoreSnapshot,
  useAppStore,
} from "@/lib/store/app-store";

type PendingAction = {
  kind: "upload" | "restore" | "delete";
  localText: string;
  signature: string;
  remote: CloudSnapshot | null;
};

function downloadBackup(text: string, prefix: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function authMessage(caught: unknown) {
  const code =
    typeof caught === "object" && caught && "code" in caught
      ? String(caught.code)
      : "";
  if (/INVALID.*(PASSWORD|EMAIL)|USER_NOT_FOUND/.test(code))
    return "E-mail ou senha incorretos. Confira os dados ou recupere sua senha.";
  if (/EMAIL_NOT_VERIFIED/.test(code))
    return "Confirme seu e-mail antes de entrar. Use o código enviado para você.";
  if (/OTP|TOKEN/.test(code))
    return "Código inválido ou expirado. Solicite um novo e tente novamente.";
  if (/TOO_MANY|RATE_LIMIT/.test(code))
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  return "Não foi possível concluir. Confira sua conexão e tente novamente.";
}

export function CloudAccountPanel({
  configured = true,
  recoveryToken = null,
  onRestored,
}: {
  configured?: boolean;
  recoveryToken?: string | null;
  onRestored?: () => void;
}) {
  const client = getCloudClient();
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = client.useSession();
  const user = session?.user;
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "verify">(
    "signin",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const recovering = Boolean(recoveryToken && !resetComplete);
  const verifying =
    !recovering && (mode === "verify" || Boolean(user && !user.emailVerified));
  const targetEmail = user?.email ?? email.trim();

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (recovering && recoveryToken) {
        const result = await client.resetPassword({
          token: recoveryToken,
          newPassword: password,
        });
        if (result.error) throw result.error;
        setResetComplete(true);
        setMode("signin");
        window.history.replaceState(null, "", "/account");
        setMessage("Senha atualizada. Entre com sua nova senha.");
      } else if (verifying) {
        const result = await client.emailOtp.verifyEmail({
          email: targetEmail,
          otp: code,
        });
        if (result.error) throw result.error;
        setMode("signin");
        setCode("");
        setMessage(
          "E-mail confirmado. Entre na conta para recuperar seus pets.",
        );
      } else if (mode === "reset") {
        const result = await client.requestPasswordReset({
          email: targetEmail,
          redirectTo: `${window.location.origin}/account`,
        });
        if (result.error) throw result.error;
        setMessage(
          "Se houver uma conta com esse e-mail, você receberá um link para definir uma nova senha.",
        );
      } else if (mode === "signup") {
        const result = await client.signUp.email({
          email: targetEmail,
          password,
          name: name.trim(),
        });
        if (result.error) throw result.error;
        if (result.data?.user && !result.data.user.emailVerified) {
          setMode("verify");
          const verification = await client.emailOtp.sendVerificationOtp({
            email: targetEmail,
            type: "email-verification",
          });
          if (verification.error) throw verification.error;
          setMessage("Confira seu e-mail e digite o código de confirmação.");
        } else setMessage("Conta criada. Nenhum dado local foi enviado.");
      } else {
        const result = await client.signIn.email({
          email: targetEmail,
          password,
        });
        if (result.error) {
          if (result.error.code === "EMAIL_NOT_VERIFIED") setMode("verify");
          throw result.error;
        }
        setMessage("Conta conectada. Nenhum dado foi enviado ou substituído.");
      }
      setPassword("");
      await refetch({ query: { disableCookieCache: true } });
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    let pushRevoked = true;
    try {
      if (user) {
        try {
          pushRevoked = (await disconnectPushForAccount(user.id)).remoteRevoked;
        } catch {
          pushRevoked = false;
        }
      }
      const result = await client.signOut();
      if (result.error) throw result.error;
      await refetch({ query: { disableCookieCache: true } });
      setMode("signin");
      setMessage(
        pushRevoked
          ? "Você saiu da conta. Os dados locais continuam neste aparelho."
          : "Você saiu da conta. Os dados locais continuam neste aparelho. A desconexão dos avisos no servidor ficou pendente; entre novamente com conexão para concluir.",
      );
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Cloud aria-hidden="true" className="size-5 text-teal-ink" />
        <CardTitle>Conta e cópia na nuvem</CardTitle>
      </div>
      <p className="text-meta leading-relaxed text-muted">
        Opcional: guarde uma cópia e recupere seus pets em outro aparelho. A
        sincronização é manual: entrar não envia nem substitui seus dados.
      </p>
      {!configured ? (
        <p className="text-meta text-muted">
          A nuvem ainda não está configurada nesta instalação. Continue usando o
          app e exporte backups locais.
        </p>
      ) : isPending ? (
        <p role="status" className="text-meta text-muted">
          Verificando sua sessão…
        </p>
      ) : user?.emailVerified && !recovering ? (
        <CloudSyncPanel
          key={user.id}
          user={user}
          onRestored={onRestored}
          onSignOut={signOut}
          signingOut={busy}
        />
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h2 className="font-semibold text-ink">
            {recovering
              ? "Definir nova senha"
              : verifying
                ? "Confirmar e-mail"
                : mode === "signup"
                  ? "Criar conta"
                  : mode === "reset"
                    ? "Recuperar senha"
                    : "Entrar na conta"}
          </h2>
          {mode === "signup" && !verifying && !recovering ? (
            <Field htmlFor="cloud-name" label="Seu nome">
              <Input
                id="cloud-name"
                required
                maxLength={80}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </Field>
          ) : null}
          {!recovering ? (
            <Field htmlFor="cloud-email" label="E-mail">
              <Input
                id="cloud-email"
                type="email"
                required
                autoComplete="email"
                value={targetEmail}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy || Boolean(user)}
              />
            </Field>
          ) : null}
          {verifying ? (
            <Field htmlFor="cloud-code" label="Código recebido por e-mail">
              <Input
                id="cloud-code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={busy}
              />
            </Field>
          ) : mode !== "reset" || recovering ? (
            <Field
              htmlFor="cloud-password"
              label={recovering ? "Nova senha" : "Senha"}
              hint={
                mode === "signup" || recovering
                  ? "Use pelo menos 12 caracteres."
                  : undefined
              }
            >
              <Input
                id="cloud-password"
                type="password"
                required
                minLength={mode === "signup" || recovering ? 12 : 1}
                autoComplete={
                  mode === "signup" || recovering
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            </Field>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy
              ? "Aguarde…"
              : recovering
                ? "Salvar nova senha"
                : verifying
                  ? "Confirmar e-mail"
                  : mode === "signup"
                    ? "Criar conta"
                    : mode === "reset"
                      ? "Enviar link de recuperação"
                      : "Entrar"}
          </Button>
          {verifying ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || !targetEmail}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await client.emailOtp.sendVerificationOtp({
                    email: targetEmail,
                    type: "email-verification",
                  });
                  if (result.error) throw result.error;
                  setMessage(
                    "Se o cadastro estiver pendente, um novo código será enviado.",
                  );
                } catch (caught) {
                  setError(authMessage(caught));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Reenviar código
            </Button>
          ) : null}
          {!recovering ? (
            <div className="flex flex-wrap gap-1">
              {(["signin", "signup", "reset"] as const)
                .filter((value) => value !== mode)
                .map((value) => (
                  <Button
                    key={value}
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setMode(value);
                      setPassword("");
                      setError("");
                      setMessage("");
                    }}
                  >
                    {value === "signin"
                      ? "Já tenho conta"
                      : value === "signup"
                        ? "Criar uma conta"
                        : "Esqueci minha senha"}
                  </Button>
                ))}
            </div>
          ) : null}
          {user ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void signOut()}
            >
              Sair desta conta
            </Button>
          ) : null}
        </form>
      )}
      {configured && user?.emailVerified && !recovering ? (
        <AccountSecurityPanel
          key={user.id}
          userId={user.id}
          disabled={busy}
          onSessionChanged={() =>
            refetch({ query: { disableCookieCache: true } })
          }
        />
      ) : null}
      {sessionError && configured ? (
        <p role="alert" className="text-meta text-danger-ink">
          Não foi possível consultar a sessão. Confira a conexão e tente entrar
          novamente.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-meta leading-relaxed text-teal-ink">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-meta leading-relaxed text-danger-ink">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function CloudSyncPanel({
  user,
  onRestored,
  onSignOut,
  signingOut,
}: {
  user: CloudUser;
  onRestored?: () => void;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}) {
  const ready = useAppStore((state) => state.ready);
  const localPetCount = useAppStore((state) => state.pets.length);
  const [remote, setRemote] = useState<CloudSnapshot | null | undefined>();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [consent, setConsent] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const operation = useRef(0);
  const busy = working || signingOut;
  useEffect(
    () => () => {
      operation.current++;
    },
    [],
  );

  async function inspectCloud() {
    const current = ++operation.current;
    setWorking(true);
    setError("");
    setMessage("");
    setPending(null);
    try {
      const result = await readCloudSnapshot(user.id);
      if (operation.current !== current) return;
      setRemote(result);
      setConsent(false);
      setMessage(
        result
          ? "Cópia consultada. Compare os dados e escolha a próxima ação."
          : "Esta conta ainda não tem uma cópia na nuvem.",
      );
    } catch (caught) {
      if (operation.current === current)
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível consultar a nuvem.",
        );
    } finally {
      if (operation.current === current) setWorking(false);
    }
  }
  async function prepare(kind: PendingAction["kind"]) {
    if (remote === undefined) return;
    const current = ++operation.current;
    setWorking(true);
    try {
      const text = kind === "delete" ? "" : await exportSnapshot();
      if (operation.current !== current) return;
      setPending({
        kind,
        localText: text,
        signature: kind === "delete" ? "" : backupContentSignature(text),
        remote,
      });
      setError("");
      setMessage("");
    } catch (caught) {
      if (operation.current === current)
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível preparar os dados.",
        );
    } finally {
      if (operation.current === current) setWorking(false);
    }
  }
  async function confirm() {
    if (!pending) return;
    const action = pending;
    const current = ++operation.current;
    setWorking(true);
    setError("");
    try {
      if (
        action.kind !== "delete" &&
        backupContentSignature(await exportSnapshot()) !== action.signature
      ) {
        setPending(null);
        throw new Error(
          "Os dados deste aparelho mudaram durante a revisão. Confira novamente antes de continuar.",
        );
      }
      if (action.kind === "upload") {
        const saved = await saveCloudSnapshot(
          user.id,
          action.localText,
          action.remote?.revision ?? 0,
          action.remote?.generation ?? null,
        );
        if (operation.current !== current) return;
        setRemote(saved);
        setMessage(
          "Cópia salva na nuvem. Novas alterações ficam neste aparelho até você enviá-las novamente.",
        );
      } else if (action.kind === "restore" && action.remote) {
        const { data, error: sessionError } = await getCloudClient().getSession(
          { query: { disableCookieCache: true } },
        );
        if (operation.current !== current) return;
        if (
          sessionError ||
          data?.user?.id !== user.id ||
          !data.user.emailVerified
        )
          throw new Error(
            "Sua sessão mudou. Entre novamente e confira a cópia desejada.",
          );
        if (backupContentSignature(await exportSnapshot()) !== action.signature)
          throw new Error(
            "Os dados locais mudaram. Revise a restauração novamente.",
          );
        if (operation.current !== current) return;
        await restoreSnapshot(JSON.stringify(action.remote.backup), {
          expectedLocalState: deviceContentSignature(
            parseBackup(action.localText),
          ),
        });
        setMessage("Cópia restaurada neste aparelho.");
        onRestored?.();
      } else if (action.kind === "delete" && action.remote) {
        await deleteCloudSnapshot(
          user.id,
          action.remote.revision,
          action.remote.generation,
        );
        if (operation.current !== current) return;
        setRemote(null);
        setMessage(
          "Cópia na nuvem excluída. Os dados locais e sua conta permanecem disponíveis.",
        );
      }
      setPending(null);
      setConsent(false);
    } catch (caught) {
      if (operation.current !== current) return;
      if (caught instanceof CloudConflictError) {
        setRemote(undefined);
        setPending(null);
        setConsent(false);
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir. Nenhum dado local foi apagado.",
      );
    } finally {
      if (operation.current === current) setWorking(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="break-words text-meta text-ink">
        Conectado como <strong>{user.email}</strong>
      </p>
      <p className="text-meta text-muted">
        Neste aparelho: {localPetCount} {localPetCount === 1 ? "pet" : "pets"}.
      </p>
      <Button
        variant="secondary"
        disabled={busy || !ready}
        onClick={() => void inspectCloud()}
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        {busy ? "Aguarde…" : "Consultar cópia na nuvem"}
      </Button>
      {remote ? (
        <div className="rounded-2xl bg-surface p-3 text-meta leading-relaxed text-ink">
          <p className="font-semibold">
            Na nuvem: {remote.backup.pets.length} pets · versão{" "}
            {remote.revision}
          </p>
          <p>
            {remote.backup.pets.map((pet) => pet.name).join(", ") || "Sem pets"}
          </p>
          <p>
            {remote.backup.records.length} registros de saúde ·{" "}
            {remote.backup.diary.length} entradas no diário
          </p>
          <p>Salva em {new Date(remote.updatedAt).toLocaleString("pt-BR")}</p>
        </div>
      ) : remote === null ? (
        <p className="text-meta text-muted">Nenhuma cópia salva nesta conta.</p>
      ) : null}
      {remote !== undefined && !pending ? (
        <>
          <CheckboxRow
            label="Quero enviar os dados deste aparelho para esta conta"
            description="Inclui perfil, pets, saúde, documentos, fotos, diário e preferências (até 20 MB). Confirme que os dados pertencem à conta acima."
            checked={consent}
            onChange={setConsent}
          />
          <Button
            disabled={busy || !ready || !consent}
            onClick={() => prepare("upload")}
          >
            <Upload aria-hidden="true" className="size-4" />
            Revisar envio para a nuvem
          </Button>
          {remote ? (
            <>
              <Button
                variant="secondary"
                disabled={busy || !ready}
                onClick={() => prepare("restore")}
              >
                <Download aria-hidden="true" className="size-4" />
                Revisar restauração neste aparelho
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  downloadBackup(
                    JSON.stringify(remote.backup, null, 2),
                    "zelupi-nuvem",
                  )
                }
              >
                Baixar backup da nuvem
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => prepare("delete")}
              >
                Excluir somente a cópia na nuvem
              </Button>
            </>
          ) : null}
        </>
      ) : null}
      {pending ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4">
          <h3 className="font-semibold text-ink">
            {pending.kind === "upload"
              ? "Confirmar envio"
              : pending.kind === "restore"
                ? "Confirmar substituição dos dados locais"
                : "Confirmar exclusão da cópia na nuvem"}
          </h3>
          <p className="text-meta leading-relaxed text-ink">
            {pending.kind === "upload"
              ? `Enviar ${parseBackup(pending.localText).pets.length} pets deste aparelho para ${user.email}. ${pending.remote ? `A versão ${pending.remote.revision} na nuvem será substituída.` : "Será criada a primeira cópia da conta."}`
              : pending.kind === "restore"
                ? `Os dados deste aparelho serão substituídos pela versão ${pending.remote?.revision} da nuvem, sem mesclar registros. Baixe um backup local para preservar ambas as versões.`
                : "Essa ação remove a cópia recuperável da nuvem. Os dados locais e sua conta não serão excluídos."}
          </p>
          {pending.kind === "restore" ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() =>
                downloadBackup(pending.localText, "zelupi-antes-da-restauracao")
              }
            >
              Baixar cópia deste aparelho
            </Button>
          ) : null}
          <Button
            variant={pending.kind === "upload" ? "primary" : "danger"}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy
              ? "Aguarde…"
              : pending.kind === "upload"
                ? "Confirmar envio"
                : pending.kind === "restore"
                  ? "Substituir dados deste aparelho"
                  : "Excluir cópia na nuvem"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            Cancelar
          </Button>
        </div>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => void onSignOut()}
      >
        <LogOut aria-hidden="true" className="size-4" />
        Sair da conta neste navegador
      </Button>
      <p className="text-meta text-muted">
        Sair não apaga dados locais. Em aparelho compartilhado, exporte o que
        precisar e use a exclusão local no Perfil.
      </p>
      {message ? (
        <p role="status" className="text-meta leading-relaxed text-teal-ink">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-meta leading-relaxed text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
