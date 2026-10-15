import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "./Badge";
import { Button, buttonClasses } from "./Button";
import { Card } from "./Card";
import { Dialog } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { Field, Input } from "./Field";
import { IconButton } from "./IconButton";
import { Notice } from "./Notice";
import { Skeleton } from "./Skeleton";

describe("Button", () => {
  it("is a plain button by default, so it never submits a form by accident", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("can submit a form and respects disabled", async () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" disabled>
          Send
        </Button>
        <Button type="submit">Go</Button>
      </form>,
    );

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("keeps the icon out of the accessible name", () => {
    render(
      <Button icon={Trash2} variant="destructive">
        Delete
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives links the same look through buttonClasses", () => {
    expect(buttonClasses("primary", "lg")).toContain("bg-primary");
    expect(buttonClasses("primary", "lg")).toContain("min-h-12");
    expect(buttonClasses()).toContain("min-h-11"); // the 44 px touch target
  });
});

describe("IconButton", () => {
  it("is named by its label", async () => {
    const onClick = vi.fn();
    render(<IconButton label="Close" icon={Trash2} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("Field", () => {
  it("ties the label to the control", () => {
    render(<Field label="Title">{(control) => <Input {...control} />}</Field>);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });

  it("describes the control with its hint and announces the error", () => {
    render(
      <Field label="Title" hint="A short action" error="Please add a title">
        {(control) => <Input {...control} />}
      </Field>,
    );

    const input = screen.getByLabelText("Title");
    expect(input).toHaveAccessibleDescription("A short action Please add a title");
    expect(input).toBeInvalid();
    expect(screen.getByRole("alert")).toHaveTextContent("Please add a title");
  });

  it("adds no aria attributes when there is nothing to describe", () => {
    render(<Field label="Title">{(control) => <Input {...control} />}</Field>);

    const input = screen.getByLabelText("Title");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});

describe("Badge", () => {
  it("always shows its text", () => {
    render(
      <Badge tone="attention" icon={Trash2}>
        Check this
      </Badge>,
    );

    expect(screen.getByText("Check this")).toBeVisible();
  });
});

describe("Notice", () => {
  it("announces errors, but not calmer messages", () => {
    const { rerender } = render(<Notice tone="error">Could not save</Notice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");

    rerender(<Notice tone="attention">Heads up</Notice>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can use a real heading for its title and show an action", () => {
    render(
      <Notice tone="attention" title="Busy day" titleAs="h2" action={<Button>Move it</Button>}>
        You have a lot planned.
      </Notice>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Busy day" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move it" })).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("shows a heading, text and the next step", () => {
    render(
      <EmptyState
        title="Not found"
        titleAs="h1"
        text="Nothing here."
        action={<Button>Back</Button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Not found" })).toBeInTheDocument();
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("is decorative about its illustration", () => {
    const { container } = render(<EmptyState illustration="day-clear" text="All clear." />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});

describe("Card and Skeleton", () => {
  it("renders as the element it is asked to be", () => {
    render(
      <ul>
        <Card as="li">Task</Card>
      </ul>,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent("Task");
  });

  it("hides the skeleton from screen readers", () => {
    const { container } = render(<Skeleton />);

    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

function DialogHarness({ locked = false }: { locked?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="t" locked={locked}>
        <h2 id="t">Edit task</h2>
        <button type="button">Inside</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens as a modal named by its heading", async () => {
    render(<DialogHarness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
  });

  it("closes on Esc through the parent, never by itself", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");

    const notPrevented = fireEvent(dialog, new Event("cancel", { cancelable: true })); // false when the handler called preventDefault

    expect(notPrevented).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on a backdrop click, but not on a click inside", async () => {
    render(<DialogHarness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    await userEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("dialog")); // the backdrop is the dialog element itself
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open on Esc and backdrop clicks while locked (e.g. a save is running)", async () => {
    render(<DialogHarness locked />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await userEvent.click(dialog);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
