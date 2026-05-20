import type { AttackAction, DefenseAction, RoundName } from "../simulation/types";

export const ATTACK_LABELS: Record<AttackAction, string> = {
  WeakAttack: "약공격",
  StrongAttack: "강공격",
  AttackFail: "공격 꽝",
  Special: "필살기",
};

export const DEFENSE_LABELS: Record<DefenseAction, string> = {
  Block: "방어",
  Dodge: "회피",
  Counter: "반격",
  DefenseFail: "방어 꽝",
};

export const ROUND_LABELS: Record<RoundName, string> = {
  RoundOf16: "16강",
  Quarterfinal: "1회전",
  Semifinal: "준결승",
  Final: "결승",
};
