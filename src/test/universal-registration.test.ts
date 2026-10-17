import { describe, expect, it } from "vitest";
import { registrationId, registrationRecord, splitRegisterLink, validatePackageName } from "@/lib/universal-registration";

describe("Universal registration", () => {
  it("splits a direct link into the existing domain and invite-code format", () => {
    expect(splitRegisterLink("https://maanwin48.com/register?inviteCode=CW2DUJN&from=web")).toEqual({ domain: "https://maanwin48.com/", invitecode: "register?inviteCode=CW2DUJN&from=web" });
  });
  it("preserves hash-router register links", () => {
    expect(splitRegisterLink("https://yaarwin.fyi/#/register?invitationCode=276871612637")).toEqual({ domain: "https://yaarwin.fyi/#/", invitecode: "register?invitationCode=276871612637" });
  });
  it("writes the same ON switch and six variables as the source app", () => {
    expect(registrationRecord({ name: "My App", image: "https://i.ibb.co/example/logo.png", deposit: "100", telegram: "https://t.me/example", registerLink: "https://example.com/register?inviteCode=ABC" })).toEqual({ switch: "ON", variables: { name: "My App", image: "https://i.ibb.co/example/logo.png", deposit: "100", telegram: "https://t.me/example", domain: "https://example.com/", invitecode: "register?inviteCode=ABC" } });
  });
  it("generates an eight-character ID using only the source alphabet", () => {
    expect(registrationId(() => 0)).toBe("aaaaaaaa");
    expect(registrationId(() => 0.999)).toBe("99999999");
    expect(registrationId()).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{8}$/);
  });
  it("uses the user's valid Universal package name and rejects invalid names", () => {
    expect(validatePackageName(" com.example.myapp ")).toBe("com.example.myapp");
    expect(() => validatePackageName("not-a-package")).toThrow();
    expect(() => validatePackageName("")).toThrow();
  });
  it("rejects credentials and non-web register links", () => {
    expect(() => splitRegisterLink("https://user:pass@example.com/register")).toThrow();
    expect(() => splitRegisterLink("javascript:alert(1)")).toThrow();
  });
});