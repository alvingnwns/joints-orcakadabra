import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/components/LocaleProvider";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";

import { SuggestTime } from "./SuggestTime";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const ANSWER = {
  estimated_minutes: 15,
  estimate_reason: "A quick phone call usually takes 10 to 15 minutes.",
};

function fakeBackend(reply: "ok" | "fail" | "invalid" = "ok") {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    const { pathname } = new URL(url);
    if (pathname === "/workspaces") return json({ id: "ws1" }, 201);
    if (pathname === "/tasks/estimate") {
      if (reply === "fail") throw new TypeError("Failed to fetch");
      if (reply === "invalid") return json({ detail: "ai_invalid_output" }, 502);
      return json(ANSWER);
    }
    return json({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderSuggest(props: { title?: string; description?: string; onUse?: () => void } = {}) {
  const onUse = props.onUse ?? vi.fn();
  render(
    <LocaleProvider>
      <WorkspaceProvider>
        <SuggestTime
          title={props.title ?? "Call the bank"}
          description={props.description ?? ""}
          onUse={onUse}
        />
      </WorkspaceProvider>
    </LocaleProvider>,
  );
  return onUse;
}

const suggest = async () => screen.findByRole("button", { name: "Suggest a time" });
const estimateBody = (fetchMock: ReturnType<typeof fakeBackend>) =>
  JSON.parse(
    fetchMock.mock.calls.find(([url]) => url.includes("/tasks/estimate"))![1]!.body as string,
  );

describe("SuggestTime", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("is disabled until the task has a name", async () => {
    fakeBackend();
    renderSuggest({ title: "   " });

    expect(await suggest()).toBeDisabled();
  });

  it("sends what the task actually is (title and notes) and the active language", async () => {
    const fetchMock = fakeBackend();
    renderSuggest({ title: "  Prepare slides ", description: "Twelve slides for the board" });

    await userEvent.click(await suggest());
    await screen.findByText("Suggested: about 15 min");

    expect(estimateBody(fetchMock)).toEqual({
      title: "Prepare slides",
      description: "Twelve slides for the board",
      locale: "en",
    });
  });

  it("leaves the notes out when there are none", async () => {
    const fetchMock = fakeBackend();
    renderSuggest();

    await userEvent.click(await suggest());
    await screen.findByText("Suggested: about 15 min");

    expect(estimateBody(fetchMock)).toEqual({ title: "Call the bank", locale: "en" });
  });

  it("shows the number, the AI's reason, and who decides", async () => {
    fakeBackend();
    renderSuggest();

    await userEvent.click(await suggest());

    expect(await screen.findByText("Suggested: about 15 min")).toBeInTheDocument();
    expect(screen.getByText(ANSWER.estimate_reason)).toBeInTheDocument();
    expect(screen.getByText("Suggested by AI from the task itself. You decide.")).toBeInTheDocument();
  });

  it("uses the number only when the person chooses it", async () => {
    fakeBackend();
    const onUse = renderSuggest();

    await userEvent.click(await suggest());
    await screen.findByText("Suggested: about 15 min");
    expect(onUse).not.toHaveBeenCalled(); // asking changes nothing

    await userEvent.click(screen.getByRole("button", { name: "Use 15 min" }));

    expect(onUse).toHaveBeenCalledWith(15);
    expect(screen.queryByText("Suggested: about 15 min")).not.toBeInTheDocument();
  });

  it("can be dismissed without using it", async () => {
    fakeBackend();
    const onUse = renderSuggest();

    await userEvent.click(await suggest());
    await screen.findByText("Suggested: about 15 min");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onUse).not.toHaveBeenCalled();
    expect(screen.queryByText("Suggested: about 15 min")).not.toBeInTheDocument();
  });

  it.each(["fail", "invalid"] as const)("says calmly that it couldn't (%s)", async (reply) => {
    fakeBackend(reply);
    const onUse = renderSuggest();

    await userEvent.click(await suggest());

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't work out a time");
    expect(onUse).not.toHaveBeenCalled();
    expect(await suggest()).toBeEnabled(); // can try again
  });

  it("speaks Indonesian when that is the language", async () => {
    localStorage.setItem("orca.locale", "id");
    const fetchMock = fakeBackend();
    renderSuggest();

    await userEvent.click(await screen.findByRole("button", { name: "Sarankan waktu" }));

    expect(await screen.findByText("Saran: sekitar 15 mnt")).toBeInTheDocument();
    expect(estimateBody(fetchMock).locale).toBe("id");
  });

  it("is simply absent where there is no workspace to ask with", () => {
    render(<SuggestTime title="Call the bank" description="" onUse={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Suggest a time" })).not.toBeInTheDocument();
  });
});
