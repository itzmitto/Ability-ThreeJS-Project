export const GAME_CONFIG = {
  world: { size: 6000, fogDensity: 0.0065 },
  player: { walkSpeed: 4.8, sprintSpeed: 8.5, acceleration: 9, deceleration: 12, turnSpeed: 12 },
  camera: { distance: 6.8, aimDistance: 5.8, height: 1.9, pitch: 0.19, minPitch: -0.35, maxPitch: 1.12, damping: 12, sensitivity: 0.0022 },
  targeting: { maxDistance: 180 },
} as const;
