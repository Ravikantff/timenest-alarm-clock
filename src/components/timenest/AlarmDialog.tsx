import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Hourglass, CalendarClock, Music, ImageIcon, Play, Square, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { MediaPicker } from "./MediaPicker";
import { useBlobUrl } from "@/hooks/use-blob-url";
import { deleteBlob, putBlob, storageErrorMessage } from "@/lib/media-store";
import { previewDefault, stopRinging } from "@/lib/sound";
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

type Media = { kind: "stored"; id: string; name: string } | { kind: "file"; file: File; name: string } | null;

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
  const [ringtone, setRingtone] = useState<Media>(null);
  const [image, setImage] = useState<Media>(null);
  const [volume, setVolume] = useState(80);
  const [mediaErr, setMediaErr] = useState<{ audio?: string | null; image?: string | null; save?: string | null }>({});
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ringtoneUrl = useBlobUrl(ringtone ? (ringtone.kind === "file" ? ringtone.file : ringtone.id) : null);
  const imageUrl = useBlobUrl(image ? (image.kind === "file" ? image.file : image.id) : null);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setMediaErr({});
    setPreviewing(false);
    setRingtone(editing?.ringtoneId ? { kind: "stored", id: editing.ringtoneId, name: editing.ringtoneName ?? "Custom ringtone" } : null);
    setImage(editing?.imageId ? { kind: "stored", id: editing.imageId, name: editing.imageName ?? "Image" } : null);
    setVolume(Math.round((editing?.volume ?? 0.8) * 100));
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
    return () => {
      clearInterval(t);
      stopRinging();
    };
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
    t.setHours(h ?? 0, m ?? 0, 0, 0);
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

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, ringtoneUrl]);

  const stopPreview = () => {
    audioRef.current?.pause();
    stopRinging();
    setPreviewing(false);
  };
  const togglePreview = () => {
    unlockAudio();
    if (previewing) return stopPreview();
    if (ringtone && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setPreviewing(true)).catch(() =>
        setMediaErr((m) => ({ ...m, audio: "This browser can't play that audio format. Try MP3 or WAV." })),
      );
    } else {
      previewDefault(volume / 100);
    }
  };

  const pickAudio = (f: File) => {
    stopPreview();
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i.test(f.name))
      return setMediaErr((m) => ({ ...m, audio: "That file isn't an audio file." }));
    const probe = document.createElement("audio");
    if (f.type && probe.canPlayType(f.type) === "")
      return setMediaErr((m) => ({ ...m, audio: `This browser can't play ${f.type} files. Try MP3 or WAV.` }));
    setMediaErr((m) => ({ ...m, audio: null }));
    setRingtone({ kind: "file", file: f, name: f.name });
  };
  const pickImage = (f: File) => {
    if (!f.type.startsWith("image/")) return setMediaErr((m) => ({ ...m, image: "That file isn't an image." }));
    setMediaErr((m) => ({ ...m, image: null }));
    setImage({ kind: "file", file: f, name: f.name });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    unlockAudio();
    stopPreview();
    if (!valid || !computed.target || saving) return;
    setSaving(true);
    const created: string[] = [];
    let ringtoneId: string | null = null;
    let imageId: string | null = null;
    try {
      ringtoneId = ringtone?.kind === "file" ? await putBlob(ringtone.file) : (ringtone?.id ?? null);
      if (ringtone?.kind === "file") created.push(ringtoneId!);
      imageId = image?.kind === "file" ? await putBlob(image.file) : (image?.id ?? null);
    } catch (err) {
      created.forEach((id) => void deleteBlob(id));
      setMediaErr((m) => ({ ...m, save: storageErrorMessage(err) }));
      setSaving(false);
      return;
    }
    if (editing?.ringtoneId && editing.ringtoneId !== ringtoneId) void deleteBlob(editing.ringtoneId);
    if (editing?.imageId && editing.imageId !== imageId) void deleteBlob(editing.imageId);
    setSaving(false);
    onSave({
      ringtoneId,
      ringtoneName: ringtone?.name ?? null,
      imageId,
      imageName: image?.name ?? null,
      volume: volume / 100,
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

          <fieldset className="space-y-4">
            <legend className="text-sm font-medium">Ringtone & image</legend>
            <MediaPicker
              id="ringtone-file"
              label="Ringtone"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus"
              icon={Music}
              fileName={ringtone?.name ?? null}
              emptyText="Default chime"
              onPick={pickAudio}
              onRemove={() => { stopPreview(); setRingtone(null); }}
              error={mediaErr.audio}
            >
              {ringtoneUrl && <audio ref={audioRef} src={ringtoneUrl} onEnded={() => setPreviewing(false)} preload="auto" />}
              <div className="mt-3 flex items-center gap-3">
                <Button type="button" size="sm" variant="secondary" onClick={togglePreview} aria-label={previewing ? "Stop preview" : "Preview ringtone"}>
                  {previewing ? <Square /> : <Play />}
                  {previewing ? "Stop" : "Preview"}
                </Button>
                <Volume2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Slider value={[volume]} min={0} max={100} step={1} onValueChange={([v]) => setVolume(v ?? 0)} aria-label="Alarm volume" className="flex-1" />
                <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{volume}%</span>
              </div>
            </MediaPicker>
            <MediaPicker
              id="image-file"
              label="Wake-up image"
              accept="image/*"
              icon={ImageIcon}
              fileName={image?.name ?? null}
              emptyText="No image"
              onPick={pickImage}
              onRemove={() => setImage(null)}
              error={mediaErr.image}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Selected wake-up image preview"
                  className="mt-3 h-auto max-h-64 w-full rounded-lg object-contain"
                  onError={() => setMediaErr((m) => ({ ...m, image: "This browser can't display that image format." }))}
                />
              )}
            </MediaPicker>
            <p className="text-xs text-muted-foreground">Files are saved only in this browser on this device. Images keep their original size and quality.</p>
            {mediaErr.save && <p role="alert" className="text-sm text-destructive">{mediaErr.save}</p>}
          </fieldset>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="glow" size="lg" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create alarm"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
