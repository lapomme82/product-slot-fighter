import { FIGHTER_BY_ID } from "../../content/fighters";
import { pickWeighted, type Rng } from "../rng";
import type {
  AttackAction,
  AttackReelSymbol,
  CharacterId,
  DefenseAction,
  DefenseReelSymbol,
  WeightedEntry,
} from "../types";

export const BASE_ATTACK_OUTCOME_WEIGHTS: WeightedEntry<AttackAction>[] = [
  { value: "WeakAttack", weight: 50 },
  { value: "StrongAttack", weight: 30 },
  { value: "AttackFail", weight: 15 },
  { value: "Special", weight: 5 },
];

export const BASE_DEFENSE_OUTCOME_WEIGHTS: WeightedEntry<DefenseAction>[] = [
  { value: "Block", weight: 35 },
  { value: "Dodge", weight: 25 },
  { value: "Counter", weight: 20 },
  { value: "DefenseFail", weight: 15 },
];

const ATTACK_SYMBOLS: AttackReelSymbol[] = ["WeakAttack", "StrongAttack", "Special"];
const DEFENSE_SYMBOLS: DefenseReelSymbol[] = ["Block", "Dodge", "Counter"];

function applyBias<T extends string>(
  baseWeights: WeightedEntry<T>[],
  bias: Partial<Record<T, number>>,
): WeightedEntry<T>[] {
  return baseWeights.map((entry) => ({
    value: entry.value,
    weight: Math.max(1, entry.weight + (bias[entry.value] ?? 0)),
  }));
}

function isTriple<T extends string>(reels: [T, T, T]): boolean {
  return reels[0] === reels[1] && reels[1] === reels[2];
}

function makeMissReels<T extends string>(
  symbols: T[],
  weights: WeightedEntry<T>[],
  rng: Rng,
): [T, T, T] {
  const reels: [T, T, T] = [pickWeighted(weights, rng), pickWeighted(weights, rng), pickWeighted(weights, rng)];
  if (isTriple(reels)) {
    const currentIndex = symbols.indexOf(reels[2]);
    reels[2] = symbols[(currentIndex + 1) % symbols.length];
  }
  return reels;
}

export function rollAttackReels(
  fighterId: CharacterId,
  rng: Rng,
): [AttackReelSymbol, AttackReelSymbol, AttackReelSymbol] {
  const fighter = FIGHTER_BY_ID[fighterId];
  const outcome = pickWeighted(applyBias(BASE_ATTACK_OUTCOME_WEIGHTS, fighter.attackBias), rng);
  const reelWeights = BASE_ATTACK_OUTCOME_WEIGHTS.filter(
    (entry): entry is WeightedEntry<AttackReelSymbol> => entry.value !== "AttackFail",
  );

  if (outcome === "AttackFail") {
    return makeMissReels(ATTACK_SYMBOLS, reelWeights, rng);
  }

  return [outcome, outcome, outcome];
}

export function rollDefenseReels(
  fighterId: CharacterId,
  rng: Rng,
): [DefenseReelSymbol, DefenseReelSymbol, DefenseReelSymbol] {
  const fighter = FIGHTER_BY_ID[fighterId];
  const outcome = pickWeighted(applyBias(BASE_DEFENSE_OUTCOME_WEIGHTS, fighter.defenseBias), rng);
  const reelWeights = BASE_DEFENSE_OUTCOME_WEIGHTS.filter(
    (entry): entry is WeightedEntry<DefenseReelSymbol> => entry.value !== "DefenseFail",
  );

  if (outcome === "DefenseFail") {
    return makeMissReels(DEFENSE_SYMBOLS, reelWeights, rng);
  }

  return [outcome, outcome, outcome];
}

export function resolveAttackReels(reels: [AttackReelSymbol, AttackReelSymbol, AttackReelSymbol]): AttackAction {
  return isTriple(reels) ? reels[0] : "AttackFail";
}

export function resolveDefenseReels(reels: [DefenseReelSymbol, DefenseReelSymbol, DefenseReelSymbol]): DefenseAction {
  return isTriple(reels) ? reels[0] : "DefenseFail";
}
