export function calculateRawDamage(power: number, constancy: number, coefficient: number): number {
  if (constancy > power) return Math.round(coefficient * power);
  const min = coefficient * constancy;
  const max = coefficient * power;
  return Math.round(min + Math.random() * (max - min));
}

export function applyDefense(rawDamage: number, defense: number, cap = 0.5): number {
  if (rawDamage <= 0) return 0;
  const reduction = Math.min(defense / rawDamage, cap);
  return Math.max(0, Math.round(rawDamage * (1 - reduction)));
}

export function applyDotDefense(tickDamage: number, numTicks: number, defense: number, cap = 0.5): number {
  const totalDamage = tickDamage * numTicks;
  if (totalDamage <= 0) return 0;
  const reduction = Math.min(defense / totalDamage, cap);
  return Math.max(0, Math.round(tickDamage * (1 - reduction)));
}

export function calculateCooldown(baseCooldown: number, speed: number, cap = 0.5): number {
  const reduction = Math.min(speed / baseCooldown, cap);
  return Math.max(1, Math.round(baseCooldown * (1 - reduction)));
}

export function calculatePassDuration(speed: number, base = 500, min = 300): number {
  return Math.max(min, base - speed);
}
