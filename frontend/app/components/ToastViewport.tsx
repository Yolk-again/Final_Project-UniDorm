"use client";

import { useEffect } from "react";

export type ToastMessage = {
  title: string;
  description?: string;
  tone?: "success" | "error" | "info";
};

export default function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`experience-toast toast-${toast.tone || "info"}`} role="status" aria-live="polite">
      <span className="experience-toast-icon" aria-hidden="true">
        {toast.tone === "error" ? "!" : toast.tone === "success" ? "✓" : "✦"}
      </span>
      <div className="experience-toast-copy">
        <strong>{toast.title}</strong>
        {toast.description ? <span>{toast.description}</span> : null}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">×</button>
    </div>
  );
}
