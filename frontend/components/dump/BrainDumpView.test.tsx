import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import type { Draft } from "@/lib/dump";
import { localDate } from "@/lib/tasks";

import { BrainDumpView } from "./BrainDumpView";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const draft = (title: string, extra: Partial<Draft> = {}): Draft => ({
  title,
  due_date: null,
  estimated_minutes: null,
  needs_confirmation: false,
  note: null,
  estimate_is_guess: false,
  estimate_reason: null,
  ...extra,
});

type ParseResult = Draft[] | number | "network" | "invalid"; // drafts, an error status, no connection, or an unusable AI answer

/** Fake backend: /tasks/parse answers with each result in turn; /tasks/bulk can fail once. */
function fakeBackend(parseResults: ParseResult[], options: { failSave?: boolean } = {}) {
  let failSave = options.failSave ?? false;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { pathname } = new URL(url);
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    if (pathname === "/tasks/parse") {
      const result = parseResults.length > 1 ? parseResults.shift()! : parseResults[0];
      if (result === "network") throw new TypeError("Failed to fetch");
      if (result === "invalid") return json({ detail: "ai_invalid_output" }, 502);
      if (typeof result === "number") return json({ detail: "x" }, result);
      return json({ drafts: result });
    }
    if (pathname === "/tasks/bulk") {
      if (failSave) {
        failSave = false;
        return json({ detail: "x" }, 500);
      }
      return json(JSON.parse(init?.body as string).tasks, 201);
    }
    return json({ detail: "not found" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const bodyOf = (fetchMock: ReturnType<typeof fakeBackend>, path: string) =>
  JSON.parse(fetchMock.mock.calls.find(([url]) => url.includes(path))![1]!.body as string);

function renderView() {
  render(
    <LocaleProvider>
      <WorkspaceProvider>
        <BrainDumpView />
      </WorkspaceProvider>
    </LocaleProvider>,
  );
}

async function dump(text: string) {
  await userEvent.type(
    await screen.findByLabelText("Everything on your mind, in any order"),
    text,
  );
  await userEvent.click(screen.getByRole("button", { name: "Sort it out for me" }));
}

describe("BrainDumpView", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("keeps submit disabled while the text is empty", async () => {
    fakeBackend([[]]);
    renderView();

    const submit = await screen.findByRole("button", { name: "Sort it out for me" });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Everything on your mind/), "   ");
    expect(submit).toBeDisabled();
  });

  it("sends the text with today and the active locale, then shows editable drafts", async () => {
    localStorage.setItem("orca.locale", "id");
    const fetchMock = fakeBackend([
      [
        draft("Telepon ibu", { due_date: "2026-10-15" }),
        draft("Selesaikan laporan", { needs_confirmation: true, note: "Jumat ini?" }),
      ],
    ]);
    renderView();

    await userEvent.type(await screen.findByLabelText(/Semua yang ada di pikiranmu/), "besok…");
    await userEvent.click(screen.getByRole("button", { name: "Rapikan untukku" }));

    expect(await screen.findByRole("heading", { name: "Ini yang kami temukan" })).toBeVisible();
    expect(bodyOf(fetchMock, "/tasks/parse")).toEqual({
      text: "besok…",
      today: localDate(0),
      locale: "id",
    });
    expect(screen.getAllByLabelText("Tugas").map((input) => (input as HTMLInputElement).value))
      .toEqual(["Telepon ibu", "Selesaikan laporan"]);
    expect(screen.getByText("Tolong periksa yang ini").closest("p")).toHaveTextContent(
      "Jumat ini?",
    );
  });

  it("lets the user edit and remove drafts, then saves only what is left", async () => {
    const fetchMock = fakeBackend([
      [draft("Call mum", { due_date: "2026-10-15" }), draft("Buy milk", { estimated_minutes: 15 })],
    ]);
    renderView();
    await dump("call mum tomorrow, buy milk");

    const [first] = await screen.findAllByLabelText("Task");
    await userEvent.clear(first);
    await userEvent.type(first, "Call mum about Sunday");
    await userEvent.click(screen.getByRole("button", { name: "Remove: Buy milk" }));
    await userEvent.click(screen.getByRole("button", { name: "Save these" }));

    expect(await screen.findByRole("link", { name: "See today" })).toBeInTheDocument();
    expect(bodyOf(fetchMock, "/tasks/bulk")).toEqual({
      tasks: [{ title: "Call mum about Sunday", impact_score: 3, due_date: "2026-10-15" }],
    });
  });

  it("does not save a draft with an empty title", async () => {
    fakeBackend([[draft("Call mum")]]);
    renderView();
    await dump("call mum");

    await userEvent.clear(await screen.findByLabelText("Task"));

    expect(screen.getByRole("button", { name: "Save these" })).toBeDisabled();
  });

  it("keeps the text and offers manual entry when the AI is unavailable", async () => {
    fakeBackend([502]);
    renderView();
    await dump("call mum tomorrow");

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't sort this out");
    expect(screen.getByRole("link", { name: "Add them manually instead" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByLabelText(/Everything on your mind/)).toHaveValue("call mum tomorrow");
  });

  it("keeps the text when the connection fails, and can try again", async () => {
    fakeBackend(["network", [draft("Call mum")]]);
    renderView();
    await dump("call mum");

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sort it out for me" }));

    expect(await screen.findByLabelText("Task")).toHaveValue("Call mum");
  });

  it("tells an unusable AI answer apart from the AI being down, and keeps the text", async () => {
    fakeBackend(["invalid"]);
    renderView();
    await dump("call mum tomorrow");

    expect(await screen.findByRole("alert")).toHaveTextContent("answer didn't come out right");
    expect(screen.getByRole("link", { name: "Add them manually instead" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Everything on your mind/)).toHaveValue("call mum tomorrow");
  });

  it("says plainly that nothing was saved when the server can't be reached", async () => {
    fakeBackend(["network"]);
    renderView();
    await dump("call mum tomorrow");

    expect(await screen.findByRole("alert")).toHaveTextContent("can't reach the server");
    expect(screen.getByRole("alert")).toHaveTextContent("nothing was sorted or saved");
    // Adding by hand needs the server too, so it is not offered here.
    expect(screen.queryByRole("link", { name: "Add them manually instead" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Everything on your mind/)).toHaveValue("call mum tomorrow");
  });

  it("counts the characters", async () => {
    fakeBackend([[]]);
    renderView();

    expect(await screen.findByText("0 of 5000 characters")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Everything on your mind/), "hello");
    expect(screen.getByText("5 of 5000 characters")).toBeInTheDocument();
  });

  it("shows the AI's estimate with its reason, and drops the reason once the number is changed", async () => {
    fakeBackend([
      [
        draft("Call the bank", {
          estimated_minutes: 15,
          estimate_is_guess: true,
          estimate_reason: "A phone call like this is usually short.",
        }),
        draft("Write the report", { estimated_minutes: 120 }),
      ],
    ]);
    renderView();
    await dump("call the bank, write the 2 hour report");

    expect(await screen.findByText("A phone call like this is usually short.")).toBeInTheDocument();
    expect(screen.getAllByText("AI estimate:")).toHaveLength(1); // not for the stated 2 hours
    const [minutes] = screen.getAllByLabelText(/Time needed/);
    expect(minutes).toHaveValue(15);
    expect(minutes).toHaveAccessibleDescription(/A phone call like this is usually short/);

    await userEvent.clear(minutes);
    await userEvent.type(minutes, "20");

    expect(screen.queryByText("A phone call like this is usually short.")).not.toBeInTheDocument();
  });

  it("marks every draft 'Not saved yet' and lets importance be chosen like for a manual task", async () => {
    const fetchMock = fakeBackend([[draft("Call mum"), draft("Buy milk")]]);
    renderView();
    await dump("call mum, buy milk");

    expect(await screen.findAllByText("Not saved yet")).toHaveLength(2);
    expect(screen.getAllByLabelText("Matters").every((radio) => (radio as HTMLInputElement).checked)).toBe(true);

    await userEvent.click(screen.getAllByLabelText("Really matters")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Save these" }));

    await screen.findByRole("link", { name: "See today" });
    expect(bodyOf(fetchMock, "/tasks/bulk").tasks.map((t: { impact_score: number }) => t.impact_score)).toEqual([5, 3]);
  });

  it("says gently when no tasks were found", async () => {
    fakeBackend([422]);
    renderView();
    await dump("so tired today");

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't find any tasks");
    expect(screen.getByLabelText(/Everything on your mind/)).toHaveValue("so tired today");
  });

  it("keeps the drafts when saving fails, and 'Back to my text' keeps the text", async () => {
    fakeBackend([[draft("Call mum")]], { failSave: true });
    renderView();
    await dump("call mum");

    await userEvent.click(await screen.findByRole("button", { name: "Save these" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't save these");
    expect(screen.getByLabelText("Task")).toHaveValue("Call mum");

    await userEvent.click(screen.getByRole("button", { name: "Back to my text" }));
    expect(screen.getByLabelText(/Everything on your mind/)).toHaveValue("call mum");
  });

  it("shows 'Untangling…' while the AI works", async () => {
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.endsWith("/workspaces")
          ? Promise.resolve(json({ id: "ws1" }, 201))
          : new Promise<Response>((resolve) => (finish = resolve)),
      ),
    );
    renderView();
    await dump("call mum");

    expect(screen.getByRole("status")).toHaveTextContent("Untangling…");
    expect(screen.getByRole("button", { name: "Sort it out for me" })).toBeDisabled();
    finish(json({ drafts: [draft("Call mum")] }));
    expect(await screen.findByLabelText("Task")).toBeInTheDocument();
  });
});
