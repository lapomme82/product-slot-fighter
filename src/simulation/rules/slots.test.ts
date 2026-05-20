import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { resolveAttackReels, resolveDefenseReels, rollAttackReels, rollDefenseReels } from "./slots";

describe("slot reels", () => {
  it("resolves a triple attack reel into that attack", () => {
    expect(resolveAttackReels(["WeakAttack", "WeakAttack", "WeakAttack"])).toBe("WeakAttack");
    expect(resolveAttackReels(["StrongAttack", "StrongAttack", "StrongAttack"])).toBe("StrongAttack");
    expect(resolveAttackReels(["Special", "Special", "Special"])).toBe("Special");
  });

  it("resolves a non-matching attack reel into attack fail", () => {
    expect(resolveAttackReels(["WeakAttack", "StrongAttack", "WeakAttack"])).toBe("AttackFail");
  });

  it("resolves a triple defense reel into that defense", () => {
    expect(resolveDefenseReels(["Block", "Block", "Block"])).toBe("Block");
    expect(resolveDefenseReels(["Dodge", "Dodge", "Dodge"])).toBe("Dodge");
    expect(resolveDefenseReels(["Counter", "Counter", "Counter"])).toBe("Counter");
  });

  it("resolves a non-matching defense reel into defense fail", () => {
    expect(resolveDefenseReels(["Block", "Counter", "Block"])).toBe("DefenseFail");
  });

  it("rolls exactly three symbols per side", () => {
    expect(rollAttackReels("thunder-discipline", createRng("attack-reels"))).toHaveLength(3);
    expect(rollDefenseReels("thunder-discipline", createRng("defense-reels"))).toHaveLength(3);
  });

  it("keeps outcomes near the original slot probabilities while showing three reels", () => {
    const attackRng = createRng("attack-outcome-distribution");
    const defenseRng = createRng("defense-outcome-distribution");
    let attackFails = 0;
    let defenseFails = 0;
    let specials = 0;

    for (let index = 0; index < 10000; index += 1) {
      const attack = resolveAttackReels(rollAttackReels("thunder-discipline", attackRng));
      const defense = resolveDefenseReels(rollDefenseReels("thunder-discipline", defenseRng));
      if (attack === "AttackFail") {
        attackFails += 1;
      }
      if (attack === "Special") {
        specials += 1;
      }
      if (defense === "DefenseFail") {
        defenseFails += 1;
      }
    }

    expect(attackFails).toBeGreaterThan(1100);
    expect(attackFails).toBeLessThan(1900);
    expect(defenseFails).toBeGreaterThan(1100);
    expect(defenseFails).toBeLessThan(1900);
    expect(specials).toBeGreaterThan(300);
    expect(specials).toBeLessThan(800);
  });
});
