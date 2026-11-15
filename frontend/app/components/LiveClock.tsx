"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="workspace-live-clock" aria-label="Current local time">
      <span className="workspace-live-indicator"><i /> LIVE</span>
      <span className="workspace-clock-time" suppressHydrationWarning>
        {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
      </span>
      <span className="workspace-clock-date" suppressHydrationWarning>
        {now ? now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) : "Loading date"}
      </span>
    </div>
  );
}
