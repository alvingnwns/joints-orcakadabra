import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { AboutDialog } from "./AboutDialog";

beforeAll(() => {
  // jsdom has no <dialog> methods; browsers do.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

describe("AboutDialog", () => {
  it("opens with the privacy note and closes again", async () => {
    render(<AboutDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "About" }));

    const dialog = screen.getByRole("dialog", { name: "About this app" });
    expect(dialog).toHaveTextContent("third-party AI provider");
    expect(dialog).not.toHaveTextContent(/therap|mental|professional care/i); // C2

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
