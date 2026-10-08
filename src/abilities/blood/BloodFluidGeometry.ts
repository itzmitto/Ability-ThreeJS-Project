import { BufferGeometry, Float32BufferAttribute } from "three";
/** Unit parametric surface: u along the path, angle around it. Vertex shader supplies the curve. */
export function fluidTube(segments = 48, sides = 10): BufferGeometry {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++)
    for (let j = 0; j <= sides; j++) {
      positions.push(
        i / segments,
        Math.cos((j / sides) * Math.PI * 2),
        Math.sin((j / sides) * Math.PI * 2),
      );
      uv.push(i / segments, j / sides);
    }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j,
        b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function liquidLanceGeometry(): BufferGeometry {
  const g = fluidTube(24, 10),
    p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i),
      a = p.getY(i),
      b = p.getZ(i),
      r =
        Math.pow(Math.sin(Math.PI * t), 0.7) *
        (0.18 + 0.055 * Math.sin(t * 19));
    p.setXYZ(i, a * r, t * 4.5, b * r);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}
