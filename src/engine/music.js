// Programmatic 8-bit / chiptune background loop (WebAudio, no asset files).
// Square-wave lead + triangle bass (octave bounce) + kick & hi-hat groove.
// Uses a lookahead scheduler for tight timing. Original composition.
export function createMusic() {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let playing = false;
  let enabled = true;
  let step = 0;
  let nextTime = 0;
  let timer = null;

  const BPM = 142;
  const eighth = 60 / BPM / 2;           // seconds per 8th note
  const LEN = 32;                         // 4 bars of 8 eighth-notes
  const ROOTS = [36, 43, 45, 41];        // C2, G2, A2, F2 (one per bar) — I V vi IV
  // Lead melody in C major (MIDI note per 8th note; 0 = rest).
  const LEAD = [
    76, 0, 72, 76, 79, 0, 76, 0,   // C
    74, 0, 71, 74, 79, 0, 74, 0,   // G
    72, 0, 76, 81, 79, 0, 76, 0,   // Am
    77, 0, 72, 77, 81, 0, 79, 0,   // F
  ];

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function ensure() {
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.38;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function tone(freq, t, dur, type, peak) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.15);
  }

  function hat(t) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(hp).connect(g).connect(master);
    s.start(t);
    s.stop(t + 0.06);
  }

  function scheduleStep(s, t) {
    const within = s % 8;
    const root = ROOTS[Math.floor(s / 8) % 4];
    const ln = LEAD[s % LEN];
    if (ln) tone(midi(ln), t, eighth * 0.9, 'square', 0.06);
    const bass = within % 2 === 0 ? root : root + 12; // root / octave bounce
    tone(midi(bass), t, eighth * 0.95, 'triangle', 0.11);
    if (within === 0 || within === 4) kick(t);
    if (within % 2 === 1) hat(t);
  }

  function loop() {
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextTime);
      nextTime += eighth;
      step = (step + 1) % LEN;
    }
    timer = setTimeout(loop, 25);
  }

  return {
    start() {
      if (!enabled || playing) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      playing = true;
      step = 0;
      nextTime = ctx.currentTime + 0.06;
      loop();
    },
    stop() {
      playing = false;
      clearTimeout(timer);
    },
    isEnabled() { return enabled; },
    setEnabled(on) {
      enabled = on;
      if (!on) this.stop();
    },
    toggle() {
      enabled = !enabled;
      if (enabled) this.start(); else this.stop();
      return enabled;
    },
  };
}
