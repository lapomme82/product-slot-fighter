import { describe, expect, it } from "vitest";
import { createRng, shuffle } from "./rng";

describe("seeded rng", () => {
  it("returns the same sequence for the same seed", () => {
    const first = createRng("same-seed");
    const second = createRng("same-seed");

    expect([first.next(), first.next(), first.next()]).toEqual([second.next(), second.next(), second.next()]);
  });

  it("shuffles deterministically", () => {
    const items = ["a", "b", "c", "d", "e"];

    expect(shuffle(items, createRng("shuffle"))).toEqual(shuffle(items, createRng("shuffle")));
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
  });
});
