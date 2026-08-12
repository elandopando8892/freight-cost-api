import { describe, expect, it } from "vitest";
import { buildBffUpstreamUrl } from "../../web/lib/bff-upstream.js";

describe("BFF upstream contract", () => {
  it("preserves the configured API prefix and query while encoding path segments", () => {
    const url = buildBffUpstreamUrl(
      "https://api.staging.example/fcm-api/",
      ["quotes", "a b"],
      "?include=cost%2Fdetail",
      "production",
    );

    expect(url.toString()).toBe(
      "https://api.staging.example/fcm-api/quotes/a%20b?include=cost%2Fdetail",
    );
  });

  it("rejects traversal and separator path segments", () => {
    for (const path of [[".."], ["quotes/other"], [""], ["safe", "."]]) {
      expect(() =>
        buildBffUpstreamUrl("https://api.staging.example", path, "", "production"),
      ).toThrow("Invalid API path");
    }
  });

  it("requires HTTPS outside local development", () => {
    expect(() =>
      buildBffUpstreamUrl("http://api.staging.example", ["health"], "", "production"),
    ).toThrow("API_URL must use HTTPS in production");

    expect(
      buildBffUpstreamUrl("http://localhost:3000", ["health"], "", "development").toString(),
    ).toBe("http://localhost:3000/health");
  });
});
