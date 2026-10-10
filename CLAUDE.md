# Notes for Claude Code

Full spec and roadmap: docs/SPEC.md. Current status is in README.md.

- Work one roadmap phase at a time. At the end of a phase, run `npm test`, show what works, and stop for review.
- Keep the analysis pipeline as small, separately testable functions (one per step).
- All tunable numbers go in config/tuning.json.
- Keep README.md updated with how to run backend, frontend and CLI.
- Ask before adding a large dependency or changing schema/song.schema.json. After a schema change, run `npm run gen:types`.
