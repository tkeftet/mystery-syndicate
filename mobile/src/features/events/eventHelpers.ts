import { useEffect, useState } from "react";
import { colors } from "../../theme";

/** Live "Xd Yh" / "Yh Zm" countdown to a target date; "ended" once passed. */
export function useCountdown(target?: string | Date): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!target) return;
    const end = new Date(target).getTime();
    function tick() {
      const diff = end - Date.now();
      if (diff <= 0) {
        setLabel("ended");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}

export const EVENT_STATUS_META: Record<
  string,
  { label: string; color: string }
> = {
  upcoming: { label: "UPCOMING", color: colors.info },
  active: { label: "LIVE", color: colors.green },
  completed: { label: "ENDED", color: colors.text.muted },
  archived: { label: "ARCHIVED", color: colors.text.muted },
};

export const EVENT_DIFFICULTY_COLOR: Record<string, string> = {
  easy: colors.green,
  medium: colors.warning,
  hard: colors.coral,
  expert: "#B58BD6",
};

export function formatDuration(sec?: number): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
