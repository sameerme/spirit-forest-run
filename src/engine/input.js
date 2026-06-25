export function createInput(target) {
  let jumpCb = () => {};
  let dashCb = () => {};
  let lastTap = 0;
  let downAt = 0;
  let holdTimer = null;

  const onDown = (e) => {
    e.preventDefault();
    downAt = performance.now();
    if (e.touches && e.touches.length >= 2) { dashCb(); return; }
    holdTimer = setTimeout(() => { dashCb(); holdTimer = null; }, 300);
  };
  const onUp = (e) => {
    e.preventDefault();
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; jumpCb(); }
    lastTap = performance.now();
  };

  target.addEventListener('pointerdown', onDown, { passive: false });
  target.addEventListener('pointerup', onUp, { passive: false });
  target.addEventListener('touchstart', onDown, { passive: false });
  target.addEventListener('touchend', onUp, { passive: false });

  return {
    onJump(cb) { jumpCb = cb; },
    onDash(cb) { dashCb = cb; },
    destroy() {
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('touchstart', onDown);
      target.removeEventListener('touchend', onUp);
    },
  };
}
