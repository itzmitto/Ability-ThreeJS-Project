import { CapsuleGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { BufferGeometry } from 'three';

/** Temporary articulated human, 1.82m tall. Replace this class with a GLTF + AnimationMixer. */
export class PlayerVisual {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly leftArm = new Group();
  private readonly rightArm = new Group();
  private readonly leftLeg = new Group();
  private readonly rightLeg = new Group();
  private readonly sphere = new SphereGeometry(1, 20, 16);
  private readonly capsule = new CapsuleGeometry(1, 1, 6, 16);
  private readonly cloth = new MeshStandardMaterial({ color: '#2c3949', roughness: 0.76, metalness: 0.12 });
  private readonly trousers = new MeshStandardMaterial({ color: '#141c28', roughness: 0.86 });
  private readonly skin = new MeshStandardMaterial({ color: '#a7897a', roughness: 0.68 });
  private readonly hair = new MeshStandardMaterial({ color: '#151719', roughness: 0.9 });
  private readonly boots = new MeshStandardMaterial({ color: '#101720', roughness: 0.45 });
  private readonly trim = new MeshStandardMaterial({ color: '#546575', roughness: 0.45, metalness: 0.4 });
  private blend = 0;
  constructor() {
    this.root.add(this.body);
    // Ellipsoidal anatomy, narrow wrists/ankles, natural shoulder width and tapered limbs.
    this.part(this.body, this.sphere, this.cloth, [0, 1.27, 0], [0.235, 0.30, 0.135]);
    this.part(this.body, this.sphere, this.cloth, [0, 1.06, 0], [0.18, 0.20, 0.12]);
    this.part(this.body, this.sphere, this.trousers, [0, 0.94, 0], [0.19, 0.14, 0.13]);
    this.part(this.body, this.sphere, this.trim, [0, 1.01, 0], [0.183, 0.025, 0.125]);
    this.part(this.body, this.capsule, this.skin, [0, 1.56, 0], [0.065, 0.055, 0.065]);
    this.part(this.body, this.sphere, this.skin, [0, 1.70, -0.01], [0.102, 0.135, 0.10]);
    this.part(this.body, this.sphere, this.skin, [0, 1.665, -0.043], [0.077, 0.080, 0.081]);
    this.part(this.body, this.sphere, this.skin, [0, 1.70, -0.108], [0.024, 0.028, 0.026]);
    this.part(this.body, this.sphere, this.hair, [0, 1.755, 0.007], [0.105, 0.091, 0.101]);
    for (const side of [-1, 1]) {
      this.part(this.body, this.sphere, this.skin, [side * 0.103, 1.70, 0], [0.019, 0.031, 0.021]);
      const arm = side < 0 ? this.leftArm : this.rightArm;
      arm.position.set(side * 0.245, 1.46, 0);
      arm.rotation.z = side * 0.075;
      this.body.add(arm);
      this.part(arm, this.sphere, this.cloth, [0, -0.04, 0], [0.089, 0.103, 0.09]);
      this.part(arm, this.capsule, this.cloth, [side * 0.016, -0.18, 0], [0.068, 0.102, 0.067]);
      this.part(arm, this.sphere, this.cloth, [side * 0.018, -0.32, 0], [0.060, 0.063, 0.058]);
      const forearm = this.part(arm, this.capsule, this.cloth, [side * 0.022, -0.425, -0.025], [0.048, 0.085, 0.050]);
      forearm.rotation.x = -0.12;
      this.part(arm, this.sphere, this.skin, [side * 0.022, -0.58, -0.045], [0.042, 0.076, 0.03]);
      const leg = side < 0 ? this.leftLeg : this.rightLeg;
      leg.position.set(side * 0.10, 0.93, 0);
      this.body.add(leg);
      this.part(leg, this.capsule, this.trousers, [0, -0.20, 0], [0.086, 0.132, 0.089]);
      this.part(leg, this.sphere, this.trousers, [0, -0.40, -0.007], [0.071, 0.079, 0.070]);
      this.part(leg, this.capsule, this.trousers, [0, -0.585, 0.006], [0.060, 0.121, 0.065]);
      this.part(leg, this.sphere, this.boots, [0, -0.81, -0.048], [0.063, 0.10, 0.13]);
      this.part(leg, this.sphere, this.boots, [0, -0.885, -0.065], [0.068, 0.038, 0.14]);
    }
  }
  private part(parent: Group, geometry: BufferGeometry, material: MeshStandardMaterial, position: [number, number, number], scale: [number, number, number]): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.position.fromArray(position); mesh.scale.fromArray(scale);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  update(phase: number, speed: number, delta: number): void {
    this.blend += (Math.min(speed / 4.8, 1) - this.blend) * (1 - Math.exp(-10 * delta));
    const stride = Math.sin(phase) * 0.48 * this.blend;
    this.leftLeg.rotation.x = stride; this.rightLeg.rotation.x = -stride;
    this.leftArm.rotation.x = -stride * 0.7 - 0.08; this.rightArm.rotation.x = stride * 0.7 - 0.08;
    this.body.position.y = Math.abs(Math.sin(phase)) * 0.028 * this.blend;
    this.body.rotation.z = Math.sin(phase) * 0.018 * this.blend;
  }
  dispose(): void {
    this.sphere.dispose(); this.capsule.dispose();
    [this.cloth, this.trousers, this.skin, this.hair, this.boots, this.trim].forEach(material => material.dispose());
    this.root.removeFromParent();
  }
}
