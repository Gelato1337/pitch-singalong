"""Command-line entry point: `analyze song.mp3`. Pipeline arrives in phase 2."""

import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="analyze", description="Analyze a song file into song.json + stems.")
    parser.add_argument("song", help="Path to an MP3, WAV, FLAC or M4A file")
    args = parser.parse_args(argv)
    print(f"analyze: pipeline not implemented yet (phase 2). Got: {args.song}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
