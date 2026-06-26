export function createAudio() {
  let ctx = null;
  let noiseBuf = null;
  let muted = false;
  const ensure = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

  function blip(freq, durMs, type = 'square', gain = 0.05) {
    const ac = ensure();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(ac.destination);
    const now = ac.currentTime;
    o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000); o.stop(now + durMs / 1000);
  }

  function noise() {
    const ac = ensure();
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 1), ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    return s;
  }

  function chirp(f0, f1, durMs, gain, type = 'square', delayMs = 0) {
    const ac = ensure();
    const o = ac.createOscillator(); const g = ac.createGain();
    const now = ac.currentTime + delayMs / 1000;
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f1, now + durMs / 1000);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    o.connect(g).connect(ac.destination);
    o.start(now); o.stop(now + durMs / 1000 + 0.02);
  }

  return {
    resume() { const ac = ensure(); if (ac.state === 'suspended') ac.resume(); },
    setMuted(on) { muted = !!on; },
    isMuted() { return muted; },

    jump() { if (muted) return; blip(560, 110, 'square'); },
    hit() { if (muted) return; blip(180, 240, 'sawtooth', 0.07); },
    sphere() { if (muted) return; blip(880, 90, 'triangle', 0.06); },
    win() { if (muted) return; blip(660, 120); setTimeout(() => { if (!muted) blip(990, 180); }, 130); },

    // Snake: a short filtered-noise hiss.
    snake() {
      if (muted) return;
      const ac = ensure();
      const s = noise();
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5500;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 7000; bp.Q.value = 0.7;
      const g = ac.createGain();
      const now = ac.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.05, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      s.connect(hp).connect(bp).connect(g).connect(ac.destination);
      s.start(now); s.stop(now + 0.45);
    },

    // Bat: a raspy descending screech (two detuned saws + vibrato) with a short
    // wing-flutter of noise. Lower and harsher than a bird chirp.
    bat() {
      if (muted) return;
      const ac = ensure();
      const now = ac.currentTime;
      [{ f0: 1100, f1: 280 }, { f0: 1040, f1: 300 }].forEach((s) => {
        const o = ac.createOscillator(); const g = ac.createGain(); const bp = ac.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(s.f0, now);
        o.frequency.exponentialRampToValueAtTime(s.f1, now + 0.28);
        bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 4;
        const lfo = ac.createOscillator(); const lg = ac.createGain();
        lfo.frequency.value = 30; lg.gain.value = 70; // fast vibrato = leathery screech
        lfo.connect(lg).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        o.connect(bp).connect(g).connect(ac.destination);
        o.start(now); o.stop(now + 0.32);
        lfo.start(now); lfo.stop(now + 0.32);
      });
      const s = noise();
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.03, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      s.connect(hp).connect(ng).connect(ac.destination);
      s.start(now); s.stop(now + 0.2);
    },

    // Spirit/ghost: an eerie wavering wail (vibrato + downward glide), two voices.
    spirit() {
      if (muted) return;
      const ac = ensure();
      const now = ac.currentTime;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.05, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      g.connect(ac.destination);
      const lfo = ac.createOscillator(); const lfoGain = ac.createGain();
      lfo.frequency.value = 6; lfoGain.gain.value = 18;
      lfo.connect(lfoGain);
      [330, 247].forEach((f, i) => {
        const o = ac.createOscillator(); o.type = i ? 'triangle' : 'sine';
        o.frequency.setValueAtTime(f, now);
        o.frequency.exponentialRampToValueAtTime(f * 0.8, now + 0.9);
        lfoGain.connect(o.frequency);
        o.connect(g);
        o.start(now); o.stop(now + 0.95);
      });
      lfo.start(now); lfo.stop(now + 0.95);
    },
  };
}
