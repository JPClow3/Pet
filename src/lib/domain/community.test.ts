import { describe, expect, it } from "vitest";

import {
  filterPosts,
  commentsForPost,
  needsModeration,
  visiblePosts,
} from "./community";
import { seedComments, seedPosts } from "./seed";

describe("visiblePosts", () => {
  it("esconde denunciados e bloqueados", () => {
    const posts = [
      ...seedPosts,
      { ...seedPosts[0], id: "post-denunciado", reported: true },
      { ...seedPosts[0], id: "post-bloqueado", authorId: "seed-bloqueado" },
    ];
    const visible = visiblePosts(posts, ["seed-bloqueado"]);
    expect(visible.some((post) => post.id === "post-denunciado")).toBe(false);
    expect(visible.some((post) => post.id === "post-bloqueado")).toBe(false);
    expect(visible.length).toBe(seedPosts.length);
  });
});

describe("filterPosts", () => {
  it("filtra por grupo", () => {
    const result = filterPosts(
      seedPosts,
      { types: [], groupId: "group-golden", onlyMine: false, query: "" },
      "me",
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((post) => post.groupId === "group-golden")).toBe(true);
  });

  it("filtra por tipo", () => {
    const result = filterPosts(
      seedPosts,
      {
        types: ["perdido_encontrado"],
        groupId: null,
        onlyMine: false,
        query: "",
      },
      "me",
    );
    expect(result.every((post) => post.type === "perdido_encontrado")).toBe(
      true,
    );
  });

  it("filtra apenas minhas publicações", () => {
    const mine = { ...seedPosts[0], id: "post-meu", authorId: "me" };
    const result = filterPosts(
      [...seedPosts, mine],
      { types: [], groupId: null, onlyMine: true, query: "" },
      "me",
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("post-meu");
  });

  it("busca por texto no título e corpo", () => {
    const result = filterPosts(
      seedPosts,
      { types: [], groupId: null, onlyMine: false, query: "asfalto" },
      "me",
    );
    expect(result).toHaveLength(1);
  });

  it("ordena do mais recente para o mais antigo", () => {
    const result = filterPosts(
      seedPosts,
      { types: [], groupId: null, onlyMine: false, query: "" },
      "me",
    );
    expect(result[0].createdAt >= result[1].createdAt).toBe(true);
  });
});

describe("commentsForPost", () => {
  it("ordena comentários e esconde denunciados", () => {
    const comments = [
      ...seedComments,
      { ...seedComments[0], id: "comment-denunciado", reported: true },
    ];
    const result = commentsForPost(comments, "post-vet-madrugada");
    expect(result).toHaveLength(2);
    expect(result[0].createdAt <= result[1].createdAt).toBe(true);
  });

  it("não mistura comentários de posts diferentes", () => {
    expect(commentsForPost(seedComments, "post-figueiras")).toHaveLength(1);
  });
});

describe("needsModeration", () => {
  it("escala para análise a partir de três denúncias", () => {
    expect(needsModeration(2)).toBe(false);
    expect(needsModeration(3)).toBe(true);
  });
});
