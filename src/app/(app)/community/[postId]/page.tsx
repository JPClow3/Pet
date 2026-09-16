"use client";

import {
  ArrowLeft,
  Flag,
  MapPin,
  MessageCircle,
  Radio,
  ShieldAlert,
  ThumbsUp,
  UserX,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/field";
import { SkeletonScreen } from "@/components/ui/skeleton";
import { relativeTimeLabel } from "@/lib/domain/dates";
import { commentsForPost } from "@/lib/domain/community";
import { postTypeMeta } from "@/lib/domain/labels";
import { postTypeIcons } from "@/lib/icons";
import { useAppStore, MY_AUTHOR } from "@/lib/store/app-store";
import { useHydrated } from "@/lib/store/hooks";

const postAccents: Record<Post["type"], { surface: string; ink: string }> = {
  pergunta: { surface: "bg-blue-soft", ink: "text-blue-deep" },
  recomendacao: { surface: "bg-lime-soft", ink: "text-teal-deep" },
  diario_publico: { surface: "bg-sun-soft", ink: "text-warning-ink" },
  perdido_encontrado: { surface: "bg-accent-soft", ink: "text-accent-deep" },
  evento: { surface: "bg-violet-soft", ink: "text-violet" },
  dica: { surface: "bg-sun-soft", ink: "text-warning-ink" },
};

type Post = ReturnType<typeof useAppStore.getState>["posts"][number];

function isDemoPost(post: Post): boolean {
  return post.authorId.startsWith("seed-");
}

export default function PostDetailPage() {
  const ready = useHydrated();
  const params = useParams<{ postId: string }>();
  const post = useAppStore((state) =>
    state.posts.find((item) => item.id === params.postId),
  );
  const allComments = useAppStore((state) => state.comments);
  const addComment = useAppStore((state) => state.addComment);
  const markPostHelpful = useAppStore((state) => state.markPostHelpful);
  const markCommentHelpful = useAppStore((state) => state.markCommentHelpful);
  const reportPost = useAppStore((state) => state.reportPost);
  const reportComment = useAppStore((state) => state.reportComment);
  const blockAuthor = useAppStore((state) => state.blockAuthor);
  const removePost = useAppStore((state) => state.removePost);

  const [draft, setDraft] = useState("");

  const comments = useMemo(
    () => (post ? commentsForPost(allComments, post.id) : []),
    [allComments, post],
  );

  if (!ready) return <SkeletonScreen label="Carregando publicação" />;

  if (!post) {
    return (
      <EmptyState
        icon={<MessageCircle aria-hidden="true" className="size-5" />}
        title="Publicação não encontrada"
        description="Ela pode ter sido removida ou denunciada. O feed continua disponível."
        action={<ButtonLink href="/community">Voltar ao feed</ButtonLink>}
      />
    );
  }

  const TypeIcon = postTypeIcons[post.type];
  const accent = postAccents[post.type];
  const mine = post.authorId === MY_AUTHOR;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <PageHeader
        title="Publicação"
        subtitle="Comunidade · prévia local"
        backHref="/community"
      />

      <Card
        className={`flex flex-col gap-4 border-l-4 ${post.type === "perdido_encontrado" ? "border-l-accent" : "border-l-blue"} p-5`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${accent.surface} ${accent.ink}`}
          >
            <TypeIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={postTypeMeta[post.type].tone}>
                {postTypeMeta[post.type].label}
              </Chip>
              {isDemoPost(post) ? (
                <span className="rounded-full bg-sun-soft px-2.5 py-1 text-[0.68rem] font-bold text-warning-ink">
                  Exemplo local
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta text-muted">
              <span>
                {post.authorName}
                {post.petName ? ` · tutor de ${post.petName}` : ""}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.createdAt}>
                {relativeTimeLabel(post.createdAt)}
              </time>
              {post.city ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3.5" />
                    {post.city}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-[1.42rem] font-semibold leading-tight text-ink">
            {post.title}
          </h1>
          <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft">
            {post.body}
          </p>
        </div>

        {post.type === "perdido_encontrado" ? (
          <div className="flex items-start gap-3 border-l-2 border-accent bg-accent-soft px-3 py-3">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-accent-deep"
            />
            <p className="text-meta leading-relaxed text-accent-deep">
              Para sua segurança, não compartilhe endereço residencial ou dados
              sensíveis. Prefira um contato mediado.
            </p>
          </div>
        ) : null}

        {post.type === "pergunta" || post.type === "dica" ? (
          <p className="flex items-start gap-2 rounded-2xl bg-sun-soft px-3 py-2.5 text-meta leading-relaxed text-warning-ink">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            Experiência da comunidade, não orientação veterinária. Procure um
            profissional em caso de sintomas ou dúvida.
          </p>
        ) : null}

        {post.reported ? (
          <p
            className="rounded-2xl bg-warning/15 px-3 py-2 text-meta text-warning-ink"
            role="status"
          >
            Esta publicação está em análise depois de uma denúncia.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1 border-t border-line/70 pt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              markPostHelpful(post.id);
              toast.success("Marcado como útil");
            }}
          >
            <ThumbsUp aria-hidden="true" className="size-4" />
            Útil · {post.helpfulCount}
          </Button>
          {mine ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!window.confirm("Excluir esta publicação?")) return;
                removePost(post.id);
                toast.success("Publicação excluída");
              }}
            >
              Excluir
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  reportPost(post.id);
                  toast("Denúncia registrada", {
                    description: "A publicação entra em análise de moderação.",
                  });
                }}
              >
                <Flag aria-hidden="true" className="size-4" />
                Denunciar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  blockAuthor(post.authorId);
                  toast("Usuário bloqueado", {
                    description:
                      "As publicações dele deixam de aparecer para você.",
                  });
                }}
              >
                <UserX aria-hidden="true" className="size-4" />
                Bloquear
              </Button>
            </>
          )}
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">
              Conversa
            </p>
            <CardTitle className="mt-1">
              {comments.length === 0
                ? "Seja a primeira resposta"
                : `${comments.length} resposta${comments.length > 1 ? "s" : ""}`}
            </CardTitle>
          </div>
          <span className="text-meta text-muted">Contexto ajuda</span>
        </div>

        {comments.map((comment) => (
          <Card
            key={comment.id}
            className="flex flex-col gap-2 rounded-[20px] border-l-4 border-l-teal p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[0.95rem] font-semibold text-ink">
                {comment.authorName}
              </span>
              <time
                dateTime={comment.createdAt}
                className="text-meta text-muted"
              >
                {relativeTimeLabel(comment.createdAt)}
              </time>
            </div>
            <p className="text-[0.92rem] leading-relaxed text-ink-soft/90">
              {comment.body}
            </p>
            <div className="flex items-center gap-1 border-t border-line/70 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markCommentHelpful(comment.id)}
                disabled={comment.helpful}
              >
                <ThumbsUp aria-hidden="true" className="size-4" />
                {comment.helpful ? "Resposta útil" : "Marcar como útil"}
              </Button>
              {comment.authorId !== MY_AUTHOR ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Denunciar comentário"
                  onClick={() => {
                    reportComment(comment.id);
                    toast("Comentário denunciado");
                  }}
                >
                  <Flag aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
            </div>
          </Card>
        ))}

        <Card className="flex flex-col gap-3 rounded-[20px] border-blue/20 bg-blue-soft/40 p-4">
          <label
            className="text-[0.88rem] font-semibold text-ink"
            htmlFor="comment-body"
          >
            Sua resposta
          </label>
          <Textarea
            id="comment-body"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Conte como foi com o seu pet — contexto ajuda quem está lendo."
            maxLength={600}
          />
          <Button
            onClick={() => {
              if (draft.trim().length === 0) return;
              addComment({ postId: post.id, body: draft.trim() });
              setDraft("");
              toast.success("Resposta publicada");
            }}
            disabled={draft.trim().length === 0}
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            Responder
          </Button>
        </Card>
      </section>

      <div className="flex items-start gap-2 border-t border-line pt-3 text-meta leading-relaxed text-muted">
        <Radio
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-blue"
        />
        <p>
          Esta tela usa dados de demonstração locais. Publicações reais dependem
          de conta, conexão e moderação ativa.
        </p>
      </div>

      <ButtonLink href="/community" variant="ghost" className="self-start">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar à comunidade
      </ButtonLink>
    </div>
  );
}
