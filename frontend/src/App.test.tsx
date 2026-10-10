import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App } from "./App";

afterEach(() => vi.unstubAllGlobals());

test("shows backend status from health check", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ status: "ok", version: "0.1.0", song_schema_version: 1 }))),
  );
  render(<App />);
  expect(await screen.findByText(/Backend OK \(v0\.1\.0, song schema v1\)/)).toBeTruthy();
});

test("shows error when backend is down", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
  render(<App />);
  expect(await screen.findByText(/Backend unreachable/)).toBeTruthy();
});
