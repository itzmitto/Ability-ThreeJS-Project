import { test, expect } from '@playwright/test';
import { Vector3 } from 'three';
import { resolveGlacialTarget } from '../src/abilities/ice/resolveGlacialTarget';
import { createCrystalGeometry } from '../src/abilities/ice/CrystalGeometry';
import { iceQuality, GLACIAL_CONFIG } from '../src/abilities/ice/iceConfig';
import { QUALITY_PRESETS } from '../src/quality/QualityPreset';

test('Glacial target preserves aim, caps range, rejects null and nonfinite values', () => {
  const player = new Vector3(13, 0, -20);
  expect(resolveGlacialTarget(player, null)).toBeNull();
  expect(resolveGlacialTarget(player, new Vector3(NaN, 0, 0))).toBeNull();
  expect(resolveGlacialTarget(player, new Vector3(0, 0, Infinity))).toBeNull();
  const nearby = new Vector3(15, 0, -28);
  expect(resolveGlacialTarget(player, nearby)?.equals(nearby)).toBe(true);
  const far = resolveGlacialTarget(player, new Vector3(100, 0, -200))!;
  expect(far.distanceTo(player)).toBeCloseTo(GLACIAL_CONFIG.range, 8);
  expect(far.y).toBe(0);
  expect(resolveGlacialTarget(player, player)?.equals(player)).toBe(true);
});

test('Crystal geometry is faceted and finite, with an offset tip and shared barycentric edges', () => {
  const geometry = createCrystalGeometry();
  const positions = geometry.getAttribute('position'); const normals = geometry.getAttribute('normal');
  expect(positions.count).toBeGreaterThan(60);
  for (const value of positions.array) expect(Number.isFinite(value)).toBe(true);
  for (const value of normals.array) expect(Number.isFinite(value)).toBe(true);
  expect(geometry.getAttribute('aBarycentric').count).toBe(positions.count);
  expect(normals.getX(0) * positions.getX(0) + normals.getZ(0) * positions.getZ(0)).toBeGreaterThan(0);
  geometry.computeBoundingBox(); expect(geometry.boundingBox?.max.y).toBe(1);
  geometry.dispose();
});

test('One centralized budget controls increasing ice counts and lighting', () => {
  const low = iceQuality(QUALITY_PRESETS.LOW), medium = iceQuality(QUALITY_PRESETS.MEDIUM), max = iceQuality(QUALITY_PRESETS.MAX);
  expect([low.spikes, medium.spikes, max.spikes]).toEqual([6, 10, 16]);
  expect([low.shards, medium.shards, max.shards]).toEqual([20, 42, 84]);
  expect([low.snow, medium.snow, max.snow]).toEqual([80, 210, 420]);
  expect(low.mist).toBeLessThan(medium.mist); expect(medium.mist).toBeLessThan(max.mist);
  expect(low.light).toBeLessThan(max.light); expect(GLACIAL_CONFIG.cooldown).toBe(2.5);
});
