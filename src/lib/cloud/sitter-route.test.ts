import { describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({
  verify: vi.fn(),
  record: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/lib/cloud/server-collaboration", () => ({
  readSitterPassByToken: server.read,
  recordSitterCareAction: server.record,
  verifySitterPassPinAndRead: server.verify,
  SitterAccessError: class extends Error {
    constructor(
      message: string,
      public status: number,
      public retryAfter?: number,
    ) {
      super(message);
    }
  },
}));
import { SitterAccessError } from "./server-collaboration";
import { POST } from "@/app/api/cloud/sitter/[token]/route";

describe("sitter API", () => {
  const context = { params: Promise.resolve({ token: `s_${"a".repeat(43)}` }) };
  const request = (body: unknown) =>
    new Request("https://zelupi.test/api/cloud/sitter/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  it("returns the persisted PIN cooldown with Retry-After", async () => {
    server.verify.mockRejectedValueOnce(
      new SitterAccessError("Aguarde", 429, 720),
    );
    const response = await POST(
      request({ action: "verify_pin", pin: "1234" }),
      context,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("720");
  });
  it("passes the PIN to the care authorization service", async () => {
    server.record.mockResolvedValueOnce(true);
    const response = await POST(
      request({
        action: "record_care",
        pin: "1234",
        eventType: "meal",
        eventKey: "meal:feed:day",
        status: "served",
        actorName: "Caregiver",
      }),
      context,
    );
    expect(response.status).toBe(201);
    expect(server.record).toHaveBeenLastCalledWith(
      `s_${"a".repeat(43)}`,
      expect.objectContaining({ pin: "1234" }),
    );
  });
});
