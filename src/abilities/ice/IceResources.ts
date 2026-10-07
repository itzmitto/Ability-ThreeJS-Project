import { PlaneGeometry } from 'three';
import { createCrystalGeometry } from './CrystalGeometry';

/** Owned by the ability and shared by every cast; effects must not dispose these geometries. */
export class IceResources {
  readonly crystal = createCrystalGeometry();
  readonly plane = new PlaneGeometry(1, 1);
  dispose(): void { this.crystal.dispose(); this.plane.dispose(); }
}
