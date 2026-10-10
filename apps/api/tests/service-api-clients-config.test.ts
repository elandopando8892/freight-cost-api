import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseServiceApiClients } from "../src/config/service-clients.js";
import {
  digestsEqual,
  matchServiceClient,
} from "../src/middleware/authenticate-service.js";

vi.mock("../src/config/prisma.js", () => ({ prisma: {} }));

const ORG = "cmarketplaceorg0000000001";
const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

describe("parseServiceApiClients", () => {
  it("treats an empty value as disabled", () => {
    expect(parseServiceApiClients("")).toEqual([]);
    expect(parseServiceApiClients(undefined)).toEqual([]);
    expect(parseServiceApiClients("   ")).toEqual([]);
  });

  it("parses well-formed entries", () => {
    const clients = parseServiceApiClients(
      ` marketplace:${sha256("a")}:${ORG}:VIEWER , ops-bot:${sha256("b").toUpperCase()}:${ORG}:OPERATOR`,
    );
    expect(clients).toHaveLength(2);
    expect(clients[0]).toMatchObject({ clientId: "marketplace", orgId: ORG, role: "VIEWER" });
    expect(clients[0].secretHash.equals(Buffer.from(sha256("a"), "hex"))).toBe(true);
    expect(clients[1].secretHash.equals(Buffer.from(sha256("b"), "hex"))).toBe(true);
  });

  it.each([
    ["short hash", `m:${sha256("a").slice(1)}:${ORG}:VIEWER`],
    ["non-hex hash", `m:${"z".repeat(64)}:${ORG}:VIEWER`],
    ["missing field", `m:${sha256("a")}:${ORG}`],
    ["extra field", `m:${sha256("a")}:${ORG}:VIEWER:x`],
    ["invalid role", `m:${sha256("a")}:${ORG}:ADMIN`],
    ["non-cuid org", `m:${sha256("a")}:org-1:VIEWER`],
    ["uuid org", `m:${sha256("a")}:3f0e4d9a-1b2c-4d5e-8f90-123456789abc:VIEWER`],
    ["bad client id", `m m:${sha256("a")}:${ORG}:VIEWER`],
    ["duplicate client id", `m:${sha256("a")}:${ORG}:VIEWER,m:${sha256("b")}:${ORG}:VIEWER`],
    ["shared secret", `m:${sha256("a")}:${ORG}:VIEWER,n:${sha256("a")}:${ORG}:VIEWER`],
  ])("rejects %s", (_label, raw) => {
    expect(() => parseServiceApiClients(raw)).toThrow(/SERVICE_API_CLIENTS/);
  });

  it("never echoes the configured hash in errors", () => {
    const hash = sha256("a");
    expect(() => parseServiceApiClients(`m:${hash}:org-1:VIEWER`)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(hash) }),
    );
  });
});

describe("constant-time matching", () => {
  it("does not throw when digests have different lengths", () => {
    expect(() => digestsEqual(Buffer.alloc(32), Buffer.alloc(16))).not.toThrow();
    expect(digestsEqual(Buffer.alloc(32), Buffer.alloc(16))).toBe(false);
    expect(digestsEqual(Buffer.alloc(0), Buffer.alloc(32))).toBe(false);
  });

  it("matches only the client whose secret hashes to the token", () => {
    const clients = parseServiceApiClients(
      `a:${sha256("secret-a")}:${ORG}:VIEWER,b:${sha256("secret-b")}:${ORG}:OPERATOR`,
    );
    expect(matchServiceClient("secret-b", clients)?.clientId).toBe("b");
    expect(matchServiceClient("secret-c", clients)).toBeNull();
    expect(matchServiceClient("", clients)).toBeNull();
    expect(matchServiceClient("secret-a", [])).toBeNull();
    // A token of arbitrary length never throws.
    expect(matchServiceClient("x".repeat(10_000), clients)).toBeNull();
  });
});

describe("env startup validation", () => {
  const original = process.env.SERVICE_API_CLIENTS;
  afterEach(() => {
    if (original === undefined) delete process.env.SERVICE_API_CLIENTS;
    else process.env.SERVICE_API_CLIENTS = original;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("aborts startup when SERVICE_API_CLIENTS has a malformed hash", async () => {
    process.env.SERVICE_API_CLIENTS = `marketplace:not-a-sha256:${ORG}:VIEWER`;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    vi.resetModules();

    await expect(import("../src/config/env.js")).rejects.toThrow(/process\.exit\(1\)/);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("starts with service authentication disabled by default", async () => {
    delete process.env.SERVICE_API_CLIENTS;
    vi.resetModules();
    const { env } = await import("../src/config/env.js");
    expect(env.SERVICE_API_CLIENTS).toEqual([]);
  });

  it("loads a valid configuration", async () => {
    process.env.SERVICE_API_CLIENTS = `marketplace:${sha256("s")}:${ORG}:VIEWER`;
    vi.resetModules();
    const { env } = await import("../src/config/env.js");
    expect(env.SERVICE_API_CLIENTS).toHaveLength(1);
    expect(env.SERVICE_API_CLIENTS[0].clientId).toBe("marketplace");
  });
});
