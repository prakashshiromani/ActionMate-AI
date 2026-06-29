// Web Audio API sounds — no external files, works offline
// AudioContext is created lazily on first call to respect browser autoplay policy

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_ctx.state === "suspended") {
    _ctx.resume();
  }
  return _ctx;
}

function tone(
  c: AudioContext,
  freq: number,
  startOffset: number,
  dur: number,
  vol = 0.12,
  type: OscillatorType = "sine"
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

// Urgent two-tone alert — plays when conflict banner appears
export function playConflictAlert() {
  try {
    const c = getCtx();
    tone(c, 880, 0,    0.12, 0.07, "square");
    tone(c, 660, 0.16, 0.12, 0.07, "square");
    tone(c, 880, 0.32, 0.16, 0.07, "square");
  } catch {}
}

// Soft double-pop — plays when AI sends a message
export function playAiMessage() {
  try {
    const c = getCtx();
    tone(c, 520, 0,    0.1,  0.1);
    tone(c, 680, 0.09, 0.16, 0.08);
  } catch {}
}

// Ascending 3-note chime — plays when action is approved & executed
export function playSuccess() {
  try {
    const c = getCtx();
    tone(c, 440, 0,   0.09, 0.12);
    tone(c, 554, 0.1, 0.09, 0.12);
    tone(c, 659, 0.2, 0.22, 0.10);
  } catch {}
}

// Soft descending tone — plays when action is dismissed
export function playDismiss() {
  try {
    const c = getCtx();
    tone(c, 380, 0,    0.1,  0.09);
    tone(c, 280, 0.13, 0.18, 0.06);
  } catch {}
}

// Celebratory 4-note chime — plays when all subtasks are done
export function playTaskComplete() {
  try {
    const c = getCtx();
    tone(c, 523,  0,    0.08, 0.12);
    tone(c, 659,  0.1,  0.08, 0.12);
    tone(c, 784,  0.2,  0.08, 0.12);
    tone(c, 1047, 0.3,  0.28, 0.10);
  } catch {}
}
