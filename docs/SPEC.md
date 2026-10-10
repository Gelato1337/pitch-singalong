# Sing-Along Pitch Coach — Build Spec & Roadmap

_As of 2026-10-10_

## Goal and scope

Build a free, local app that takes any song file, finds the lead vocal melody, and scores the user's singing live against it. Correct notes, octaves, and in-key harmonies all count.

**Core user flow**

1. User loads an MP3, WAV, FLAC or M4A file.
2. App analyzes it once (vocals, melody, key, chords) and caches the result.
3. User presses play and sings into the mic.
4. App shows the target melody and the user's pitch on a scrolling piano roll, with cents off and a live score.

**In scope for v1**

- Any song the user owns, processed on their own machine
- Melody scoring with octave folding (an octave up or down counts)
- Harmony scoring against the song's key and current chord
- Latency calibration so lines line up
- Practice tools: loop a section, transpose, slow down

**Not in v1**

- Mobile apps, accounts, cloud sync, social features
- Downloading songs from streaming services
- Lyrics display (stretch goal, see roadmap)

## Tech stack and architecture

Heavy analysis runs once per song in a local Python backend; everything real-time runs in the browser frontend. Playback and mic share one audio clock in the browser, which makes sync much easier.

| Part | Choice | Why |
| --- | --- | --- |
| Backend | Python 3.11, FastAPI, uv | Best ML audio ecosystem |
| Decoding | ffmpeg | Handles any format |
| Vocal separation | Demucs `htdemucs` (or `htdemucs_ft`) | Strong open-source separator |
| Vocal pitch (offline) | RMVPE, fallback torchcrepe | Robust on separated vocals |
| Key detection | Chroma + Krumhansl-Schmuckler profiles, windowed | Simple, no heavy deps |
| Chord detection | Baseline: chroma template matching + HMM smoothing; upgrade later | Start simple, swap in a model |
| Frontend | TypeScript, Vite, React, Canvas 2D | Fast piano roll drawing |
| Live mic pitch | AudioWorklet + YIN or McLeod (MPM) in TS/WASM | Low latency, runs on CPU |
| Packaging (later) | Tauri with Python sidecar | One desktop installer |

GPU is optional. On CPU, Demucs takes roughly the song's length or longer, so show a progress bar and cache results by file hash.

```
Song file ──► Backend (once per song) ──► song.json + stems (cached)
                ffmpeg → Demucs → RMVPE → notes
                                → key + chords
                                        │
                                        ▼
Frontend (real-time): playback ─┬─► piano roll + score
                     mic → YIN ─┘
```

## Offline song analysis

One command turns a song file into a cached `song.json` plus audio stems. It must also run as a CLI (`analyze song.mp3`) for testing.

1. **Hash and cache.** SHA-256 of the file; skip work if results exist.
2. **Decode** to 44.1 kHz stereo WAV with ffmpeg.
3. **Separate** with Demucs into `vocals.wav` and `accompaniment.wav` (sum of the other stems).
4. **Vocal pitch.** Run RMVPE on vocals at 10 ms hop. Keep f0 (Hz) and a voicing confidence per frame.
5. **Clean the curve.**
    - Drop frames under a confidence threshold (tune, start at 0.5).
    - Fix octave jumps: if one short segment jumps 12 semitones from both neighbours, fold it back.
    - Median filter (about 50 ms) to remove spikes but keep vibrato.
6. **Segment into notes.** Group frames into notes: steady pitch within about 0.7 semitones, minimum 80 ms. Store start, end, MIDI note (rounded median), and the raw curve.
7. **Key detection.** Chroma (CQT) from accompaniment, 8 s windows with 2 s hop, correlate with 24 major/minor profiles, smooth with an HMM so the key only changes when the evidence is strong.
8. **Chords.** Beat-synchronous chroma from accompaniment, match against major, minor, 7th, sus and dim templates, smooth with Viterbi. Output segments with root, quality and pitch classes.
9. **Optional beats/tempo** with librosa, for snapping and the metronome.
10. **Write** `song.json` and the stems to the cache folder.

