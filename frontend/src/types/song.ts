/* Generated from schema/song.schema.json by npm run gen:types. Do not edit. */

export type PitchClass = number;

/**
 * Analysis result for one song. Contract between backend and frontend. Pitch classes: 0 = C ... 11 = B.
 */
export interface Song {
  /**
   * Schema version. Bump to invalidate old caches.
   */
  version: 1;
  /**
   * SHA-256 of the source file.
   */
  id: string;
  title: string;
  /**
   * Seconds.
   */
  duration: number;
  sample_rate: number;
  stems: {
    mix: string;
    vocals: string;
    accompaniment: string;
  };
  pitch_curve: {
    /**
     * Seconds between frames.
     */
    hop: number;
    /**
     * Hz per frame, 0 = unvoiced.
     */
    f0: number[];
    confidence: number[];
  };
  notes: Note[];
  keys: KeySegment[];
  chords: ChordSegment[];
  beats: number[];
  /**
   * BPM, 0 if unknown.
   */
  tempo: number;
}
export interface Note {
  start: number;
  end: number;
  midi: number;
  confidence: number;
}
export interface KeySegment {
  start: number;
  end: number;
  tonic: PitchClass;
  mode: "major" | "minor";
  confidence: number;
}
export interface ChordSegment {
  start: number;
  end: number;
  root: PitchClass;
  quality: "maj" | "min" | "7" | "maj7" | "min7" | "sus2" | "sus4" | "dim";
  pcs: PitchClass[];
  confidence: number;
}
