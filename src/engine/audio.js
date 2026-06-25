export function createAudio() {
  let ctx = null;
  const ensure = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  function blip(freq, durMs, type = 'square', gain = 0.05) {
    const ac = ensure();
    const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(ac.destination);
    const now = ac.currentTime;
    o.start(now); g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000); o.stop(now + durMs / 1000);
  }
  return {
    resume() { const ac = ensure(); if (ac.state === 'suspended') ac.resume(); },
    jump() { blip(560, 110, 'square'); },
    hit() { blip(180, 240, 'sawtooth', 0.07); },
    sphere() { blip(880, 90, 'triangle', 0.06); },
    win() { blip(660, 120); setTimeout(() => blip(990, 180), 130); },
  };
}
