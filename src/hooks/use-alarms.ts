import { useCallback, useEffect, useRef, useState } from "react";
import { deleteBlob } from "@/lib/media-store";
import { addDuration, loadAlarms, nextRing, saveAlarms, type Alarm } from "@/lib/alarms";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ringingId, setRingingId] = useState<string | null>(null);
  const ringingRef = useRef<string | null>(null);
  ringingRef.current = ringingId;

  useEffect(() => {
    setAlarms(loadAlarms());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveAlarms(alarms);
  }, [alarms, loaded]);

  const check = useCallback(() => {
    if (ringingRef.current) return;
    const now = Date.now();
    setAlarms((list) => {
      const due = list
        .filter((a) => a.enabled && nextRing(a) <= now)
        .sort((a, b) => nextRing(a) - nextRing(b))[0];
      if (due) setRingingId(due.id);
      return list;
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    check();
    const t = setInterval(check, 1000);
    const onVis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", check);
    };
  }, [loaded, check]);

  const upsert = (a: Alarm) =>
    setAlarms((l) => (l.some((x) => x.id === a.id) ? l.map((x) => (x.id === a.id ? a : x)) : [...l, a]));
  const remove = (id: string) => {
    const a = alarms.find((x) => x.id === id);
    if (a?.ringtoneId) void deleteBlob(a.ringtoneId);
    if (a?.imageId) void deleteBlob(a.imageId);
    setAlarms((l) => l.filter((x) => x.id !== id));
  };
  const toggle = (id: string, enabled: boolean) =>
    setAlarms((l) => l.map((x) => (x.id === id ? { ...x, enabled, snoozedUntil: enabled ? x.snoozedUntil : null } : x)));

  const stop = () => {
    const id = ringingRef.current;
    setAlarms((l) => l.map((x) => (x.id === id ? { ...x, enabled: false, snoozedUntil: null, snoozeCount: 0 } : x)));
    setRingingId(null);
  };

  const snooze = (): Date | null => {
    const id = ringingRef.current;
    const a = alarms.find((x) => x.id === id);
    if (!a) return null;
    const next = addDuration(Date.now(), a.snooze);
    if (!next) return null;
    setAlarms((l) =>
      l.map((x) => (x.id === id ? { ...x, snoozedUntil: next.getTime(), snoozeCount: x.snoozeCount + 1 } : x)),
    );
    setRingingId(null);
    return next;
  };

  return { alarms, loaded, ringing: alarms.find((a) => a.id === ringingId) ?? null, upsert, remove, toggle, stop, snooze };
}
