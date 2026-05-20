import { SELECTABLE_FIGHTERS, isFighterGloballyBanned } from "../../content/fighters";
import { createRng, shuffle } from "../rng";
import { simulateBattle } from "./battle";
import type {
  BracketMatch,
  BracketSlot,
  CharacterId,
  HiddenCharacterEvent,
  RoundName,
  TournamentReplay,
  TournamentState,
} from "../types";

const ROUND_NAMES: RoundName[] = ["RoundOf16", "Quarterfinal", "Semifinal", "Final"];
const ROUND_ID_PREFIX: Record<RoundName, string> = {
  RoundOf16: "r16",
  Quarterfinal: "qf",
  Semifinal: "sf",
  Final: "final",
};

function getBracketSize(fighterCount: number) {
  if (fighterCount < 2) {
    throw new Error("Tournament needs at least two fighters.");
  }
  if (fighterCount > 16) {
    throw new Error("Tournament supports up to sixteen fighters.");
  }
  if (fighterCount <= 2) {
    return 2;
  }
  if (fighterCount <= 4) {
    return 4;
  }
  if (fighterCount <= 8) {
    return 8;
  }
  return 16;
}

function getOpeningRound(bracketSize: number): RoundName {
  if (bracketSize === 16) {
    return "RoundOf16";
  }
  if (bracketSize === 2) {
    return "Final";
  }
  if (bracketSize === 4) {
    return "Semifinal";
  }
  return "Quarterfinal";
}

export function createTournament(seed: string, fighterIds: CharacterId[] = SELECTABLE_FIGHTERS.map((fighter) => fighter.id)): TournamentState {
  const rng = createRng(seed);
  const uniqueFighterIds = [...new Set(fighterIds)].filter((fighterId) => !isFighterGloballyBanned(fighterId));
  const bracketSize = getBracketSize(uniqueFighterIds.length);
  const shuffled = shuffle(uniqueFighterIds, rng);
  const byeCount = bracketSize - shuffled.length;
  const matchCount = bracketSize / 2;
  const byeMatches = new Set(shuffle(Array.from({ length: matchCount }, (_, match) => match), rng).slice(0, byeCount));
  const byeSideByMatch = new Map(Array.from(byeMatches, (match) => [match, rng.integer(0, 1)]));
  const slots: BracketSlot[] = [];
  let fighterIndex = 0;

  for (let slot = 0; slot < bracketSize; slot += 1) {
    const match = Math.floor(slot / 2);
    const side = slot % 2;
    const isBye = byeSideByMatch.get(match) === side;
    slots.push({
      slot,
      fighterId: isBye ? null : shuffled[fighterIndex],
      isBye,
    });
    if (!isBye) {
      fighterIndex += 1;
    }
  }

  const matches = makeFirstRoundMatches(slots);

  return {
    seed,
    slots,
    matches,
    champion: null,
  };
}

function makeFirstRoundMatches(slots: BracketSlot[]): BracketMatch[] {
  const matches: BracketMatch[] = [];
  const round = getOpeningRound(slots.length);
  for (let index = 0; index < slots.length / 2; index += 1) {
    matches.push({
      id: `${ROUND_ID_PREFIX[round]}-${index + 1}`,
      round,
      index,
      left: slots[index * 2].fighterId,
      right: slots[index * 2 + 1].fighterId,
      winner: null,
    });
  }
  return matches;
}

export function applyHiddenCharacters(_seed: string, state: TournamentState) {
  return {
    state,
    events: [] as HiddenCharacterEvent[],
  };
}

function resolveBye(match: BracketMatch): CharacterId | null {
  if (match.left && !match.right) {
    return match.left;
  }
  if (!match.left && match.right) {
    return match.right;
  }
  return null;
}

function makeNextRound(round: RoundName, winners: CharacterId[]): BracketMatch[] {
  const nextMatches: BracketMatch[] = [];
  for (let index = 0; index < winners.length / 2; index += 1) {
    nextMatches.push({
      id: `${round.toLowerCase()}-${index + 1}`,
      round,
      index,
      left: winners[index * 2],
      right: winners[index * 2 + 1],
      winner: null,
    });
  }
  return nextMatches;
}

export function simulateTournamentFromState(seed: string, initial: TournamentState): TournamentReplay {
  const rng = createRng(seed).fork("tournament");
  const allMatches: BracketMatch[] = [];
  const battles = [];
  let currentMatches = initial.matches;
  let roundIndex = ROUND_NAMES.indexOf(currentMatches[0]?.round ?? "Final");
  let champion: CharacterId | null = null;

  if (roundIndex < 0) {
    throw new Error("Tournament has an invalid opening round.");
  }

  for (; roundIndex < ROUND_NAMES.length; roundIndex += 1) {
    const winners: CharacterId[] = [];

    for (const match of currentMatches) {
      const byeWinner = resolveBye(match);
      if (byeWinner) {
        const completed = { ...match, winner: byeWinner };
        allMatches.push(completed);
        winners.push(byeWinner);
        continue;
      }

      if (!match.left || !match.right) {
        throw new Error(`Invalid match without winner: ${match.id}`);
      }

      const replay = simulateBattle(match.id, match.round, match.left, match.right, rng.fork(match.id));
      battles.push(replay);
      const completed = { ...match, winner: replay.winner };
      allMatches.push(completed);
      winners.push(replay.winner);
    }

    if (winners.length === 1) {
      champion = winners[0];
      break;
    }

    const nextRound = ROUND_NAMES[roundIndex + 1];
    if (!nextRound) {
      throw new Error("Tournament ended without reducing to a champion.");
    }
    currentMatches = makeNextRound(nextRound, winners);
  }

  if (!champion) {
    throw new Error("Tournament ended without a champion.");
  }

  return {
    seed,
    initialSlots: initial.slots,
    battles,
    matches: allMatches,
    champion,
  };
}

export function simulateTournament(seed: string, fighterIds?: CharacterId[]): TournamentReplay {
  return simulateTournamentFromState(seed, createTournament(seed, fighterIds));
}
