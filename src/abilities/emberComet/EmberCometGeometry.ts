import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { cometSeed } from './EmberCometConfig';

function finish(positions: number[], indices?: number[]): BufferGeometry {
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (indices) g.setIndex(indices);
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
/** Non-indexed closed solids: independent triangle normals retain the charred rock facets. */
function faceted(vertices: readonly number[][], faces: readonly number[][]): BufferGeometry {
  const center = new Vector3(), a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3(), temp = new Vector3(), p: number[] = [];
  vertices.forEach(v => center.add(new Vector3(...v))); center.divideScalar(vertices.length);
  for (const [i, j, k] of faces) {
    a.set(...vertices[i] as [number, number, number]); b.set(...vertices[j] as [number, number, number]); c.set(...vertices[k] as [number, number, number]);
    n.subVectors(b, a).cross(temp.subVectors(c, a));
    const order = n.dot(temp.copy(a).add(b).add(c).divideScalar(3).sub(center)) < 0 ? [i, k, j] : [i, j, k];
    for (const id of order) p.push(...vertices[id]);
  }
  return finish(p);
}
/** Closed curved plate, with two uneven radial rings on each skin and a real rock thickness. */
export function createCometPlate(detail: number, variant: number): BufferGeometry {
  const sides = [5, 7, 9][detail], vertices: number[][] = [], faces: number[][] = [];
  for (let skin = 0; skin < 2; skin++) {
    const back = skin === 1; vertices.push([0, 0, 1.02 - Number(back) * .17]);
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < sides; i++) {
      const a = i / sides * Math.PI * 2 + variant * .13;
      const r = (ring ? .55 : .28) * (.86 + cometSeed(i + variant * 13) * .22);
      const x = Math.cos(a) * r, y = Math.sin(a) * r * (.8 + variant * .07);
      vertices.push([x, y, Math.sqrt(1 - x * x - y * y) + cometSeed(i * 3 + ring + variant * 7) * .055 - Number(back) * .17]);
    }
  }
  const skinSize = 1 + sides * 2;
  for (let skin = 0; skin < 2; skin++) {
    const offset = skin * skinSize;
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides, a = offset + 1 + i, b = offset + 1 + j, c = a + sides, d = b + sides;
      faces.push([offset, a, b], [a, c, d], [a, d, b]);
    }
  }
  for (let i = 0; i < sides; i++) {
    const a = 1 + sides + i, b = 1 + sides + (i + 1) % sides;
    faces.push([a, b, b + skinSize], [a, b + skinSize, a + skinSize]);
  }
  return faceted(vertices, faces);
}
/** Smooth but asymmetrical lobed combustion volume; never a stock sphere geometry. */
export function createCometCore(detail: number): BufferGeometry {
  const rings = [6, 10, 14][detail], sides = rings * 2, p: number[] = [0, .94, 0], ids: number[] = [];
  for (let r = 1; r < rings; r++) for (let i = 0; i < sides; i++) {
    const theta = r / rings * Math.PI, phi = i / sides * Math.PI * 2;
    const radius = .94 + Math.sin(phi * 3 + theta * 5) * .055 + Math.cos(phi * 5 - theta * 3) * .04;
    p.push(Math.sin(theta) * Math.cos(phi) * radius, Math.cos(theta) * radius, Math.sin(theta) * Math.sin(phi) * radius);
  }
  const bottom = p.length / 3; p.push(0, -.94, 0);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides; ids.push(0, 1 + j, 1 + i);
    for (let r = 0; r < rings - 2; r++) {
      const a = 1 + r * sides + i, b = 1 + r * sides + j;
      ids.push(a, b, a + sides, b, b + sides, a + sides);
    }
    const end = 1 + (rings - 2) * sides; ids.push(bottom, end + i, end + j);
  }
  return finish(p, ids);
}
export function createCometFragment(variant: number): BufferGeometry {
  const p: number[][] = [[.08, .95, .04], [-.12, -.72, -.08]];
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5, r = .55 + cometSeed(i + variant * 7) * .18; p.push([Math.cos(a) * r, (cometSeed(i + variant) - .5) * .25, Math.sin(a) * r * (.4 + variant * .15)]); }
  const faces: number[][] = []; for (let i = 0; i < 5; i++) faces.push([0, 2 + i, 2 + (i + 1) % 5], [1, 2 + (i + 1) % 5, 2 + i]);
  return faceted(p, faces);
}
/** Real three-dimensional flame spindle, tapering away from a round cross-section. */
export function createCometTail(): BufferGeometry {
  const p: number[] = [], uv: number[] = [], ids: number[] = [], rows = 24, sides = 10;
  for (let r = 0; r <= rows; r++) for (let i = 0; i <= sides; i++) {
    const t = r / rows, a = i / sides * Math.PI * 2, radius = (.03 + .97 * Math.pow(1 - t, .85));
    p.push(Math.cos(a) * radius, Math.sin(a) * radius, -t); uv.push(i / sides, t);
    if (r < rows && i < sides) { const n = r * (sides + 1) + i; ids.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); }
  }
  const g = finish(p, ids); g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); return g;
}
export interface CometResources { cores: BufferGeometry[]; plates: BufferGeometry[][]; fragments: BufferGeometry[]; tail: BufferGeometry; }
export function createCometResources(): CometResources {
  return { cores: [0, 1, 2].map(createCometCore), plates: [0, 1, 2].map(d => [0, 1, 2].map(v => createCometPlate(d, v))), fragments: [0, 1, 2].map(createCometFragment), tail: createCometTail() };
}
export function disposeCometResources(r: CometResources): void { [...r.cores, ...r.plates.flat(), ...r.fragments, r.tail].forEach(g => g.dispose()); }
