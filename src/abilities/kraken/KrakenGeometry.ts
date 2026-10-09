// Adapted from achrefelouafi/LinearAbilityExtThreeJS.
// Copyright (c) 2026 mohamedachrefelouafi — MIT; see public/licenses/LinearAbilityExtThreeJS.txt.
import {BufferGeometry,Float32BufferAttribute} from 'three';
const TAU=Math.PI*2;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const bellyBump=(t:number,at:number)=>{if(t<=0||t>=1)return 0;const s=t<at?t/at:(1-t)/(1-at);return s*s*(3-2*s);};
export function createTentacleGeometry({
  seed = 1,
  rings = 44,
  sides = 12,
  taper = 0.05,
  swell = 1.3,
  swellAt = 0.16,
  roughness = 0.12,
  flatten = 0.84
} = {}) {
  const R = Math.max(6, Math.round(rings));
  const S = Math.max(4, Math.round(sides));
  const tip = clamp(taper, 0.005, 0.6);
  const flat = clamp(flatten, 0.35, 1.6);

  /**
   * Radius at arclength `t`, as a fraction of the base radius.
   *
   * A tentacle is not a cone: it is thickest just clear of the mantle, holds
   * that thickness through the muscle and then runs a long way to a fine point.
   * `swell` is the same zero-at-both-ends bump the fire-blades use, so `taper`
   * keeps meaning exactly what it says.
   */
  const profile = (t: number) => {
    const cone = tip + (1 - tip) * Math.pow(1 - t, 0.85);
    const bump = 1 + (swell - 1) * bellyBump(t, clamp(swellAt, 0.02, 0.98));
    // Slow, long-period wobble: the arm has muscle segments, not ripples.
    const wobble = 1 + Math.sin(t * 9.4 + seed * 3.1) * 0.05 * roughness * 3;
    return Math.max(0.004, cone * bump * wobble);
  };

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const ringVertices = S + 1; // duplicated seam, for a continuous uv.x

  for (let r = 0; r <= R; r++) {
    const t = r / R;
    const radius = profile(t);
    // Central difference for the profile slope, which is what tips the normal
    // off the cross-section plane and stops the arm shading like a cylinder.
    const e = 1 / (R * 2);
    const slope = (profile(Math.min(1, t + e)) - profile(Math.max(0, t - e))) / (2 * e);

    for (let i = 0; i <= S; i++) {
      const u = i / S;
      const a = u * TAU;
      const ca = Math.cos(a);
      const sa = Math.sin(a);

      positions.push(ca * radius, t, sa * radius * flat);
      uvs.push(u, t);

      // Ellipse gradient in the cross-section, plus the taper's own slope.
      const nx = ca;
      const nz = sa / flat;
      const ny = -slope * 0.5;
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
    }
  }

  for (let r = 0; r < R; r++) {
    for (let i = 0; i < S; i++) {
      const a = r * ringVertices + i;
      const b = a + 1;
      const c = a + ringVertices;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  // The arm is bent in the vertex shader, so its resting bounds say nothing
  // about where it ends up. Every mesh built from this is drawn unculled.
  geometry.computeBoundingSphere();
  return geometry;
}

