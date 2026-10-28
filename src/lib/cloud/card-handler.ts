import { isSameOriginRequest } from "@/lib/http/same-origin";
import {
  managedCardMutation,
  type ManagedCardMutation,
  type ManagedCard,
} from "@/lib/domain/managed-card";

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      Vary: "Cookie",
    },
  });
type Services = {
  currentUser: () => Promise<{ id: string; emailVerified: boolean } | null>;
  read: (userId: string, petId: string) => Promise<ManagedCard | null>;
  mutate: (
    userId: string,
    input: ManagedCardMutation,
  ) => Promise<{ record: ManagedCard; token: string | null } | null>;
};
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 12288) {
        await reader.cancel();
        throw new Error("Too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function createCardHandlers(services: Services) {
  async function handle(request: Request) {
    try {
      if (request.method !== "GET" && !isSameOriginRequest(request))
        return reply({ error: "Origin not allowed" }, 403);
      const user = await services.currentUser();
      if (!user) return reply({ error: "Sign in required" }, 401);
      if (
        !user.emailVerified ||
        request.headers.get("X-PetHub-User") !== user.id
      )
        return reply({ error: "Session changed or email not verified" }, 403);
      if (request.method === "GET") {
        const petId = new URL(request.url).searchParams.get("petId");
        if (!petId || petId.length > 100)
          return reply({ error: "Invalid pet" }, 400);
        return reply({ record: await services.read(user.id, petId) });
      }
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return reply({ error: "JSON required" }, 415);
      let input: ManagedCardMutation;
      try {
        input = managedCardMutation.parse(await readBody(request));
      } catch {
        return reply({ error: "Invalid publication" }, 400);
      }
      const result = await services.mutate(user.id, input);
      return result
        ? reply(result)
        : reply({ error: "Card changed; reload before continuing" }, 409);
    } catch {
      return reply({ error: "Sharing temporarily unavailable" }, 503);
    }
  }
  return { GET: handle, POST: handle };
}
