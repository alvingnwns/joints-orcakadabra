import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { localDate } from "@/lib/tasks";

import { ChatPanel, useAskChat } from "./ChatPanel";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Reply = string | number | "network"; // an answer, an error status, or no connection

/** Fake backend: /chat/query answers with each reply in turn (the last one repeats). */
function fakeBackend(replies: Reply[]) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    const { pathname } = new URL(url);
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    const reply = replies.length > 1 ? replies.shift()! : replies[0];
    if (reply === "network") throw new TypeError("Failed to fetch");
    if (typeof reply === "number") return json({ detail: "ai_unavailable" }, reply);
    return json({ answer: reply });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const chatBodies = (fetchMock: ReturnType<typeof fakeBackend>) =>
  fetchMock.mock.calls
    .filter(([url]) => url.includes("/chat/query"))
    .map(([, init]) => JSON.parse(init!.body as string));

/** Stands in for a focus card's "Why is this here?" button. */
function WhyButton() {
  const ask = useAskChat();
  return (
    <button type="button" onClick={() => ask("Why is this here? (Report)", "task-1")}>
      Why
    </button>
  );
}

function renderPanel() {
  render(
    <LocaleProvider>
      <WorkspaceProvider>
        <ChatPanel>
          <WhyButton />
        </ChatPanel>
      </WorkspaceProvider>
    </LocaleProvider>,
  );
}

async function openPanel() {
  await userEvent.click(await screen.findByRole("button", { name: "Ask about my schedule" }));
  return screen.getByRole("dialog", { name: "Schedule helper" });
}

describe("ChatPanel", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("opens with the caption, suggested questions, and focus in the question field", async () => {
    fakeBackend(["ok"]);
    renderPanel();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialog = await openPanel();

    expect(dialog).toHaveTextContent("Answers are based on your schedule.");
    for (const name of ["What should I do first?", "I only have 2 hours", "What can wait?"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Your question")).toHaveFocus();
  });

  it("asks a suggested question with today and the locale, and shows the answer", async () => {
    const fetchMock = fakeBackend(["Start with the report."]);
    renderPanel();
    await openPanel();

    await userEvent.click(screen.getByRole("button", { name: "What should I do first?" }));

    const log = screen.getByRole("log");
    expect(await screen.findByText("Start with the report.")).toBeInTheDocument();
    expect(log).toHaveTextContent("You: What should I do first?");
    expect(log).toHaveTextContent("Helper: Start with the report.");
    expect(chatBodies(fetchMock)).toEqual([
      { question: "What should I do first?", today: localDate(0), locale: "en" },
    ]);
    // Chips are only the empty state.
    expect(screen.queryByRole("button", { name: "What can wait?" })).not.toBeInTheDocument();
  });

  it("sends a typed question and clears the field", async () => {
    fakeBackend(["Clean the garage can wait."]);
    renderPanel();
    await openPanel();

    const input = screen.getByLabelText("Your question");
    await userEvent.type(input, "What can I skip?{Enter}");

    expect(await screen.findByText("Clean the garage can wait.")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("shows 'Thinking…' while waiting and blocks a second question", async () => {
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.endsWith("/workspaces")
          ? Promise.resolve(json({ id: "ws1" }, 201))
          : new Promise<Response>((resolve) => (finish = resolve)),
      ),
    );
    renderPanel();
    await openPanel();

    await userEvent.type(screen.getByLabelText("Your question"), "What first?{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");
    await userEvent.type(screen.getByLabelText("Your question"), "Another");
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    finish(json({ answer: "The report." }));
    expect(await screen.findByText("The report.")).toBeInTheDocument();
  });

  it("shows a calm error and 'Try again' resends without repeating the question", async () => {
    const fetchMock = fakeBackend([502, "The report first."]);
    renderPanel();
    await openPanel();

    await userEvent.click(screen.getByRole("button", { name: "What should I do first?" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't answer just now");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("The report first.")).toBeInTheDocument();
    expect(screen.getAllByText(/What should I do first\?/)).toHaveLength(1);
    expect(chatBodies(fetchMock)).toHaveLength(2);
  });

  it("says so when the server can't be reached, and still offers 'Try again'", async () => {
    fakeBackend(["network"]);
    renderPanel();
    await openPanel();

    await userEvent.click(screen.getByRole("button", { name: "What should I do first?" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("can't reach the server");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("says a task is gone, without offering a retry that would fail the same way", async () => {
    fakeBackend([404]);
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Why" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("isn't on your list anymore");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("offers four starting questions and says answers are only suggestions", async () => {
    fakeBackend(["ok"]);
    renderPanel();

    const dialog = await openPanel();

    expect(dialog).toHaveTextContent("nothing changes unless you change it");
    expect(screen.getByRole("button", { name: "What can I move to another day?" })).toBeInTheDocument();
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(4);
  });

  it("'Why is this here?' opens the panel and asks about that task", async () => {
    const fetchMock = fakeBackend(["It's due tomorrow."]);
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Why" }));

    expect(screen.getByRole("dialog", { name: "Schedule helper" })).toBeInTheDocument();
    expect(await screen.findByText("It's due tomorrow.")).toBeInTheDocument();
    expect(chatBodies(fetchMock)[0]).toMatchObject({ task_id: "task-1" });
  });

  it("closes with the Close button and keeps the session's messages", async () => {
    fakeBackend(["The report."]);
    renderPanel();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "What should I do first?" }));
    await screen.findByText("The report.");

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await openPanel();
    expect(screen.getByText("The report.")).toBeInTheDocument();
  });

  it("answers in Indonesian when that is the active language", async () => {
    localStorage.setItem("orca.locale", "id");
    const fetchMock = fakeBackend(["Mulai dari laporan."]);
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Tanya soal jadwalku" }));
    await userEvent.click(screen.getByRole("button", { name: "Apa yang bisa ditunda?" }));

    expect(await screen.findByText("Mulai dari laporan.")).toBeInTheDocument();
    expect(chatBodies(fetchMock)[0]).toMatchObject({ locale: "id" });
  });
});
