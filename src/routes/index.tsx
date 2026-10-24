import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Plus, AlarmClockOff, Info, Palette } from "lucide-react";
import { useAppearance } from "@/hooks/use-appearance";
import { useBlobUrl } from "@/hooks/use-blob-url";
import { AppearanceSheet } from "@/components/timenest/AppearanceSheet";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAlarms, useNow } from "@/hooks/use-alarms";
import { nextRing, type Alarm } from "@/lib/alarms";
import { AlarmCard } from "@/components/timenest/AlarmCard";
import { AlarmDialog } from "@/components/timenest/AlarmDialog";
import { RingingOverlay } from "@/components/timenest/RingingOverlay";
import { unlockAudio } from "@/lib/sound";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TimeNest — Alarm clock in your browser" },
      { name: "description", content: "Set alarms by duration or date, with fully custom snooze lengths. Runs in your browser." },
      { property: "og:title", content: "TimeNest — Alarm clock in your browser" },
      { property: "og:description", content: "Set alarms by duration or date, with fully custom snooze lengths." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const now = useNow();
  const { alarms, loaded, ringing, upsert, remove, toggle, stop, snooze } = useAlarms();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Alarm | null>(null);
  const [deleting, setDeleting] = useState<Alarm | null>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const { appearance, setAppearance } = useAppearance();
  const bgUrl = useBlobUrl(appearance.bgImageId);

  const sorted = [...alarms].sort((a, b) => Number(b.enabled) - Number(a.enabled) || nextRing(a) - nextRing(b));

  const openNew = () => {
    unlockAudio();
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-app">
      {bgUrl && (
        <div aria-hidden className="fixed inset-0 -z-0">
          <img src={bgUrl} alt="" className="size-full object-cover" />
          <div className="bg-overlay absolute inset-0" />
        </div>
      )}
      <main className="relative mx-auto flex max-w-2xl flex-col gap-8 px-5 pb-28 pt-8 sm:pt-14">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-xl tracking-tight">Time<span className="text-primary">Nest</span></h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{now ? Intl.DateTimeFormat().resolvedOptions().timeZone : ""}</span>
            <Button variant="ghost" size="icon" onClick={() => setAppearanceOpen(true)} aria-label="Appearance settings"><Palette /></Button>
          </div>
        </header>

        <section aria-label="Current time" className="rounded-3xl border border-border bg-clock p-8 text-center shadow-card">
          <p className="font-mono text-6xl font-extralight tabular-nums sm:text-8xl" aria-live="off">
            {now ? format(now, "h:mm") : "--:--"}
            <span className="text-3xl text-muted-foreground sm:text-4xl">{now ? format(now, ":ss") : ""}</span>
            <span className="ml-2 text-xl text-primary sm:text-2xl">{now ? format(now, "a") : ""}</span>
          </p>
          <p className="mt-3 text-muted-foreground">{now ? format(now, "EEEE, MMMM d, yyyy") : "\u00a0"}</p>
        </section>

        <div role="note" className="flex gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            TimeNest is a web app, not a native alarm. Alarms ring only while this page is open. If the browser is closed, the tab is suspended, or your device sleeps, it may ring late or not at all. Keep the tab open and the volume up.
          </p>
        </div>

        <section aria-labelledby="alarms-h" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="alarms-h" className="font-display text-lg">Alarms</h2>
            <Button variant="glow" onClick={openNew} className="hidden sm:inline-flex"><Plus />New Alarm</Button>
          </div>
          {loaded && sorted.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <AlarmClockOff className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-3 font-medium">No alarms yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Try "in 25 minutes" for a focus session, or pick a date like next Tuesday at 7:00 AM.</p>
              <Button variant="glow" className="mt-5" onClick={openNew}><Plus />New Alarm</Button>
            </div>
          )}
          <ul className="space-y-3">
            {now &&
              sorted.map((a) => (
                <AlarmCard
                  key={a.id}
                  alarm={a}
                  now={now}
                  onToggle={(v) => {
                    if (v && nextRing(a) <= Date.now()) {
                      toast.error("This alarm's time has passed. Edit it to pick a new time.");
                      return;
                    }
                    toggle(a.id, v);
                  }}
                  onEdit={() => { unlockAudio(); setEditing(a); setDialogOpen(true); }}
                  onDelete={() => setDeleting(a)}
                />
              ))}
          </ul>
        </section>
      </main>

      <Button variant="glow" size="lg" onClick={openNew} className="fixed bottom-6 left-1/2 h-14 -translate-x-1/2 rounded-full px-8 text-base sm:hidden">
        <Plus />New Alarm
      </Button>

      <AlarmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={(a) => {
          upsert(a);
          toast.success(`Alarm set for ${format(a.targetAt, "EEE, MMM d 'at' h:mm a")}`);
        }}
      />

      <AppearanceSheet open={appearanceOpen} onOpenChange={setAppearanceOpen} appearance={appearance} onChange={setAppearance} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this alarm?</AlertDialogTitle>
            <AlertDialogDescription>"{deleting?.label || "Alarm"}" will be removed permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) remove(deleting.id); setDeleting(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {ringing && (
        <RingingOverlay
          alarm={ringing}
          onStop={stop}
          onSnooze={() => {
            const next = snooze();
            if (next) toast(`Snoozed until ${format(next, "EEE, MMM d 'at' h:mm a")}`);
            else toast.error("Couldn't calculate snooze time");
          }}
        />
      )}
    </div>
  );
}
