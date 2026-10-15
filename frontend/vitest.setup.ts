import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom has no <dialog> methods (browsers do); the About, chat, edit and delete dialogs use them.
// Like a browser, showModal() moves focus to the first control inside.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
  this.querySelector<HTMLElement>("button, input, select, textarea, a[href]")?.focus();
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
