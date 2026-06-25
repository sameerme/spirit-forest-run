// Tiny WebAudio blip generator — no asset files.
export function createAudio() {
  let ctx = null;
  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  function blip(freq, durMs, type = 'square', gain = 0.06) {
    const ac = ensure();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(ac.destination);
    const now = ac.currentTime;
    osc.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.stop(now + durMs / 1000);
  }

  return {
    resume() { const ac = ensure(); if (ac.state === 'suspended') ac.resume(); },
    dot() { blip(540, 60); },
    lamp() { blip(320, 180, 'sawtooth', 0.08); },
    eatBetaal() { blip(720, 160, 'triangle', 0.09); },
    death() {
      blip(300, 250, 'sawtooth', 0.09);
      setTimeout(() => blip(160, 350, 'sawtooth', 0.09), 180);
    },
  };
}
