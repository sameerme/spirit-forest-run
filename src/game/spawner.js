const OBSTACLES = new Set(['snake', 'bat', 'spirit', 'pit']);

export function airTime(jumpV, gravity) {
  return (2 * jumpV) / gravity;
}

export function maxGapPx(speed, jumpV, gravity) {
  return speed * airTime(jumpV, gravity);
}

export function validateLevel(level, opts) {
  const errors = [];
  if (!(level.length > 0)) errors.push('length must be > 0');

  for (let i = 1; i < level.entities.length; i++) {
    if (level.entities[i].worldX < level.entities[i - 1].worldX) {
      errors.push(`entities not sorted by worldX at index ${i}`);
    }
  }

  const obstacles = level.entities.filter((e) => OBSTACLES.has(e.type));
  for (let i = 1; i < obstacles.length; i++) {
    const gap = obstacles[i].worldX - obstacles[i - 1].worldX;
    if (gap < level.minGap) errors.push(`gap ${gap} < minGap ${level.minGap} at obstacle ${i}`);
  }

  const reach = maxGapPx(level.speed, opts.jumpV, opts.gravity);
  for (const e of obstacles) {
    if (e.type === 'pit') {
      const widthPx = (e.tiles || 1) * opts.tile;
      if (widthPx > reach) errors.push(`pit width ${widthPx} > jump reach ${reach.toFixed(0)}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function entitiesToSpawn(entities, spawnX, startIndex) {
  let i = startIndex;
  const spawned = [];
  while (i < entities.length && entities[i].worldX <= spawnX) {
    spawned.push(entities[i]);
    i++;
  }
  return { spawned, nextIndex: i };
}
