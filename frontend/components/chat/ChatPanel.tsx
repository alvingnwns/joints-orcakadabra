"use client";

import { MessageCircle, Send, X } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { type Message, ChatMessage } from "@/components/chat/ChatMessage";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { Illustration } from "@/components/illustrations/Illustration";
import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { ApiError } from "@/lib/api";
import { askSchedule } from "@/lib/chat";
import type { TranslationKey } from "@/lib/i18n/en";
import { localDate } from "@/lib/tasks";

type Ask = (question: string, taskId?: string) => void;
type Pending = { question: string; taskId?: string };
type Failure = Pending & { message: TranslationKey };

/** Which calm message fits: no connection, the task is gone, or the helper is down. */
function failureMessage(error: unknown): TranslationKey {
  if (error instanceof ApiError) {
    if (error.kind !== "http") return "chatErrorNetwork";
    if (error.status === 404) return "chatErrorTask";
  }
  return "chatError";
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null); // kept so "Try again" can resend

  // The question field gets focus whenever the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function openPanel() {
    if (open) inputRef.current?.focus();
    else setOpen(true);
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
    } catch (error) {
      setFailed({ ...pending, message: failureMessage(error) });
    } finally {
      setThinking(false);
    }
  }

  const ask: Ask = (text, taskId) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    openPanel();
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

      {/* A compact round button on phones so it covers as little as possible; the words show on
          larger screens, and screen readers always get them. */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={openPanel}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-control bg-primary font-medium text-on-primary shadow-lg not-disabled:hover:bg-primary-hover lg:bottom-4 lg:right-8 lg:px-5"
      >
        <Icon icon={MessageCircle} size={22} />
        <span className="sr-only lg:not-sr-only">{t("chatOpen")}</span>
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="chat-title" variant="side">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 id="chat-title" className="text-section font-semibold">
                {t("chatTitle")}
              </h2>
              <p className="text-sm text-text-secondary">{t("chatCaption")}</p>
            </div>
            <Button icon={X} onClick={() => setOpen(false)}>
              {t("close")}
            </Button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="text-center">
                <Illustration name="chat-helper" width={160} className="mb-3" />
                <p className="text-text-secondary">{t("chatEmpty")}</p>
              </div>
            )}
            {/* role="log" announces each new message politely. */}
            <ul role="log" aria-live="polite" className="space-y-3">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
            </ul>
            {thinking && (
              <p role="status" className="text-sm text-text-secondary motion-safe:animate-pulse">
                {t("chatThinking")}
              </p>
            )}
            {failed && (
              <Notice
                tone="error"
                action={
                  // Asking about a task that no longer exists would fail the same way again.
                  failed.message !== "chatErrorTask" && (
                    <Button onClick={() => void request(failed)}>{t("tryAgain")}</Button>
                  )
                }
              >
                {t(failed.message)}
              </Notice>
            )}
            {messages.length === 0 && <SuggestedQuestions onAsk={ask} disabled={thinking} />}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            <label htmlFor="chat-question" className="block text-sm font-medium">
              {t("chatInputLabel")}
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                ref={inputRef}
                id="chat-question"
                value={question}
                maxLength={MAX_QUESTION_LENGTH}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                icon={Send}
                disabled={thinking || !question.trim()}
                className="whitespace-nowrap"
              >
                {t("chatSend")}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>
    </ChatContext.Provider>
  );
}
