import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Hourglass, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addDuration, emptyDuration, isZeroDuration, parseField, type Alarm, type Duration } from "@/lib/alarms";
import { DurationFields, draftFrom, type DurationDraft } from "./DurationFields";
import { unlockAudio } from "@/lib/sound";

function parseDraft(d: DurationDraft) {
  const errors: Partial<Record<keyof DurationDraft, string>> = {};
  const out = emptyDuration();
  (Object.keys(d) as (keyof DurationDraft)[]).forEach((k) => {
    const r = parseField(d[k]);
    if (typeof r === "string") errors[k] = r;
    else out[k] = r;
  });
  return { duration: out as Duration, errors };
}

export function AlarmDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Alarm | null;
  onSave: (a: Alarm) => void;
}) {
  const [mode, setMode] = useState<"duration" | "datetime">("duration");
  const [label, setLabel] = useState("");
  const [rel, setRel] = useState<DurationDraft>(draftFrom());
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("07:00");
  const [snooze, setSnooze] = useState<DurationDraft>(draftFrom({ months: 0, days: 0, hours: 0, minutes: 10 }));
  const [submitted, setSubmitted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    if (editing) {
      const t = new Date(editing.targetAt);
      setMode("datetime");
      setLabel(editing.label);
      setDate(t);
      setTime(format(t, "HH:mm"));
      setSnooze(draftFrom(editing.snooze));
      setRel(draftFrom());
    } else {
      setMode("duration");
      setLabel("");
      setRel(draftFrom());
      setDate(undefined);
      setTime("07:00");
      setSnooze(draftFrom({ months: 0, days: 0, hours: 0, minutes: 10 }));
    }
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, [open, editing]);

  const relParsed = parseDraft(rel);
  const snoozeParsed = parseDraft(snooze);

  const computed = useMemo(() => {
    void tick;
    if (mode === "duration") {
      if (Object.keys(relParsed.errors).length) return { target: null, error: null };
      if (isZeroDuration(relParsed.duration)) return { target: null, error: "Enter at least 1 minute" };
      const t = addDuration(Date.now(), relParsed.duration);
      return t ? { target: t, error: null } : { target: null, error: "That date is beyond what the browser can represent" };
    }
    if (!date) return { target: null, error: "Pick a date" };
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return { target: null, error: "Pick a time" };
    const t = new Date(date);
    t.setHours(h, m, 0, 0);
    if (t.getTime() <= Date.now()) return { target: t, error: "Choose a date and time in the future" };
    return { target: t, error: null };
  }, [mode, rel, date, time, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const snoozeError = Object.keys(snoozeParsed.errors).length
    ? null
    : isZeroDuration(snoozeParsed.duration)
      ? "Snooze must be at least 1 minute"
      : !addDuration(Date.now(), snoozeParsed.duration)
        ? "Snooze is beyond what the browser can represent"
        : null;

  const valid =
    computed.target && !computed.error && !snoozeError && !Object.keys(snoozeParsed.errors).length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    unlockAudio();
    if (!valid || !computed.target) return;
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      label: label.trim(),
      targetAt: computed.target.getTime(),
      enabled: true,
      snooze: snoozeParsed.duration,
      snoozedUntil: null,
      snoozeCount: 0,
    });
    onOpenChange(false);
  };

  const showErr = submitted || mode === "datetime";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-card sm:max-w-lg">
        <form onSubmit={handleSave} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? "Edit alarm" : "New alarm"}</DialogTitle>
            <DialogDescription>Times use your device's time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="alarm-label">Label (optional)</Label>
            <Input id="alarm-label" value={label} maxLength={80} placeholder="e.g. Take medicine" onChange={(e) => setLabel(e.target.value)} />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="duration" className="gap-2 py-2"><Hourglass className="size-4" />After a duration</TabsTrigger>
              <TabsTrigger value="datetime" className="gap-2 py-2"><CalendarClock className="size-4" />Date & time</TabsTrigger>
            </TabsList>
            <TabsContent value="duration" className="mt-4 space-y-3">
              <DurationFields idPrefix="rel" value={rel} onChange={setRel} fields={["days", "hours", "minutes"]} errors={relParsed.errors} />
            </TabsContent>
            <TabsContent value="datetime" className="mt-4">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className={cn("h-12 w-full justify-start font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon />
                        {date ? format(date, "EEE, MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alarm-time">Time</Label>
                  <Input id="alarm-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-12 font-mono" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="rounded-xl border border-border bg-glow p-4" aria-live="polite">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Will ring</p>
            {computed.target && !computed.error ? (
              <p className="mt-1 font-display text-lg">{format(computed.target, "EEEE, MMMM d, yyyy 'at' h:mm a")}</p>
            ) : (
              <p className={cn("mt-1 text-sm", showErr && computed.error ? "text-destructive" : "text-muted-foreground")}>
                {showErr && computed.error ? computed.error : "Enter a time to preview"}
              </p>
            )}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Snooze duration</legend>
            <DurationFields idPrefix="snooze" value={snooze} onChange={setSnooze} fields={["months", "days", "hours", "minutes"]} errors={snoozeParsed.errors} />
            {snoozeError && <p className="text-xs text-destructive">{snoozeError}</p>}
            <p className="text-xs text-muted-foreground">
              No upper limit. Months are added as calendar months first (Jan 31 + 1 month = Feb 28/29), then days, hours and minutes.
            </p>
          </fieldset>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="glow" size="lg">{editing ? "Save changes" : "Create alarm"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
