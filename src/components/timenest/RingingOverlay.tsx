import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, nextRing, type Alarm } from "@/lib/alarms";
import { startRinging, stopRinging } from "@/lib/sound";

export function RingingOverlay({ alarm, onStop, onSnooze }: { alarm: Alarm; onStop: () => void; onSnooze: () => void }) {
  const stopRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startRinging();
    stopRef.current?.focus();
    const prev = document.title;
    document.title = `⏰ ${alarm.label || "Alarm"} — TimeNest`;
    return () => {
      stopRinging();
      document.title = prev;
    };
  }, [alarm.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const at = new Date(nextRing(alarm));
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="ring-title" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-ring-screen p-6 text-center">
      <div className="ring-pulse flex size-28 items-center justify-center rounded-full bg-primary/20">
        <BellRing className="size-12 text-primary" />
      </div>
      <div>
        <p className="font-mono text-7xl font-light tabular-nums sm:text-8xl">{format(at, "h:mm")}<span className="ml-2 text-2xl">{format(at, "a")}</span></p>
        <h2 id="ring-title" className="mt-3 font-display text-2xl">{alarm.label || "Alarm"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{format(at, "EEEE, MMMM d")}</p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button ref={stopRef} variant="glow" size="lg" className="h-14 text-lg" onClick={onStop}>Stop</Button>
        <Button variant="outline" size="lg" className="h-14 text-lg" onClick={onSnooze}>Snooze {formatDuration(alarm.snooze)}</Button>
      </div>
    </div>
  );
}
