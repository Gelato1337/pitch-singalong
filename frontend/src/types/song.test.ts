import { expect, test } from "vitest";
import example from "../../../schema/example.song.json";
import type { Song } from "./song";

test("example song.json matches generated types", () => {
  const song: Song = example as Song;
  expect(song.version).toBe(1);
  expect(song.chords[0].pcs).toEqual([7, 11, 2]);
});
