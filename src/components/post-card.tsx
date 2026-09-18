"use client";

import { Flag, MapPin, MessageCircle, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { relativeTimeLabel } from "@/lib/domain/dates";
import { postTypeMeta } from "@/lib/domain/labels";
import { postTypeIcons } from "@/lib/icons";
import type { Post } from "@/lib/domain/schema";
import { useAppStore } from "@/lib/store/app-store";

const postAccents: Record<
  Post["type"],
  { border: string; surface: string; ink: string }
> = {
  pergunta: {
    border: "border-l-blue",
    surface: "bg-blue-soft",
    ink: "text-blue-deep",
  },
  recomendacao: {
    border: "border-l-teal",
    surface: "bg-lime-soft",
    ink: "text-teal-deep",
  },
  diario_publico: {
    border: "border-l-sun",
    surface: "bg-sun-soft",
    ink: "text-warning-ink",
  },
  perdido_encontrado: {
    border: "border-l-accent",
    surface: "bg-accent-soft",
    ink: "text-accent-deep",
  },
  evento: {
    border: "border-l-violet",
    surface: "bg-violet-soft",
    ink: "text-violet",
  },
  dica: {
    border: "border-l-sun",
    surface: "bg-sun-soft",
    ink: "text-warning-ink",
  },
};

function isDemoPost(post: Post): boolean {
  return post.authorId.startsWith("seed-");
}

export function PostCard({ post, comments }: { post: Post; comments: number }) {
  const TypeIcon = postTypeIcons[post.type];
  const accent = postAccents[post.type];
  const markPostHelpful = useAppStore((state) => state.markPostHelpful);
  const reportPost = useAppStore((state) => state.reportPost);

  return (
    <article
      className={`group flex flex-col gap-3 rounded-[20px] border border-line/80 border-l-4 bg-white p-4 shadow-none transition-[border-color,background-color] duration-150 hover:bg-surface/30 focus-within:border-line ${accent.border}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${accent.surface} ${accent.ink}`}
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

      <Link
        href={`/community/${post.id}`}
        className="flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
      >
        <h3 className="text-[1.08rem] font-semibold leading-tight text-ink transition-colors group-hover:text-blue-deep">
          {post.title}
        </h3>
        <p className="line-clamp-3 text-[0.92rem] leading-relaxed text-ink-soft/90">
          {post.body}
        </p>
      </Link>

      {post.type === "perdido_encontrado" ? (
        <p className="border-l-2 border-accent bg-accent-soft px-3 py-2 text-meta leading-relaxed text-accent-deep">
          Modo de segurança: confirme detalhes e use um contato mediado antes de
          compartilhar um endereço.
        </p>
      ) : null}

      <div className="flex items-center gap-1 border-t border-line/70 pt-2">
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Marcar publicação de ${post.authorName} como útil`}
          onClick={() => {
            markPostHelpful(post.id);
            toast.success("Marcado como útil");
          }}
        >
          <ThumbsUp aria-hidden="true" className="size-4" />
          {post.helpfulCount > 0 ? post.helpfulCount : "Útil"}
        </Button>
        <Link
          href={`/community/${post.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[14px] px-3 text-[0.85rem] font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          {comments > 0 ? comments : "Responder"}
        </Link>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto"
          aria-label={`Denunciar publicação de ${post.authorName}`}
          onClick={() => {
            reportPost(post.id);
            toast("Denúncia registrada", {
              description: "A publicação sai do seu feed e entra em análise.",
            });
          }}
        >
          <Flag aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </article>
  );
}
