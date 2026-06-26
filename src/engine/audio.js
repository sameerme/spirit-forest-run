export function createAudio() {
  let ctx = null;
  let noiseBuf = null;
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

  // A short pitch-glide chirp (for the bat screech).
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
    jump() { blip(560, 110, 'square'); },
    hit() { blip(180, 240, 'sawtooth', 0.07); },
    sphere() { blip(880, 90, 'triangle', 0.06); },
    win() { blip(660, 120); setTimeout(() => blip(990, 180), 130); },

    // Snake: a short filtered-noise hiss.
    snake() {
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

    // Bat: two quick high screeches.
    bat() {
      chirp(2600, 1500, 90, 0.045, 'square', 0);
      chirp(3000, 1700, 80, 0.04, 'square', 110);
    },

    // Spirit/ghost: an eerie wavering wail (vibrato + downward glide), two voices.
    spirit() {
      const ac = ensure();
      const now = ac.currentTime;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.05, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      g.connect(ac.destination);
      // vibrato LFO
      const lfo = ac.createOscillator(); const lfoGain = ac.createGain();
      lfo.frequency.value = 6; lfoGain.gain.value = 18;
      lfo.connect(lfoGain);
      [330, 247].forEach((f, i) => {
        const o = ac.createOscillator(); o.type = i ? 'triangle' : 'sine';
        o.frequency.setValueAtTime(f, now);
        o.frequency.exponentialRampToValueAtTime(f * 0.8, now + 0.9); // downward glide
        lfoGain.connect(o.frequency);
        o.connect(g);
        o.start(now); o.stop(now + 0.95);
      });
      lfo.start(now); lfo.stop(now + 0.95);
    },
  };
}
