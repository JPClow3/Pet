"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getCloudClient } from "@/lib/cloud/client";

function securityError(caught: unknown) {
  const code =
    typeof caught === "object" && caught && "code" in caught
      ? String(caught.code)
      : "";
  if (/INVALID_PASSWORD/.test(code)) return "A senha atual está incorreta.";
  if (/ACCOUNT_CHANGED|UNAUTHORIZED|SESSION/.test(code))
    return "Sua sessão mudou. Entre novamente antes de continuar.";
  if (/TOO_MANY|RATE_LIMIT/.test(code))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return "Não foi possível concluir. Confira sua conexão e tente novamente.";
}

export function AccountSecurityPanel({
  userId,
  disabled = false,
  onSessionChanged,
}: {
  userId: string;
  disabled?: boolean;
  onSessionChanged: () => Promise<unknown>;
}) {
  const client = getCloudClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function run(action: "password" | "sessions") {
    if (busy || disabled) return;
    setError("");
    setMessage("");
    if (action === "password" && newPassword !== confirmation) {
      setError("A confirmação deve ser igual à nova senha.");
      return;
    }
    setBusy(true);
    try {
      const options = { headers: { "X-PetHub-User": userId } };
      const result =
        action === "password"
          ? await client.changePassword(
              { currentPassword, newPassword, revokeOtherSessions: true },
              options,
            )
          : // Native client uses /revoke-other-sessions. The installed server
            // helper maps this method to a different, unsupported endpoint.
            await client.revokeOtherSessions({}, options);
      if (!alive.current) return;
      if (result.error) throw result.error;
      setMessage(
        action === "password"
          ? "Senha alterada. As outras sessões foram encerradas. Os registros deste aparelho continuam aqui."
          : "As outras sessões foram encerradas. Você continua conectado neste navegador.",
      );
      try {
        await onSessionChanged();
      } catch {
        if (alive.current)
          setError(
            "A ação foi concluída, mas não foi possível atualizar a sessão. Recarregue a conta antes de outra ação.",
          );
      }
    } catch (caught) {
      if (alive.current) setError(securityError(caught));
    } finally {
      if (alive.current) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmation("");
        setBusy(false);
      }
    }
  }

  return (
    <section className="flex flex-col gap-4 border-t border-line pt-4">
      <h2 className="font-semibold text-ink">Segurança da conta</h2>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run("password");
        }}
      >
        <Field htmlFor="security-current-password" label="Senha atual">
          <Input
            id="security-current-password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={busy || disabled}
          />
        </Field>
        <Field
          htmlFor="security-new-password"
          label="Nova senha"
          hint="Use de 12 a 128 caracteres."
        >
          <Input
            id="security-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={busy || disabled}
          />
        </Field>
        <Field
          htmlFor="security-password-confirmation"
          label="Confirmar nova senha"
        >
          <Input
            id="security-password-confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={busy || disabled}
          />
        </Field>
        <p className="text-meta text-muted">
          Alterar a senha também encerra as sessões nos outros aparelhos.
        </p>
        <Button type="submit" disabled={busy || disabled}>
          Alterar senha
        </Button>
      </form>
      <Button
        variant="secondary"
        disabled={busy || disabled}
        onClick={() => void run("sessions")}
      >
        Sair dos outros aparelhos
      </Button>
      <p className="text-meta text-muted">
        Trocar o e-mail e excluir a conta ainda não estão disponíveis nesta
        instalação. Você pode excluir a cópia na nuvem e revogar cartões
        publicados nas telas correspondentes.
      </p>
      {message ? (
        <p role="status" className="text-meta text-teal-ink">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-meta text-danger-ink">
          {error}
        </p>
      ) : null}
    </section>
  );
}
