"use client";

import { useT } from "@/components/LocaleProvider";

export type Message = { role: "user" | "helper"; text: string };

/** One chat bubble. Plain text only; line breaks from the model are kept. */
export function ChatMessage({ message }: { message: Message }) {
  const t = useT();
  const mine = message.role === "user";

  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2 ${
          mine ? "bg-ink text-cream" : "bg-sky text-ink"
        }`}
      >
        <span className="sr-only">{t(mine ? "chatYou" : "chatHelper")}: </span>
        {message.text}
      </p>
    </li>
  );
}
