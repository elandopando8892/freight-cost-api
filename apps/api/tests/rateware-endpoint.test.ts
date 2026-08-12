import { describe, expect, it } from "vitest";
import { trustedRatewareEndpoint } from "../src/modules/ratebooks/rateware-endpoint.js";

describe("trustedRatewareEndpoint", () => {
  it("accepts HTTPS in production", () => {
    expect(
      trustedRatewareEndpoint(
        "https://rateware.example.com/api/receive",
        "production",
      ),
    ).toBe("https://rateware.example.com/api/receive");
  });

  it("rejects non-HTTPS and credentials in production", () => {
    expect(() =>
      trustedRatewareEndpoint("http://rateware.example.com/receive", "production"),
    ).toThrow("HTTPS");
    expect(() =>
      trustedRatewareEndpoint(
        "https://user:secret@rateware.example.com/receive",
        "production",
      ),
    ).toThrow("embedded credentials");
  });

  it("allows HTTP only for a local development receiver", () => {
    expect(
      trustedRatewareEndpoint("http://127.0.0.1:8787/receive", "development"),
    ).toBe("http://127.0.0.1:8787/receive");
    expect(() =>
      trustedRatewareEndpoint("http://192.168.1.10/receive", "development"),
    ).toThrow("HTTPS");
  });
});
