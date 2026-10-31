"use client";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CheckboxRow } from "@/components/ui/field";
import { getCloudClient } from "@/lib/cloud/client";
import {
  CardConflictError,
  changeManagedCard,
  loadManagedCard,
} from "@/lib/cloud/cards";
import {
  MANAGED_CARD_TOKEN,
  managedCardPath,
  type ManagedCard,
  type ManagedCardMutation,
} from "@/lib/domain/managed-card";
import type { PublicPetCard } from "@/lib/domain/schema";

type Props = {
  petId: string;
  card: PublicPetCard;
  onLink: (url: string | null) => void;
};
const signature = (card: PublicPetCard) =>
  JSON.stringify({ ...card, generatedAt: null });
type SavedToken = { id: string; tokenVersion: string; token: string };
export function ManagedCardPanel(props: Props) {
  const { data, isPending } = getCloudClient().useSession();
  const user = data?.user;
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Link público gerenciado</CardTitle>
      <p className="text-meta text-muted">
        Publique somente os campos escolhidos. Você decide quando atualizar,
        encerrar ou trocar o link. A imagem da carteirinha funciona sem conta.
      </p>
      {user?.emailVerified ? (
        <CardControls
          key={`${user.id}:${props.petId}`}
          {...props}
          userId={user.id}
        />
      ) : (
        <>
          <p className="text-meta text-muted">
            {isPending
              ? "Consultando a conta…"
              : "Entre e confirme seu e-mail para publicar um link com prazo e revogação."}
          </p>
          <ButtonLink href="/account" variant="secondary">
            Conta e confirmação de e-mail
          </ButtonLink>
        </>
      )}
    </Card>
  );
}
function CardControls({
  petId,
  card,
  onLink,
  userId,
}: Props & { userId: string }) {
  const [record, setRecord] = useState<ManagedCard | null | undefined>();
  const [token, setToken] = useState<SavedToken | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState<ManagedCardMutation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const operation = useRef(0);
  const storageKey = `pethub:card-token:${userId}:${petId}`;
  useEffect(
    () => () => {
      operation.current++;
      onLink(null);
    },
    [onLink],
  );
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const active =
      record &&
      !record.revokedAt &&
      new Date(record.expiresAt).getTime() > clock;
    onLink(
      active &&
        token?.id === record.id &&
        token.tokenVersion === record.tokenVersion
        ? `${window.location.origin}${managedCardPath(token.token)}`
        : null,
    );
  }, [record, token, onLink, clock]);
  async function inspect() {
    const current = ++operation.current;
    setBusy(true);
    setError("");
    setPending(null);
    setConsent(false);
    try {
      const value = await loadManagedCard(userId, petId);
      if (operation.current !== current) return;
      setRecord(value);
      setToken(null);
      setMessage("");
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(storageKey) ?? "null",
        ) as SavedToken | null;
        if (
          saved &&
          value &&
          saved.id === value.id &&
          saved.tokenVersion === value.tokenVersion &&
          MANAGED_CARD_TOKEN.test(saved.token)
        )
          setToken(saved);
      } catch {
        /* The owner can rotate if this tab has no saved token. */
      }
    } catch (caught) {
      if (operation.current === current)
        setError(
          caught instanceof Error ? caught.message : "Falha ao consultar.",
        );
    } finally {
      if (operation.current === current) setBusy(false);
    }
  }
  function prepare(action: ManagedCardMutation["action"]) {
    if (record === undefined) return;
    if (action === "create")
      setPending({ action, petId, card, consent: true, expiresInDays: days });
    else if (record)
      setPending(
        action === "revoke"
          ? { action, petId, id: record.id, expectedRevision: record.revision }
          : {
              action,
              petId,
              id: record.id,
              expectedRevision: record.revision,
              card,
              consent: true,
              expiresInDays: days,
            },
      );
    setError("");
    setMessage("");
  }
  async function confirm() {
    if (!pending) return;
    if (
      pending.action !== "revoke" &&
      signature(pending.card) !== signature(card)
    ) {
      setPending(null);
      setConsent(false);
      setError("Os campos locais mudaram. Revise a publicação novamente.");
      return;
    }
    const current = ++operation.current;
    setBusy(true);
    setError("");
    try {
      const result = await changeManagedCard(userId, pending);
      if (operation.current !== current) return;
      setRecord(result.record);
      setPending(null);
      setConsent(false);
      if (result.token) {
        const saved = {
          id: result.record.id,
          tokenVersion: result.record.tokenVersion,
          token: result.token,
        };
        setToken(saved);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(saved));
        } catch {
          /* The current screen can still use the new token. */
        }
      }
      if (result.record.revokedAt) {
        setToken(null);
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
      }
      setMessage(
        result.record.revokedAt
          ? "Link encerrado. Imagens e capturas já salvas por outras pessoas continuam existindo."
          : "Publicação concluída. Alterações locais só aparecem no link depois de você atualizar a publicação.",
      );
    } catch (caught) {
      if (operation.current !== current) return;
      if (caught instanceof CardConflictError) {
        setRecord(undefined);
        setToken(null);
        setPending(null);
        setConsent(false);
      }
      setError(caught instanceof Error ? caught.message : "Falha ao publicar.");
    } finally {
      if (operation.current === current) setBusy(false);
    }
  }
  const expired = Boolean(
    record && new Date(record.expiresAt).getTime() <= clock,
  );
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => void inspect()}
      >
        Consultar link deste pet
      </Button>
      {record ? (
        <p className="text-meta text-muted">
          {record.revokedAt
            ? "Link revogado."
            : expired
              ? "Link expirado."
              : "Link publicado."}{" "}
          Versão {record.revision}. Prazo:{" "}
          {new Date(record.expiresAt).toLocaleString("pt-BR")}.
        </p>
      ) : record === null ? (
        <p className="text-meta text-muted">
          Nenhum link publicado para este pet nesta conta.
        </p>
      ) : null}
      {record && !record.revokedAt && !expired && !token ? (
        <p className="text-meta text-muted">
          O endereço completo não está nesta aba. Você pode atualizar os dados
          ou trocar o link para obter um novo endereço; o anterior deixará de
          funcionar.
        </p>
      ) : null}
      {record?.card && signature(record.card) !== signature(card) ? (
        <p className="text-meta text-warning-ink">
          Os campos locais diferem da publicação. O link ainda mostra a última
          versão aprovada.
        </p>
      ) : null}
      {record !== undefined && !pending ? (
        <>
          <label className="text-meta font-semibold">
            Validade após publicar
            <select
              aria-label="Validade do link"
              value={days}
              disabled={busy}
              onChange={(event) =>
                setDays(Number(event.target.value) as 7 | 30 | 90)
              }
              className="ml-2 rounded-lg border border-line bg-paper p-2"
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </label>
          <p className="text-meta text-muted">
            Campos selecionados: {card.name}; {card.species};{" "}
            {card.breed ?? "raça oculta"}; {card.city ?? "cidade oculta"};{" "}
            {card.contact ?? "sem contato"};{" "}
            {card.health ? "resumo de cuidados" : "saúde oculta"};{" "}
            {card.lost ? "modo perdido" : "sem aviso de perdido"}. A foto não
            será publicada.
          </p>
          <CheckboxRow
            label="Autorizo publicar estes campos para qualquer pessoa com o link"
            description="O endereço pode ser encaminhado. Revogar impede novas consultas, mas não apaga imagens ou capturas de quem já recebeu."
            checked={consent}
            onChange={setConsent}
          />
          {record === null ? (
            <Button
              disabled={busy || !consent}
              onClick={() => prepare("create")}
            >
              Revisar publicação
            </Button>
          ) : (
            <>
              {!record.revokedAt ? (
                <Button
                  disabled={busy || !consent}
                  onClick={() => prepare("refresh")}
                >
                  Revisar atualização do mesmo link
                </Button>
              ) : null}
              <Button
                variant="secondary"
                disabled={busy || !consent}
                onClick={() => prepare("rotate")}
              >
                Revisar troca do link
              </Button>
              {!record.revokedAt ? (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => prepare("revoke")}
                >
                  Encerrar link
                </Button>
              ) : null}
            </>
          )}
        </>
      ) : null}
      {pending ? (
        <div className="flex flex-col gap-3 rounded-card bg-surface p-4">
          <p className="text-meta text-ink">
            {pending.action === "revoke"
              ? "O link e os QR Codes que apontam para ele deixarão de abrir a carteirinha."
              : pending.action === "rotate"
                ? `O endereço anterior será encerrado. Um novo link mostrará os campos selecionados por ${pending.expiresInDays} dias.`
                : pending.action === "refresh"
                  ? `O mesmo link passará a mostrar os campos selecionados e valerá por mais ${pending.expiresInDays} dias, inclusive para quem já o recebeu.`
                  : `Os campos selecionados ficarão acessíveis por ${pending.expiresInDays} dias. Nenhuma outra informação do perfil será enviada.`}
          </p>
          <Button
            variant={pending.action === "revoke" ? "danger" : "primary"}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy
              ? "Aguarde…"
              : pending.action === "revoke"
                ? "Confirmar revogação"
                : "Confirmar publicação"}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            Cancelar
          </Button>
        </div>
      ) : null}
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
    </div>
  );
}