Show progress per step to the UI over a WebSocket or server-sent events.

## Live mic pitch and sync

The user's pitch must update at least 50 times per second with under about 40 ms delay, all in the browser.

**Mic pitch**

- `getUserMedia` with echo cancellation, noise suppression and auto gain **off** (they distort pitch).
- AudioWorklet collects frames: window 2048 samples at 48 kHz, hop 256 (about 5 ms).
- YIN or McLeod pitch method, voice range 60 to 1200 Hz.
- Gate by clarity/confidence and by loudness (RMS) so silence and breath are ignored.
- Light smoothing (median of 3 to 5 frames). Do not over-smooth; singers need to see vibrato and slides.
- Advise headphones: the song leaking into the mic will confuse the tracker.

**Playback and sync**

- Play the original mix (or accompaniment only, as a karaoke toggle) with Web Audio from the cached files.
- Song time = `audioContext.currentTime - startTime`.
- Each mic frame gets a timestamp in the same clock, minus a latency offset.
- Latency offset = output latency + input latency. Start with `outputLatency + baseLatency`, then let the user calibrate:
    - **Auto:** play clicks, record them through the mic (speakers, not headphones), measure the delay.
    - **Manual:** a slider in ms while singing along to a test tone.
- Store the offset per audio device.

**Practice controls**

- Loop A to B, seek on the piano roll
- Transpose ±6 semitones (shift playback and target lines together)
- Slow down to 50 to 100% speed with pitch kept (use a time-stretch library such as SoundTouch/Rubber Band, or pre-render on the backend)

## Scoring: melody, octave, harmony

Each voiced mic frame is turned into a note, compared to what is happening in the song at that moment, and put into one tier. Scoring runs in the frontend so it is instant.

**Per frame**

1. `midi = 69 + 12 * log2(f0 / 440)`, minus any transpose.
2. `note = round(midi)`, `cents = (midi - note) * 100`.
3. `pc = note mod 12` (pitch class; this is what makes octaves count).
4. Look up at song time *t*: target melody note (if any), current chord pitch classes, current key scale.

**Tiers**

| Tier | Rule | Points |
| --- | --- | --- |
| Melody | `pc` equals target `pc` (any octave) | 1.0 |
| Chord tone | `pc` in current chord | 0.8 |
| In key | `pc` in key scale, not in chord | 0.5 if under 300 ms, then 0.2 |
| Out of key | none of the above | 0 |

- Multiply points by an intonation factor: 1.0 within ±25 cents, linear down to 0.5 at ±50 cents.
- Allow a timing window of ±100 ms when matching the melody, so early or late singers are not punished per frame.
- When the target has no note (instrumental part), skip melody and only score chord/key, or do not score at all (setting).
- Unclear chord (low confidence) → fall back to key only.

**Modes** (user setting)

- **Strict melody:** only Melody counts, octave still folded.
- **Free harmony** (default): all tiers.
- **Exact octave:** like Strict, but octave must match too.

**Feedback**

- Live: user's line coloured by tier; a needle showing cents sharp or flat.
- Per note: score for each target note (average of its frames).
- End: total score, accuracy per section, most-missed notes, average cents off (tells the user if they sing flat or sharp).

## Data format

`song.json` is the contract between backend and frontend; version it so old caches can be re-run.

```json
{
  "version": 1,
  "id": "sha256-of-file",
  "title": "from tags or filename",
  "duration": 214.3,
  "sample_rate": 44100,
  "stems": { "mix": "mix.wav", "vocals": "vocals.wav", "accompaniment": "accompaniment.wav" },
  "pitch_curve": { "hop": 0.01, "f0": [0, 0, 220.1], "confidence": [0.1, 0.2, 0.93] },
  "notes": [ { "start": 12.34, "end": 12.81, "midi": 64, "confidence": 0.88 } ],
  "keys": [ { "start": 0.0, "end": 98.2, "tonic": 7, "mode": "major", "confidence": 0.81 } ],
  "chords": [ { "start": 12.0, "end": 14.1, "root": 7, "quality": "maj", "pcs": [7, 11, 2], "confidence": 0.7 } ],
  "beats": [0.52, 1.04],
  "tempo": 115.0
}
```

