// Haunted-house horror ambience (WebAudio, no asset files):
// a low detuned dread drone, a slow eerie music-box motif in A harmonic-minor,
// and a sparse low "dread pulse". Lookahead scheduler keeps timing tight.
export function createMusic() {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let playing = false;
  let enabled = true;
  let step = 0;
  let nextTime = 0;
  let timer = null;
  let drone = []; // persistent nodes (stopped on stop())
  let noiseBuf = null;

  function makeNoise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    return s;
  }

  const BPM = 74;
  const stepDur = 60 / BPM;     // one quarter-note per step
  const LEN = 16;               // 4 bars
  // Eerie, sparse motif (MIDI; 0 = rest). A harmonic minor incl. G# leading tone.
  const MEL = [69, 0, 72, 0, 71, 0, 68, 0, 65, 0, 67, 0, 64, 0, 0, 0];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function ensure() {
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  // Music-box / celesta-ish bell with an inharmonic shimmer and long decay.
  function bell(freq, t, gain) {
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 2.01; // slightly detuned partial = unsettling
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g); o2.connect(g); g.connect(lp).connect(master);
    o.start(t); o2.start(t); o.stop(t + 1.9); o2.stop(t + 1.9);
  }

  // Low dread pulse (slow heartbeat-ish thud).
  function boom(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(72, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
    g.gain.setValueAtTime(0.13, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.65);
  }

  function startDrone() {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320;
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 130; // slow filter sweep = "breathing"
    lfo.connect(lfoG).connect(lp.frequency);
    const dg = ctx.createGain();
    dg.gain.value = 0.10;
    lp.connect(dg).connect(master);
    const oscs = [55, 55.4, 82.41].map((f) => { // A1, detuned A1 (beating), E2
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start();
      return o;
    });
    lfo.start();

    // Faint wind/whisper: looping noise through a slowly-sweeping bandpass, with
    // a gentle gusting volume LFO. Very low in the mix.
    const wind = makeNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 620; bp.Q.value = 0.8;
    const windLfo = ctx.createOscillator();
    const windLfoG = ctx.createGain();
    windLfo.frequency.value = 0.13; windLfoG.gain.value = 420; // sweep the "whoosh"
    windLfo.connect(windLfoG).connect(bp.frequency);
    const windGain = ctx.createGain();
    windGain.gain.value = 0.02;
    const gustLfo = ctx.createOscillator();
    const gustDepth = ctx.createGain();
    gustLfo.frequency.value = 0.09; gustDepth.gain.value = 0.013; // gusting volume
    gustLfo.connect(gustDepth).connect(windGain.gain);
    wind.connect(bp).connect(windGain).connect(master);
    wind.start(); windLfo.start(); gustLfo.start();

    drone = [...oscs, lfo, wind, windLfo, gustLfo];
  }

  function scheduleStep(s, t) {
    const n = MEL[s % LEN];
    if (n) bell(midi(n), t, 0.085);
    if (s % 8 === 0) boom(t); // twice per loop
  }

  function loop() {
    while (nextTime < ctx.currentTime + 0.2) {
      scheduleStep(step, nextTime);
      nextTime += stepDur;
      step = (step + 1) % LEN;
    }
    timer = setTimeout(loop, 40);
  }

  return {
    start() {
      if (!enabled || playing) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      playing = true;
      step = 0;
      nextTime = ctx.currentTime + 0.1;
      startDrone();
      loop();
    },
    stop() {
      playing = false;
      clearTimeout(timer);
      drone.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } try { o.disconnect(); } catch { /* noop */ } });
      drone = [];
    },
    isEnabled() { return enabled; },
    setEnabled(on) { enabled = on; if (!on) this.stop(); },
    toggle() { enabled = !enabled; if (enabled) this.start(); else this.stop(); return enabled; },
  };
}
