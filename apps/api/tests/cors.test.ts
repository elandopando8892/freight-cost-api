import { describe, expect, it } from "vitest";
import {
  corsOptionsForEnvironment,
  parseTrustedOrigins,
} from "../src/config/cors.js";

describe("production CORS", () => {
  it("keeps only valid HTTPS origins", () => {
    expect(
      parseTrustedOrigins(
        "https://app.example.com, http://localhost:3001, invalid, https://qa.example.com/path",
      ),
    ).toEqual(["https://app.example.com", "https://qa.example.com"]);
  });

  it("fails closed in production without an allowlist", () => {
    expect(corsOptionsForEnvironment("production", "").origin).toBe(false);
    expect(corsOptionsForEnvironment("development", "").origin).toBe(true);
  });
});
