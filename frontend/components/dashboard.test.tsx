import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { Dashboard } from "./dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

test("renders the upload and empty library experience", async () => {
  render(<Dashboard />);
  expect(screen.getByRole("heading", { name: "Add a recording" })).toBeInTheDocument();
  expect(await screen.findByText("No recordings yet.")).toBeInTheDocument();
});
