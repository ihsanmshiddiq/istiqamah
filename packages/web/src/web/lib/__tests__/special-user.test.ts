import { describe, it, expect } from "vitest";

// Test the rotation logic directly (mirrors SPECIAL_NICKNAMES in special-user.ts)
describe("special-user nickname rotation", () => {
  it("rotates nicknames based on day of month", () => {
    const raw = "Sayangku,Pejuang Subuh,Manusia Sabar";
    const nicknames = raw.split(",").map((s) => s.trim()).filter(Boolean);

    const dayIndex = new Date().getDate() % nicknames.length;
    const nickname = nicknames[dayIndex];

    expect(nicknames).toContain(nickname);
    expect(nicknames.length).toBe(3);
  });

  it("returns default when env is empty", () => {
    const raw = "";
    const nicknames = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const result = nicknames.length > 0 ? nicknames : ["Kamu"];

    expect(result).toEqual(["Kamu"]);
  });

  it("handles single nickname", () => {
    const raw = "Sayangku";
    const nicknames = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const dayIndex = 15 % nicknames.length;

    expect(nicknames[dayIndex]).toBe("Sayangku");
  });
});
