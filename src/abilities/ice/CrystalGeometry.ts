import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';

/** Irregular six-sided prism with broken shoulders and an offset chisel-cut tip. */
export function createCrystalGeometry(): BufferGeometry {
  const positions: number[] = []; const barycentric: number[] = []; const rings: Vector3[][] = [];
  const radii = [0.88, 1.06, 0.93, 0.85, 1.02, 0.94];
  for (const [y, width] of [[0, 0.62], [0.58, 0.72], [0.79, 0.42]]) rings.push(radii.map((radius, index) => {
    const angle = index / 6 * Math.PI * 2;
    return new Vector3(Math.cos(angle) * radius * width, y + (y === 0 ? 0 : Math.sin(index * 7) * 0.035), Math.sin(angle) * radius * width);
  }));
  const triangle = (a: Vector3, b: Vector3, c: Vector3): void => { positions.push(...a.toArray(), ...c.toArray(), ...b.toArray()); barycentric.push(1, 0, 0, 0, 1, 0, 0, 0, 1); };
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    triangle(rings[ring][i], rings[ring][next], rings[ring + 1][i]); triangle(rings[ring][next], rings[ring + 1][next], rings[ring + 1][i]);
  }
  const tip = new Vector3(0.13, 1, -0.11);
  for (let i = 0; i < 6; i++) { triangle(rings[2][i], rings[2][(i + 1) % 6], tip); triangle(rings[0][(i + 1) % 6], rings[0][i], new Vector3()); }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setAttribute('aBarycentric', new Float32BufferAttribute(barycentric, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry;
}
