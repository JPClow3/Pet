"use client";

import {
  Check,
  Copy,
  Mail,
  Plus,
  Share2,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { BottomSheet } from "@/components/ui/sheet";
import {
  acceptInvite,
  fetchCollaborators,
  inviteCollaborator,
  removeCollaborator,
} from "@/lib/cloud/collaboration-client";
import { getCloudClient } from "@/lib/cloud/client";
import type { PetCollaborator } from "@/lib/domain/collaboration";
import type { Pet } from "@/lib/domain/schema";

export function PetCollaboratorsPanel({ pet }: { pet: Pet }) {
  const client = getCloudClient();
  const { data: session } = client.useSession();
  const user = session?.user;

  const [collaborators, setCollaborators] = useState<PetCollaborator[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Invite form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"co_tutor" | "cuidador">("co_tutor");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Join form state
  const [inviteCode, setInviteCode] = useState("");
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id || !pet.id) return;
    let cancelled = false;
    fetchCollaborators(pet.id, user.id)
      .then((collabs) => {
        if (!cancelled) setCollaborators(collabs);
      })
      .catch(() => {
        // Fallback or offline
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, pet.id]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Entre na sua conta para convidar outros tutores.");
      return;
    }
    setInviteSubmitting(true);
    try {
      const newCollab = await inviteCollaborator(user.id, {
        petId: pet.id,
        petName: pet.name,
        collaboratorEmail: email.trim(),
        collaboratorName: name.trim() || email.split("@")[0],
        role,
      });
      setCollaborators((prev) => [...prev, newCollab]);
      setShowInviteModal(false);
      setEmail("");
      setName("");
      toast.success("Convite criado!", {
        description: `Compartilhe o código de convite ou link com ${newCollab.collaboratorName}.`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar convite");
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Entre na sua conta para aceitar o convite.");
      return;
    }
    setJoinSubmitting(true);
    try {
      const accepted = await acceptInvite(user.id, inviteCode.trim());
      setShowJoinModal(false);
      setInviteCode("");
      toast.success("Convite aceito com sucesso!", {
        description: `Você agora é co-tutor(a) de ${accepted.petName}.`,
      });
      if (accepted.petId === pet.id) {
        setCollaborators((prev) => [...prev, accepted]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aceitar convite");
    } finally {
      setJoinSubmitting(false);
    }
  }

  async function handleRemove(collabId: string) {
    if (!user?.id) return;
    try {
      await removeCollaborator(user.id, collabId);
      setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
      toast.success("Colaborador removido");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover colaborador");
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal-ink/10 text-teal-ink">
            <Users aria-hidden="true" className="size-5" />
          </span>
          <div>
            <CardTitle>Cuidadores e família</CardTitle>
            <p className="mt-0.5 text-meta text-muted">
              {user
                ? "Quem você convidar vê os remédios dados, para ninguém repetir a dose."
                : "Hoje os cuidados ficam só neste aparelho. Com uma conta Zelupi, quem você convidar vê os remédios dados, para ninguém repetir a dose."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-card border border-line/60 bg-surface/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink">
            Tutor Principal (Este aparelho)
          </span>
          <Chip tone="teal">Proprietário</Chip>
        </div>
        <p className="text-meta text-muted">
          {user?.email ?? "Só neste aparelho. Entre na sua conta Zelupi para usar em outros aparelhos."}
        </p>
      </div>

      {/* Lista de co-tutores */}
      {collaborators.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-meta font-semibold text-muted">
            Co-tutores vinculados ({collaborators.length})
          </span>
          {collaborators.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-card border border-line bg-paper p-3"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-ink">
                  {c.collaboratorName}
                </span>
                <span className="text-meta text-muted">{c.collaboratorEmail}</span>
                <span className="text-xs text-muted">
                  Código: <code className="font-mono text-teal-ink">{c.inviteCode}</code>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Chip tone={c.status === "accepted" ? "teal" : "warning"}>
                  {c.status === "accepted" ? "Conectado" : "Pendente"}
                </Chip>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(c.inviteCode);
                    toast.success("Código copiado!");
                  }}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
                  title="Copiar código de convite"
                  aria-label="Copiar código de convite"
                >
                  <Copy aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove(c.id)}
                  className="rounded-lg p-1.5 text-danger-ink hover:bg-danger/10"
                  title="Remover co-tutor"
                  aria-label="Remover co-tutor"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => setShowInviteModal(true)}
          className="flex-1"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Convidar parceiro(a) / co-tutor
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowJoinModal(true)}
        >
          Inserir código recebido
        </Button>
      </div>

      {/* Modal de Convidar Co-Tutor */}
      <BottomSheet
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Convidar cuidador ou familiar"
        description={`A pessoa precisa de uma conta Zelupi. Depois de aceitar, ela vê e registra os cuidados de ${pet.name}.`}
      >
        <form onSubmit={(e) => void handleSendInvite(e)} className="flex flex-col gap-4">
          <Field htmlFor="collab-name" label="Nome da pessoa">
            <Input
              id="collab-name"
              required
              placeholder="Ex: Carlos, Ana, Mãe..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={inviteSubmitting}
            />
          </Field>

          <Field htmlFor="collab-email" label="E-mail da conta Zelupi">
            <Input
              id="collab-email"
              type="email"
              required
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviteSubmitting}
            />
          </Field>

          <Field htmlFor="collab-role" label="Nível de acesso">
            <Select
              id="collab-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "co_tutor" | "cuidador")}
              disabled={inviteSubmitting}
            >
              <option value="co_tutor">Co-Tutor (Acesso total à saúde e rotina)</option>
              <option value="cuidador">Cuidador (Apenas rotina e remédios)</option>
            </Select>
          </Field>

          <div className="rounded-xl bg-teal-ink/10 p-3 text-xs leading-relaxed text-teal-ink">
            <strong>Proteção contra dupla dosagem:</strong> Quando o co-tutor marcar
            uma dose como dada, você verá imediatamente o nome dele(a) no app,
            garantindo que o remédio não seja administrado duas vezes por engano.
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={inviteSubmitting} className="flex-1">
              {inviteSubmitting ? "Gerando..." : "Gerar Convite"}
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Modal de Inserir Código de Convite */}
      <BottomSheet
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Aceitar Convite de Co-Tutor"
        description="Digite o código que você recebeu do tutor principal."
      >
        <form onSubmit={(e) => void handleAcceptInvite(e)} className="flex flex-col gap-4">
          <Field htmlFor="join-code" label="Código do convite">
            <Input
              id="join-code"
              required
              placeholder="Ex: inv_abc123..."
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              disabled={joinSubmitting}
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowJoinModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={joinSubmitting} className="flex-1">
              {joinSubmitting ? "Vinculando..." : "Vincular Pet"}
            </Button>
          </div>
        </form>
      </BottomSheet>
    </Card>
  );
}
