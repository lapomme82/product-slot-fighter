import type { AttackAction, DefenseAction, Fighter } from "../simulation/types";

export const CHARACTER_MOTIONS = [
  "weakAttack",
  "strongAttack",
  "special",
  "block",
  "dodge",
  "counter",
  "hurt",
  "grandCounter",
] as const;

export type CharacterMotion = (typeof CHARACTER_MOTIONS)[number];

export const CHARACTER_FRAME_COUNT = 6;

export function getAnimationFrameKey(
  fighterId: Fighter["id"],
  motion: CharacterMotion,
  frameIndex: number,
) {
  return `anim-${fighterId}-${motion}-${frameIndex}`;
}

export function getAnimationFramePath(
  fighterId: Fighter["id"],
  motion: CharacterMotion,
  frameIndex: number,
) {
  return `/assets/sprites/${fighterId}/${motion}/${frameIndex.toString().padStart(2, "0")}.png`;
}

export function motionForAttack(action: AttackAction): CharacterMotion | null {
  if (action === "WeakAttack") {
    return "weakAttack";
  }
  if (action === "StrongAttack") {
    return "strongAttack";
  }
  if (action === "Special") {
    return "special";
  }
  return null;
}

export function motionForDefense(action: DefenseAction): CharacterMotion | null {
  if (action === "Block") {
    return "block";
  }
  if (action === "Dodge") {
    return "dodge";
  }
  if (action === "Counter") {
    return "counter";
  }
  if (action === "RainbowReflect") {
    return "grandCounter";
  }
  return null;
}
