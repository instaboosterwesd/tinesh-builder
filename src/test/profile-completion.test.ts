import { describe, expect, it } from "vitest";
import { needsProfileCompletion, validateProfileDetails } from "@/lib/profile-completion";

describe("Required profile details after sign-in", () => {
  it("prompts users without a database profile", () => {
    expect(needsProfileCompletion(null)).toBe(true);
  });
  it("prompts a Google user with a name but no Telegram username", () => {
    expect(needsProfileCompletion({ name: "Google User" })).toBe(true);
  });
  it("prompts users missing their name", () => {
    expect(needsProfileCompletion({ telegram_id: "tinesh" })).toBe(true);
  });
  it("skips the dialog only when both details are saved", () => {
    expect(needsProfileCompletion({ name: "Tinesh", telegram_id: "tinesh" })).toBe(false);
  });
  it("does not accept blank or at-sign-only details", () => {
    expect(needsProfileCompletion({ name: " ", telegram_id: "@" })).toBe(true);
    expect(() => validateProfileDetails({ name: "Tinesh", telegram_id: "@" })).toThrow("Telegram username is required");
    expect(() => validateProfileDetails({ name: " ", telegram_id: "tinesh" })).toThrow("Name is required");
  });
  it("saves the name and normalized Telegram username", () => {
    expect(validateProfileDetails({ name: " Tinesh ", telegram_id: " @tinesh " })).toEqual({ name: "Tinesh", telegram_id: "tinesh" });
  });
});