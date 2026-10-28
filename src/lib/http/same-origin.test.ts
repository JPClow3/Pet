import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./same-origin";

const request = (url: string, headers: Record<string, string>) =>
  new Request(url, { method: "POST", headers });
describe("origem das mutações HTTP", () => {
  it("aceita localhost, IPv4 e IPv6 pelo Host real quando Next usa hostname de bind", () => {
    for (const host of ["localhost:3105", "127.0.0.1:3105", "[::1]:3105"])
      expect(
        isSameOriginRequest(
          request("http://0.0.0.0:3105/api/auth/sign-up/email", {
            Host: host,
            Origin: `http://${host}`,
          }),
        ),
      ).toBe(true);
  });
  it("mantém a origem HTTPS em Workers e pode usar URL quando Host não está disponível", () => {
    expect(
      isSameOriginRequest(
        request("https://pet.example/api/push/device", {
          Host: "pet.example",
          Origin: "https://pet.example",
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        request("https://pet.example/api/push/device", {
          Origin: "https://pet.example",
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        request("https://pet.example/api/push/device", {
          Host: "pet.example:443",
          Origin: "https://pet.example",
        }),
      ),
    ).toBe(true);
  });
  it("exige protocolo, host e porta da origem sem aceitar caminhos ou origem opaca", () => {
    for (const origin of [
      "https://127.0.0.1:3105",
      "http://localhost:3105",
      "http://127.0.0.1:3106",
      "http://127.0.0.1:3105/",
      "http://127.0.0.1:3105/path",
      "null",
      "",
      "http://127.0.0.1:3105, https://evil.test",
    ])
      expect(
        isSameOriginRequest(
          request("http://localhost:3105/api/cloud/snapshot", {
            Host: "127.0.0.1:3105",
            Origin: origin,
          }),
        ),
        origin,
      ).toBe(false);
    expect(isSameOriginRequest(request("https://pet.example/api", {}))).toBe(
      false,
    );
  });
  it("não confia em encaminhamento arbitrário de host ou protocolo", () => {
    expect(
      isSameOriginRequest(
        request("https://internal.example/api", {
          Host: "pet.example",
          Origin: "https://evil.test",
          "X-Forwarded-Host": "evil.test",
          Forwarded: "host=evil.test;proto=https",
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        request("http://localhost:3105/api", {
          Host: "127.0.0.1:3105",
          Origin: "https://127.0.0.1:3105",
          "X-Forwarded-Proto": "https",
        }),
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        request("https://pet.example/api", {
          Origin: "https://evil.test",
          "X-Forwarded-Host": "evil.test",
        }),
      ),
    ).toBe(false);
  });
  it("recusa Host malformado em vez de recorrer à URL alternativa", () => {
    for (const host of [
      "",
      "pet.example,evil.test",
      "pet.example/",
      "pet.example@evil.test",
      "pet.example?x",
      "pet.example#x",
      "pet.example\\evil.test",
      "pet%2eexample",
      "pet.example:99999",
    ])
      expect(
        isSameOriginRequest(
          request("https://pet.example/api", {
            Host: host,
            Origin: "https://pet.example",
          }),
        ),
        host,
      ).toBe(false);
  });
});
