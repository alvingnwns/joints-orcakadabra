"use client";

import { useId } from "react";

import { useT } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fill } from "@/lib/i18n";
import type { Task } from "@/lib/tasks";

type Props = { task: Task; onConfirm: () => void; onClose: () => void };

/** Names the task being deleted. Mount it only while asking. Focus starts on the safe choice. */
export function ConfirmDeleteDialog({ task, onConfirm, onClose }: Props) {
  const t = useT();
  const titleId = useId();
  const bodyId = useId();

  return (
    <Dialog open onClose={onClose} labelledBy={titleId} describedBy={bodyId}>
      <h2 id={titleId} className="text-section font-semibold">
        {t("deleteConfirm")}
      </h2>
      <p id={bodyId} className="mt-2">
        {fill(t("deleteBody"), { title: task.title })}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button onClick={onClose}>
          {t("deleteKeep")}
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          {t("deleteYes")}
        </Button>
      </div>
    </Dialog>
  );
}
