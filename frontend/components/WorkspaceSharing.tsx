"use client";

import { Copy, Link2 } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useOptionalWorkspace, useSwitchWorkspace } from "@/components/WorkspaceProvider";
import { ApiError } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import type { TranslationKey } from "@/lib/i18n/en";
import {
  clearLinkCode,
  createWorkspace,
  parseWorkspaceCode,
  readLinkCode,
  readRecentWorkspaces,
  workspaceLink,
} from "@/lib/workspace";

type CopyResult = "link" | "code" | "failed" | null;

/** Copies something and remembers what to tell the person. */
function useCopy() {
  const [result, setResult] = useState<CopyResult>(null);
  const copy = async (kind: "link" | "code", text: string) =>
    setResult((await copyText(text)) ? kind : "failed");
  return [result, copy] as const;
}

const COPY_MESSAGE: Record<Exclude<CopyResult, null>, TranslationKey> = {
  link: "syncCopiedLink",
  code: "syncCopiedCode",
  failed: "syncCopyFailed",
};

/** Always on the page (empty until something is copied), so screen readers announce changes. */
function CopyStatus({ result }: { result: CopyResult }) {
  const t = useT();
  return (
    <p role="status" className="text-sm">
      {result && t(COPY_MESSAGE[result])}
    </p>
  );
}

/** Asks before swapping the tasks on this device, and offers to save the current code first. */
function SwitchConfirm({
  currentCode,
  busy,
  onConfirm,
  onCancel,
}: {
  currentCode: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [copied, copy] = useCopy();

  return (
    <div className="space-y-3">
      <p className="text-sm">{t("syncConfirmBody")}</p>
      <Button icon={Copy} onClick={() => void copy("code", currentCode)}>
        {t("syncCopyCurrent")}
      </Button>
      <CopyStatus result={copied} />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onConfirm} disabled={busy}>
          {busy ? t("syncOpening") : t("syncConfirmYes")}
        </Button>
        <Button onClick={onCancel} disabled={busy}>
          {t("syncConfirmNo")}
        </Button>
      </div>
    </div>
  );
}

const isMissing = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 422);

/**
 * Settings section for using the same tasks on another device: copy this workspace's link or
 * code, or open someone's (your own) other workspace by pasting its code or link.
 */
export function WorkspaceSharing({ onSwitched }: { onSwitched: () => void }) {
  const t = useT();
  const titleId = useId();
  const id = useOptionalWorkspace();
  const switchTo = useSwitchWorkspace();
  const [copied, copy] = useCopy();
  const [entry, setEntry] = useState("");
  const [pending, setPending] = useState<string | null>(null); // a code waiting for "Yes, open it"
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const recent = readRecentWorkspaces().filter((code) => code !== id);

  if (!id) return null; // Settings opened before the workspace is ready; the section appears after

  function review(event: FormEvent) {
    event.preventDefault();
    const code = parseWorkspaceCode(entry);
    setPending(null);
    if (!code) return setError(t("syncInvalid"));
    if (code === id) return setError(t("syncSame"));
    setError(null);
    setPending(code);
  }

  // Switching is safe without a prompt for these: the current workspace goes onto the list.
  async function open(code: string | Promise<string>) {
    setBusy(true);
    try {
      await switchTo(await code);
      onSwitched();
    } catch (failure) {
      setError(isMissing(failure) ? t("syncNotFound") : t("syncNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await switchTo(pending);
      onSwitched();
    } catch (failure) {
      setPending(null);
      setError(isMissing(failure) ? t("syncNotFound") : t("syncNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={titleId} className="space-y-4 border-t border-border pt-5">
      <div>
        <h3 id={titleId} className="text-base font-bold">
          {t("syncTitle")}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{t("syncHint")}</p>
      </div>

      <Field label={t("syncCodeLabel")}>
        {(control) => (
          <Input
            {...control}
            readOnly
            value={id}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          icon={Link2}
          onClick={() => void copy("link", workspaceLink(id, window.location.origin))}
        >
          {t("syncCopyLink")}
        </Button>
        <Button icon={Copy} onClick={() => void copy("code", id)}>
          {t("syncCopyCode")}
        </Button>
      </div>
      <CopyStatus result={copied} />
      <p className="text-sm text-text-secondary">{t("syncPrivacy")}</p>

      <form onSubmit={review} className="space-y-3" noValidate>
        <Field label={t("syncOpenLabel")} hint={t("syncOpenHint")} error={error}>
          {(control) => (
            <Input
              {...control}
              value={entry}
              onChange={(event) => {
                setEntry(event.target.value);
                setError(null);
                setPending(null);
              }}
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>
        <Button type="submit" disabled={busy || entry.trim() === ""}>
          {t("syncOpenButton")}
        </Button>
      </form>

      <div className="space-y-3 border-t border-border pt-4">
        <Button disabled={busy} onClick={() => void open(createWorkspace())}>
          {t("syncNewButton")}
        </Button>
        <p className="text-sm text-text-secondary">{t("syncNewHint")}</p>
        {recent.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold">{t("syncRecentTitle")}</h4>
            <ul className="space-y-2">
              {recent.map((code) => (
                <li key={code} className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs">…{code.slice(-8)}</span>
                  <Button disabled={busy} onClick={() => void open(code)}>
                    {t("syncSwitchBack")}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {pending && (
        <Notice tone="attention" title={t("syncConfirmTitle")}>
          <SwitchConfirm
            currentCode={id}
            busy={busy}
            onConfirm={() => void confirm()}
            onCancel={() => setPending(null)}
          />
        </Notice>
      )}
    </section>
  );
}

/**
 * When someone opens a "use on another device" link in a browser that already has its own
 * tasks, ask before replacing them. (A browser with no tasks of its own just takes the link.)
 */
export function SharedLinkPrompt() {
  const t = useT();
  const titleId = useId();
  const id = useOptionalWorkspace();
  const switchTo = useSwitchWorkspace();
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Looks at the address bar now, and again whenever only the part after "#" changes: pasting
    // a link into a tab that already has the app open is not a page load.
    function checkAddress() {
      const link = readLinkCode();
      if (!link) return;
      if (link === id) return clearLinkCode(); // already here: just tidy the address bar
      setCode(link);
    }

    // Reading the address bar can only happen in the browser, after the workspace is known.
    checkAddress();
    window.addEventListener("hashchange", checkAddress);
    return () => window.removeEventListener("hashchange", checkAddress);
  }, [id]);

  function dismiss() {
    clearLinkCode();
    setCode(null);
    setError(null);
  }

  async function confirm() {
    if (!code) return;
    setBusy(true);
    try {
      await switchTo(code);
      dismiss();
    } catch (failure) {
      setError(isMissing(failure) ? t("syncNotFound") : t("syncNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={code !== null} onClose={dismiss} labelledBy={titleId} locked={busy}>
      {code && id && (
        <div className="space-y-4">
          <h2 id={titleId} className="text-title font-bold">
            {t("syncLinkTitle")}
          </h2>
          <SwitchConfirm
            currentCode={id}
            busy={busy}
            onConfirm={() => void confirm()}
            onCancel={dismiss}
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-danger-text">
              {error}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
