"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteManagedContentAction } from "@/lib/actions/contents";

export function ContentDeleteButton({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (!window.confirm("このコンテンツを削除しますか？")) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", id);
          await deleteManagedContentAction(fd);
          router.refresh();
        });
      }}
    >
      {pending ? "削除中…" : "削除"}
    </button>
  );
}