Store `pitch_curve` as a separate binary or compressed file if it gets large. Pitch classes are 0 = C to 11 = B.

## Roadmap

Eight phases; each ends with something that runs. Do not start a phase until the previous one's "done when" passes.

1. **Setup.** Monorepo: `backend/` (uv, FastAPI, pytest), `frontend/` (Vite, React, TS, vitest), shared `song.json` schema (JSON Schema + generated TS types).
    - Done when: both start with one command and a health check passes.
2. **Offline analysis CLI.** Steps 1–6 of the analysis pipeline (no key/chords yet). Add a debug plot: spectrogram + pitch curve + notes as PNG.
    - Done when: 3 test songs give melody lines that look right in the plot.
3. **Live mic pitch.** AudioWorklet + YIN, a simple page showing current note, Hz and cents.
    - Done when: a sine generator and a real voice read within ±10 cents, delay feels instant.
4. **Sing-along view.** Upload in UI, progress bar, playback, scrolling piano roll with target notes and the live user line, latency calibration.
    - Done when: singing along with a known song, the lines line up by eye.
5. **Melody scoring.** Pitch-class matching, cents factor, timing window, per-note and total score, Strict/Exact modes.
    - Done when: singing the melody exactly scores over 85%; singing it an octave down scores the same in Strict mode.
6. **Harmony scoring.** Key and chord detection in the backend, chord/key tiers and Free harmony mode, chord names shown above the piano roll.
    - Done when: singing a third above the melody scores as harmony; a random wrong note scores as out of key.
7. **Practice features and polish.** Song library, A–B loop, transpose, slow-down, karaoke toggle, results screen, settings.
8. **Packaging.** Tauri app with the Python backend as a sidecar; first-run model download; Windows, macOS, Linux builds.

**Stretch goals (after v1)**

- Lyrics: transcribe vocals with WhisperX, show words with timing
- Score against the real backing vocals as "harmony targets"
- Better chord model (trained CRNN) and better note segmentation
- Vocal range finder and warm-up exercises
- Mobile app (would need on-device separation or a server)

## Testing, risks and notes for Claude Code

**Testing**

- Synthetic audio: sine and sawtooth tones at known notes, with vibrato and octave jumps, to unit-test pitch, segmentation and scoring.
- Scoring unit tests: exact melody, octave down, third above, random notes, silence.
- A few real songs (user provides): visual check with the debug plots.
- Optional accuracy check of the offline pitch tracker on a public dataset such as MIR-1K.

**Risks**

| Risk | Mitigation |
| --- | --- |
| Separation leaves backing vocals or reverb | Confidence gating, octave fix, let user hide bad sections |
| Octave errors in pitch tracking | Octave folding in scoring makes most of them harmless |
| Chord detection is wrong on complex music | Low-confidence chords fall back to key-only scoring |
| Latency differs by device | Calibration, stored per device |
| Slow on CPU-only machines | Cache, progress bar, offer `htdemucs` vs faster model |

**Licensing**

Demucs, torchcrepe and librosa are MIT/ISC-style. Check each RMVPE implementation's license and the license of any pretrained weights. Avoid AGPL libraries (e.g. Essentia) and non-commercial model weights if the app may ever be sold. Users must load their own files; the app downloads nothing.

**Instructions for Claude Code**

- Work one phase at a time. At the end of each phase, run the tests, show what works, and stop for review.
- Keep the analysis pipeline as small, separately testable functions (one per step).
- Put all tunable numbers (thresholds, windows, tier points) in one config file.
- Keep the README updated with how to run the backend, frontend and CLI.
- Ask before adding a large dependency or changing the `song.json` schema.
