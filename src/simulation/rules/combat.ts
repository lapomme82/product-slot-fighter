import { FIGHTER_BY_ID } from "../../content/fighters";
import type {
  AttackAction,
  AttackReelSymbol,
  BattleLogEntry,
  CharacterId,
  DefenseAction,
  DefenseReelSymbol,
} from "../types";

export interface DamageResult {
  targetDamage: number;
  reflectedDamage: number;
  summary: string;
}

function baseDamage(attacker: CharacterId, action: AttackAction): number {
  const fighter = FIGHTER_BY_ID[attacker];

  switch (action) {
    case "WeakAttack":
      return fighter.weakDamage;
    case "StrongAttack":
      return fighter.strongDamage;
    case "Special":
      return fighter.specialDamage;
    case "AttackFail":
      return 0;
  }
}

export function resolveDamage(
  attacker: CharacterId,
  attackAction: AttackAction,
  defenseAction: DefenseAction,
): DamageResult {
  const rawDamage = baseDamage(attacker, attackAction);

  if (attackAction === "AttackFail") {
    return {
      targetDamage: 0,
      reflectedDamage: 0,
      summary: "공격 릴이 맞지 않아 공격 꽝이 발생했다.",
    };
  }

  switch (defenseAction) {
    case "DefenseFail":
      return {
        targetDamage: rawDamage,
        reflectedDamage: 0,
        summary: "방어 릴이 맞지 않아 공격이 그대로 들어갔다.",
      };
    case "Block":
      return {
        targetDamage: Math.ceil(rawDamage * 0.5),
        reflectedDamage: 0,
        summary: "막기 성공. 피해가 절반으로 줄었다.",
      };
    case "Dodge":
      if (attackAction === "WeakAttack") {
        return {
          targetDamage: rawDamage,
          reflectedDamage: 0,
          summary: "회피 실패. 약공격은 피하지 못했다.",
        };
      }

      return {
        targetDamage: 0,
        reflectedDamage: 0,
        summary: "회피 성공. 공격을 완전히 흘렸다.",
      };
    case "Counter":
      if (attackAction === "Special") {
        return {
          targetDamage: rawDamage,
          reflectedDamage: 0,
          summary: "반격 실패. 필살기는 받아치지 못했다.",
        };
      }

      return {
        targetDamage: 0,
        reflectedDamage: rawDamage,
        summary: "반격 성공. 공격 피해를 그대로 되돌렸다.",
      };
  }
}

export function createLogEntry(
  turn: number,
  attacker: CharacterId,
  defender: CharacterId,
  attackAction: AttackAction,
  defenseAction: DefenseAction,
  attackReels: [AttackReelSymbol, AttackReelSymbol, AttackReelSymbol],
  defenseReels: [DefenseReelSymbol, DefenseReelSymbol, DefenseReelSymbol],
): BattleLogEntry {
  const damage = resolveDamage(attacker, attackAction, defenseAction);

  return {
    turn,
    attacker,
    defender,
    attackAction,
    defenseAction,
    attackReels,
    defenseReels,
    targetDamage: damage.targetDamage,
    reflectedDamage: damage.reflectedDamage,
    summary: damage.summary,
  };
}
