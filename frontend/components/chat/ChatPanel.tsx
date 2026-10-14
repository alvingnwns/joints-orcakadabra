"use client";

import {
  type FormEvent,
  type ReactNode,
  createContext,
  useContext,
  useRef,
  useState,
} from "react";

import { type Message, ChatMessage } from "@/components/chat/ChatMessage";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { Illustration } from "@/components/illustrations/Illustration";
import { useLocale } from "@/components/LocaleProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { askSchedule } from "@/lib/chat";
import { localDate } from "@/lib/tasks";

type Ask = (question: string, taskId?: string) => void;
type Pending = { question: string; taskId?: string };

const ChatContext = createContext<Ask>(() => {});

/** Opens the chat panel and asks a question, e.g. from "Why is this here?" on a focus card. */
export function useAskChat(): Ask {
  return useContext(ChatContext);
}

const MAX_QUESTION_LENGTH = 500; // same limit as the backend

/**
 * A slide-over chat about the user's schedule. The native modal <dialog> gives a focus trap,
 * Esc to close, and focus return. Messages live only for this session (nothing is stored).
 */
export function ChatPanel({ children }: { children: ReactNode }) {
  const { t, locale } = useLocale();
  const workspaceId = useWorkspace();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [failed, setFailed] = useState<Pending | null>(null); // kept so "Try again" can resend

  function open() {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    inputRef.current?.focus();
  }

  async function request(pending: Pending) {
    setThinking(true);
    setFailed(null);
    try {
      const { answer } = await askSchedule(workspaceId, {
        question: pending.question,
        today: localDate(0),
        locale,
        ...(pending.taskId && { task_id: pending.taskId }),
      });
      setMessages((current) => [...current, { role: "helper", text: answer }]);
    } catch {
      setFailed(pending);
    } finally {
      setThinking(false);
    }
  }

  const ask: Ask = (text, taskId) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    open();
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    void request({ question: trimmed, taskId });
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(question);
    setQuestion("");
  }

  return (
    <ChatContext.Provider value={ask}>
      {children}

      <button
        type="button"
        aria-haspopup="dialog"
        onClick={open}
        className="fixed bottom-4 right-4 min-h-11 rounded-full bg-ink px-5 font-medium text-cream shadow-lg"
      >
        {t("chatOpen")}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="chat-title"
        className="m-0 ml-auto h-full max-h-none w-full max-w-md bg-surface p-0 text-ink shadow-lg backdrop:bg-ink/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line p-4">
            <div>
              <h2 id="chat-title" className="text-lg font-semibold">
                {t("chatTitle")}
              </h2>
              <p className="text-sm text-muted">{t("chatCaption")}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-full border border-ink px-4 text-sm font-medium hover:bg-cream"
            >
              {t("close")}
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="text-center">
                <Illustration name="chat-helper" width={160} className="mb-3" />
                <p className="text-muted">{t("chatEmpty")}</p>
              </div>
            )}
            {/* role="log" announces each new message politely. */}
            <ul role="log" aria-live="polite" className="space-y-3">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
            </ul>
            {thinking && (
              <p role="status" className="text-sm text-muted motion-safe:animate-pulse">
                {t("chatThinking")}
              </p>
            )}
            {failed && (
              <div role="alert" className="rounded-xl bg-peach p-3 text-sm">
                <p>{t("chatError")}</p>
                <button
                  type="button"
                  onClick={() => void request(failed)}
                  className="mt-2 min-h-11 rounded-full border border-ink px-4 font-medium hover:bg-surface"
                >
                  {t("tryAgain")}
                </button>
              </div>
            )}
            {messages.length === 0 && <SuggestedQuestions onAsk={ask} disabled={thinking} />}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-line p-4">
            <label htmlFor="chat-question" className="block text-sm font-medium">
              {t("chatInputLabel")}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                ref={inputRef}
                id="chat-question"
                value={question}
                maxLength={MAX_QUESTION_LENGTH}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-muted bg-surface px-3"
              />
              <button
                type="submit"
                disabled={thinking || !question.trim()}
                className="min-h-11 rounded-full bg-ink px-5 font-medium text-cream disabled:opacity-50"
              >
                {t("chatSend")}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </ChatContext.Provider>
  );
}
