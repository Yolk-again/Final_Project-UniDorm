"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationPayload = {
  items?: NotificationItem[];
  unreadCount?: number;
};

type NotificationCenterProps = {
  onNavigate?: (target: string | null) => void;
};

type PopupPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePopupPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.max(1, Math.min(352, window.innerWidth - 24));
    const maxHeight = Math.max(120, Math.min(440, window.innerHeight - 24));
    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    const left = Math.min(Math.max(12, rect.right - width), maxLeft);
    const maxTop = Math.max(12, window.innerHeight - maxHeight - 12);
    const top = Math.min(Math.max(12, rect.bottom + 8), maxTop);

    setPopupPosition({ top, left, width, maxHeight });
  }, []);

  const getNotifications = useCallback(async (): Promise<NotificationPayload> => {
    const response = await apiFetch("/notifications");
    if (!response.ok) throw new Error("Could not load notifications");
    return (await response.json()) as NotificationPayload;
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await getNotifications();
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setUnreadCount(Number(payload.unreadCount ?? 0));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load notifications");
    }
  }, [getNotifications]);

  useEffect(() => {
    let isActive = true;

    const refreshNotifications = () => {
      void getNotifications()
        .then((payload) => {
          if (!isActive) return;
          setItems(Array.isArray(payload.items) ? payload.items : []);
          setUnreadCount(Number(payload.unreadCount ?? 0));
          setError("");
        })
        .catch((loadError: unknown) => {
          if (!isActive) return;
          setError(loadError instanceof Error ? loadError.message : "Could not load notifications");
        });
    };

    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 30000);
    window.addEventListener("unidorm:notifications-changed", refreshNotifications);

    return () => {
      isActive = false;
      window.clearInterval(timer);
      window.removeEventListener("unidorm:notifications-changed", refreshNotifications);
    };
  }, [getNotifications]);

  const toggleOpen = async () => {
    if (isOpen) {
      setIsOpen(false);
      setPopupPosition(null);
      return;
    }

    updatePopupPosition();
    setIsOpen(true);
    setIsLoading(true);
    await loadNotifications();
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setPopupPosition(null);
      }
    };

    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updatePopupPosition]);

  const markAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    setError("");
    try {
      const response = await apiFetch("/notifications/read-all", { method: "PATCH" });
      if (!response.ok) throw new Error("Could not mark notifications as read");
      const now = new Date().toISOString();
      setItems((previous) => previous.map((item) => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("unidorm:notifications-changed"));
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Could not mark notifications as read");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const openItem = async (item: NotificationItem) => {
    setError("");
    if (!item.readAt) {
      try {
        const response = await apiFetch(`/notifications/${item.id}/read`, { method: "PATCH" });
        if (!response.ok) throw new Error("Could not mark this notification as read");
        const updated = (await response.json()) as NotificationItem;
        setItems((previous) => previous.map((entry) => entry.id === item.id ? { ...entry, readAt: updated.readAt || new Date().toISOString() } : entry));
        setUnreadCount((count) => Math.max(0, count - 1));
        window.dispatchEvent(new Event("unidorm:notifications-changed"));
      } catch (markError) {
        setError(markError instanceof Error ? markError.message : "Could not mark this notification as read");
        return;
      }
    }
    setIsOpen(false);
    setPopupPosition(null);
    onNavigate?.(item.link);
  };

  return (
    <div className="relative z-40">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => void toggleOpen()}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 hover:shadow-md"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && popupPosition && typeof document !== "undefined" && createPortal(
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-[200] cursor-default border-0 bg-transparent p-0 active:transform-none"
            style={{ background: "transparent" }}
            onClick={() => {
              setIsOpen(false);
              setPopupPosition(null);
            }}
          />
          <section
            role="dialog"
            aria-label="Notifications"
            className="fixed z-[201] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
              width: popupPosition.width,
              maxHeight: popupPosition.maxHeight,
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                <p className="text-xs text-slate-500">{unreadCount} unread</p>
              </div>
              <button type="button" onClick={() => void markAllRead()} disabled={unreadCount === 0 || isMarkingAll} className="text-xs font-semibold text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:text-slate-400">
                {isMarkingAll ? "Saving…" : "Mark all as read"}
              </button>
            </div>
            {error && <p role="alert" className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading && items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications…</p>
              ) : items.length === 0 ? (
                <div className="px-4 py-9 text-center">
                  <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">✓</span>
                  <p className="text-sm font-semibold text-slate-700">You&apos;re all caught up</p>
                  <p className="mt-1 text-xs text-slate-400">New updates will appear here.</p>
                </div>
              ) : items.map((item) => (
                <button key={item.id} type="button" onClick={() => void openItem(item)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50/70 ${item.readAt ? "bg-white" : "bg-blue-50/60"}`}>
                  <span className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.readAt ? "bg-slate-200" : "bg-blue-600"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{item.title}</span>
                        {!item.readAt && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">NEW</span>}
                      </span>
                      <span className="mt-1 block break-words text-xs leading-5 text-slate-600">{item.message}</span>
                      <span className="mt-2 block text-[10px] font-medium text-slate-400">{formatNotificationDate(item.createdAt)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>,
        document.body,
      )}
    </div>
  );
}
