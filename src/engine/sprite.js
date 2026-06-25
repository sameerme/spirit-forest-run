export function createSprite(frameCount, fps, loop = true) {
  let t = 0;
  let frame = 0;
  let done = false;
  return {
    get frame() { return frame; },
    get done() { return done; },
    reset() { t = 0; frame = 0; done = false; },
    update(dt) {
      if (done) return frame;
      t += dt;
      const adv = Math.floor(t * fps);
      if (adv > 0) {
        t -= adv / fps;
        frame += adv;
        if (frame >= frameCount) {
          if (loop) { frame %= frameCount; }
          else { frame = frameCount - 1; done = true; }
        }
      }
      return frame;
    },
  };
}

export function frameRect(meta, frameIndex) {
  return { sx: frameIndex * meta.fw, sy: 0, sw: meta.fw, sh: meta.fh };
}
