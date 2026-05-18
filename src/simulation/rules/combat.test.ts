import { describe, expect, it } from "vitest";
import { resolveDamage } from "./combat";

describe("combat resolution", () => {
  it("does nothing when the attack reels do not match", () => {
    expect(resolveDamage("thunder-discipline", "AttackFail", "RainbowReflect")).toMatchObject({
      targetDamage: 0,
      reflectedDamage: 0,
    });
  });

  it("takes full damage when defense reels do not match", () => {
    expect(resolveDamage("thunder-discipline", "WeakAttack", "DefenseFail").targetDamage).toBe(10);
  });

  it("halves all damage on block", () => {
    expect(resolveDamage("emuji", "Special", "Block").targetDamage).toBe(24);
  });

  it("dodges every attack except weak attacks", () => {
    expect(resolveDamage("longing-soul", "WeakAttack", "Dodge").targetDamage).toBe(13);
    expect(resolveDamage("longing-soul", "StrongAttack", "Dodge").targetDamage).toBe(0);
    expect(resolveDamage("longing-soul", "Special", "Dodge").targetDamage).toBe(0);
  });

  it("counters weak and strong attacks but not specials", () => {
    expect(resolveDamage("abacus-ghost", "WeakAttack", "Counter").reflectedDamage).toBe(12);
    expect(resolveDamage("abacus-ghost", "StrongAttack", "Counter").reflectedDamage).toBe(26);
    expect(resolveDamage("abacus-ghost", "Special", "Counter").targetDamage).toBe(44);
  });

  it("rainbow reflects every attack at 1.5x damage", () => {
    expect(resolveDamage("golden-soul-maiden", "Special", "RainbowReflect")).toMatchObject({
      targetDamage: 0,
      reflectedDamage: 75,
    });
  });
});
