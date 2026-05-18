import { describe, expect, it } from "vitest";
import type { CharacterId } from "../types";
import { createTournament, simulateTournament } from "./tournament";

describe("tournament system", () => {
  it("creates the same bracket for the same seed", () => {
    expect(createTournament("plum-rain")).toEqual(createTournament("plum-rain"));
  });

  it("places the full nine-fighter roster into sixteen slots with seven byes", () => {
    const tournament = createTournament("all-fighters");
    const fighters = tournament.slots.filter((slot) => slot.fighterId);
    const byes = tournament.slots.filter((slot) => slot.isBye);

    expect(tournament.slots).toHaveLength(16);
    expect(tournament.matches[0].round).toBe("RoundOf16");
    expect(fighters).toHaveLength(9);
    expect(byes).toHaveLength(7);
  });

  it("plays from first round to a single champion", () => {
    const replay = simulateTournament("full-run");

    expect(replay.champion).toBeTruthy();
    expect(replay.matches.filter((match) => match.round === "Final")).toHaveLength(1);
    expect(replay.matches.every((match) => match.winner)).toBe(true);
    expect(replay.battles).toHaveLength(8);
  });

  it("creates a two-fighter entry tournament as a final match", () => {
    const selected: CharacterId[] = ["thunder-discipline", "seahorse-overlord"];
    const tournament = createTournament("duel-entry", selected);
    const replay = simulateTournament("duel-entry", selected);

    expect(tournament.slots).toHaveLength(2);
    expect(tournament.matches).toHaveLength(1);
    expect(tournament.matches[0].round).toBe("Final");
    expect(replay.battles).toHaveLength(1);
    expect(selected).toContain(replay.champion);
  });

  it("pads a five-fighter entry tournament into an eight-slot bracket", () => {
    const selected: CharacterId[] = [
      "thunder-discipline",
      "seahorse-overlord",
      "seal-judge",
      "golden-soul-maiden",
      "glass-heart",
    ];
    const tournament = createTournament("five-entry", selected);
    const fighters = tournament.slots.flatMap((slot) => (slot.fighterId ? [slot.fighterId] : []));
    const byes = tournament.slots.filter((slot) => slot.isBye);

    expect(tournament.slots).toHaveLength(8);
    expect(fighters).toHaveLength(5);
    expect(byes).toHaveLength(3);
    expect(fighters.every((fighterId) => selected.includes(fighterId))).toBe(true);
  });
});
