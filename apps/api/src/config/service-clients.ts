import { z } from "zod";

/**
 * Machine-to-machine credentials (contract `fcm.quote-by-route.v1`).
 *
 * `SERVICE_API_CLIENTS` is a comma-separated list of
 * `<client_id>:<sha256_hex_of_secret>:<organization_id>:<role>` entries. Only
 * the SHA-256 of each secret is configured; the plaintext secret lives only in
 * the calling service (e.g. the marketplace's `FREIGHT_API_TOKEN`).
 * An empty value disables service authentication entirely.
 */
export const SERVICE_CLIENT_ROLES = ["VIEWER", "OPERATOR"] as const;
export type ServiceClientRole = (typeof SERVICE_CLIENT_ROLES)[number];

export interface ServiceApiClient {
  clientId: string;
  /** Raw 32-byte SHA-256 digest of the client's secret. */
  secretHash: Buffer;
  orgId: string;
  role: ServiceClientRole;
}

// Organization.id is `@default(cuid())` (Prisma cuid v1: "c" + 24 base36 chars).
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

const entrySchema = z.object({
  clientId: z
    .string()
    .regex(
      /^[A-Za-z0-9._-]{1,64}$/,
      "client_id must be 1-64 chars of [A-Za-z0-9._-]",
    ),
  secretHash: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "sha256 must be 64 hex characters")
    .transform((hex) => hex.toLowerCase()),
  orgId: z
    .string()
    .regex(CUID_PATTERN, "organization_id must be an Organization cuid"),
  role: z.enum(SERVICE_CLIENT_ROLES),
});

const listSchema = z
  .array(entrySchema)
  .superRefine((entries, ctx) => {
    const ids = new Set<string>();
    const hashes = new Set<string>();
    for (const entry of entries) {
      if (ids.has(entry.clientId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate client_id "${entry.clientId}"`,
        });
      }
      if (hashes.has(entry.secretHash)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `client "${entry.clientId}" reuses another client's secret hash`,
        });
      }
      ids.add(entry.clientId);
      hashes.add(entry.secretHash);
    }
  });

/**
 * Parses and validates `SERVICE_API_CLIENTS`. Throws on any malformed entry so
 * a misconfigured deployment fails at startup instead of silently degrading.
 * Error messages never echo the configured hashes.
 */
export function parseServiceApiClients(raw: string | undefined): ServiceApiClient[] {
  const value = (raw ?? "").trim();
  if (value === "") return [];

  const candidates = value.split(",").map((part, index) => {
    const fields = part.trim().split(":");
    if (fields.length !== 4) {
      throw new Error(
        `SERVICE_API_CLIENTS entry #${index + 1} must have the form <client_id>:<sha256_hex>:<organization_id>:<role>`,
      );
    }
    const [clientId, secretHash, orgId, role] = fields;
    return { clientId, secretHash, orgId, role };
  });

  const parsed = listSchema.safeParse(candidates);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => {
        const [index, field] = issue.path;
        return typeof index === "number"
          ? `entry #${index + 1}${field ? ` ${String(field)}` : ""}: ${issue.message}`
          : issue.message;
      })
      .join("; ");
    throw new Error(`Invalid SERVICE_API_CLIENTS: ${detail}`);
  }

  return parsed.data.map((entry) => ({
    clientId: entry.clientId,
    secretHash: Buffer.from(entry.secretHash, "hex"),
    orgId: entry.orgId,
    role: entry.role,
  }));
}
