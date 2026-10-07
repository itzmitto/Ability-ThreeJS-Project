import { Mesh, MeshBasicMaterial, Raycaster, RingGeometry, Vector2, Vector3 } from 'three';
import type { Camera, Scene } from 'three';
import { GAME_CONFIG } from '../game/config';
import { GroundRaycaster } from './GroundRaycaster';

export class TargetingSystem {
  readonly maxDistance = GAME_CONFIG.targeting.maxDistance;
  readonly raycaster = new Raycaster();
  readonly aimDirection = new Vector3();
  readonly targetPoint = new Vector3();
  private readonly groundTarget = new Vector3();
  private readonly ndc = new Vector2(0, 0);
  private readonly ground = new GroundRaycaster();
  private readonly marker = new Mesh(new RingGeometry(0.22, 0.25, 48), new MeshBasicMaterial({ color: '#819dbb', transparent: true, opacity: 0.3, depthWrite: false }));
  hasGroundTarget = false;
  markerEnabled = false;
  constructor(scene: Scene) { this.marker.rotation.x = -Math.PI / 2; this.marker.visible = false; scene.add(this.marker); }
  update(camera: Camera, playerOrigin: Vector3): void {
    this.raycaster.setFromCamera(this.ndc, camera);
    this.aimDirection.copy(this.raycaster.ray.direction);
    this.hasGroundTarget = this.ground.intersect(this.raycaster.ray, playerOrigin, this.maxDistance, this.groundTarget);
    if (this.hasGroundTarget) this.targetPoint.copy(this.groundTarget);
    else this.targetPoint.copy(this.aimDirection).multiplyScalar(this.maxDistance).add(playerOrigin);
    this.marker.visible = this.markerEnabled && this.hasGroundTarget;
    if (this.hasGroundTarget) { this.marker.position.copy(this.groundTarget); this.marker.position.y = 0.04; }
  }
  getAimDirection(): Readonly<Vector3> { return this.aimDirection; }
  getGroundTarget(): Readonly<Vector3> | null { return this.hasGroundTarget ? this.groundTarget : null; }
  getTargetPoint(): Readonly<Vector3> { return this.targetPoint; }
  dispose(): void { this.marker.geometry.dispose(); this.marker.material.dispose(); this.marker.removeFromParent(); }
}
