import { useEffect, useState } from "react";
import { fetchHealth, type Health } from "./api";

type State = { kind: "loading" } | { kind: "ok"; health: Health } | { kind: "error"; message: string };

export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((health) => setState({ kind: "ok", health }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: "error", message: String(error) });
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Sing-Along Pitch Coach</h1>
      <p data-testid="health">
        {state.kind === "loading" && "Checking backend…"}
        {state.kind === "ok" && `Backend OK (v${state.health.version}, song schema v${state.health.song_schema_version})`}
        {state.kind === "error" && `Backend unreachable: ${state.message}`}
      </p>
    </main>
  );
}
