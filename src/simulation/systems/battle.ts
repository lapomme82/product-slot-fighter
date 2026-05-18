import { FIGHTER_BY_ID } from "../../content/fighters";
import type { Rng } from "../rng";
import { createLogEntry } from "../rules/combat";
import { resolveAttackReels, resolveDefenseReels, rollAttackReels, rollDefenseReels } from "../rules/slots";
import type { BattleReplay, BattleState, CharacterId, RoundName, TurnResolution } from "../types";

export function createBattle(
  id: string,
  round: RoundName,
  left: CharacterId,
  right: CharacterId,
  rng: Rng,
): BattleState {
  const leftStarts = rng.next() < 0.5;
  const attacker = leftStarts ? left : right;
  const defender = leftStarts ? right : left;

  return {
    id,
    round,
    attacker,
    defender,
    fighters: {
      [left]: { fighterId: left, hp: FIGHTER_BY_ID[left].maxHp },
      [right]: { fighterId: right, hp: FIGHTER_BY_ID[right].maxHp },
    } as Record<CharacterId, { fighterId: CharacterId; hp: number }>,
    turn: 1,
    phase: "idle",
    winner: null,
    log: [],
  };
}

export function resolveTurn(state: BattleState, rng: Rng): TurnResolution {
  if (state.winner) {
    const lastEntry = state.log[state.log.length - 1];
    return { nextState: state, entry: lastEntry };
  }

  const attackReels = rollAttackReels(state.attacker, rng);
  const defenseReels = rollDefenseReels(state.defender, rng);
  const attackAction = resolveAttackReels(attackReels);
  const defenseAction = resolveDefenseReels(defenseReels);
  const entry = createLogEntry(
    state.turn,
    state.attacker,
    state.defender,
    attackAction,
    defenseAction,
    attackReels,
    defenseReels,
  );

  const nextFighters = {
    ...state.fighters,
    [state.attacker]: {
      ...state.fighters[state.attacker],
      hp: Math.max(0, state.fighters[state.attacker].hp - entry.reflectedDamage),
    },
    [state.defender]: {
      ...state.fighters[state.defender],
      hp: Math.max(0, state.fighters[state.defender].hp - entry.targetDamage),
    },
  };

  const attackerHp = nextFighters[state.attacker].hp;
  const defenderHp = nextFighters[state.defender].hp;
  let winner: CharacterId | null = null;

  if (defenderHp <= 0 && attackerHp <= 0) {
    winner = entry.reflectedDamage > entry.targetDamage ? state.defender : state.attacker;
  } else if (defenderHp <= 0) {
    winner = state.attacker;
  } else if (attackerHp <= 0) {
    winner = state.defender;
  }

  return {
    entry,
    nextState: {
      ...state,
      fighters: nextFighters,
      attacker: state.defender,
      defender: state.attacker,
      turn: state.turn + 1,
      phase: winner ? "finished" : "resolve",
      winner,
      log: [...state.log, entry],
    },
  };
}

export function simulateBattle(
  id: string,
  round: RoundName,
  left: CharacterId,
  right: CharacterId,
  rng: Rng,
): BattleReplay {
  let state = createBattle(id, round, left, right, rng);
  const initialAttacker = state.attacker;
  let guard = 0;

  while (!state.winner && guard < 200) {
    state = resolveTurn(state, rng).nextState;
    guard += 1;
  }

  if (!state.winner) {
    const leftHp = state.fighters[left].hp;
    const rightHp = state.fighters[right].hp;
    state = {
      ...state,
      winner: leftHp >= rightHp ? left : right,
      phase: "finished",
    };
  }

  if (!state.winner) {
    throw new Error(`Battle ended without a winner: ${id}`);
  }

  return {
    matchId: id,
    round,
    left,
    right,
    initialAttacker,
    winner: state.winner,
    turns: state.log,
  };
}
