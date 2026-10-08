import { PlaneGeometry } from "three";
/** A warped grid concentrates vertices near the player while retaining the 6 km horizon. */
export function waterSurfaceGeometry(
  size: number,
  segments: number,
): PlaneGeometry {
  const g = new PlaneGeometry(2, 2, segments, segments),
    p = g.getAttribute("position");
  const extent = size * 0.5,
    log = Math.log(extent + 1);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    p.setXYZ(
      i,
      Math.sign(x) * Math.expm1(Math.abs(x) * log),
      Math.sign(y) * Math.expm1(Math.abs(y) * log),
      0,
    );
  }
  p.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}
