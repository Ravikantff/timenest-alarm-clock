import { format } from "date-fns";
import { Pencil, Trash2, AlarmClock, Moon, Music } from "lucide-react";
import { useBlobUrl } from "@/hooks/use-blob-url";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration, nextRing, relativeLabel, type Alarm } from "@/lib/alarms";

export function AlarmCard({
  alarm,
  now,
  onToggle,
  onEdit,
  onDelete,
}: {
  alarm: Alarm;
  now: number;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ring = new Date(nextRing(alarm));
  const past = ring.getTime() <= now;
  const imageUrl = useBlobUrl(alarm.imageId);
  return (
    <li className={cn("rounded-2xl border border-border bg-card p-5 shadow-card transition-opacity", !alarm.enabled && "opacity-60")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("font-mono text-4xl font-light tabular-nums", alarm.enabled ? "text-foreground" : "text-muted-foreground")}>
            {format(ring, "h:mm")}
            <span className="ml-1 text-lg">{format(ring, "a")}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{format(ring, "EEE, MMM d, yyyy")}</p>
          <p className="mt-1 truncate font-medium">{alarm.label || "Alarm"}</p>
        </div>
        {imageUrl && <img src={imageUrl} alt="" className="ml-auto h-20 w-auto max-w-28 rounded-lg object-contain" />}
        <Switch checked={alarm.enabled} onCheckedChange={onToggle} aria-label={`${alarm.enabled ? "Disable" : "Enable"} ${alarm.label || "alarm"}`} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", alarm.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
          <AlarmClock className="size-3.5" />
          {!alarm.enabled ? "Off" : past ? "Due now" : relativeLabel(ring.getTime(), now)}
        </span>
        {alarm.snoozedUntil && alarm.enabled && (
          <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">Snoozed ×{alarm.snoozeCount}</span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
          <Moon className="size-3.5" />Snooze {formatDuration(alarm.snooze)}
        </span>
        {alarm.ringtoneName && (
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            <Music className="size-3.5 shrink-0" /><span className="truncate">{alarm.ringtoneName}</span>
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit alarm"><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete alarm" className="hover:text-destructive"><Trash2 /></Button>
        </div>
      </div>
    </li>
  );
}
