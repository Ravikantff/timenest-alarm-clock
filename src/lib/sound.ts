let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

/** Call from a user gesture so later rings are allowed to play. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

function beep(c: AudioContext, at: number, freq: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.35, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + 0.3);
}

export function startRinging() {
  const c = getCtx();
  if (!c) return;
  void c.resume();
  stopRinging();
  const pattern = () => {
    const t = c.currentTime;
    [0, 0.3, 0.6].forEach((d, i) => beep(c, t + d, i === 2 ? 1046 : 880));
  };
  pattern();
  timer = setInterval(pattern, 1400);
  if ("vibrate" in navigator) navigator.vibrate?.([400, 200, 400]);
}

export function stopRinging() {
  if (timer) clearInterval(timer);
  timer = null;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(0);
}
