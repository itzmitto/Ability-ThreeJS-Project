import { Group, Matrix4, PlaneGeometry, ShaderMaterial } from "three";
import type { Camera, Mesh, Scene, WebGLRenderer } from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import type { WaterQuality } from "./WaterQualityConfig";
/** One clipped half-float mirror target. Never part of the scene, so no recursive reflection. */
export class WaterReflectionSystem {
  readonly reflector = new Reflector(new PlaneGeometry(2, 2), {
    textureWidth: 384,
    textureHeight: 384,
    multisample: 0,
    clipBias: 0.003,
  });
  readonly matrix = new Matrix4();
  private readonly inverse = new Matrix4();
  private readonly group = new Group();
  private tick = 0;
  private size = 384;
  private valid = false;
  lastCpuMs = 0;
  renderCount = 0;
  constructor() {
    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.updateMatrixWorld(true);
    this.inverse.copy(this.reflector.matrixWorld).invert();
  }
  get texture() {
    return this.reflector.getRenderTarget().texture;
  }
  configure(q: WaterQuality): void {
    if (q.reflectionSize && q.reflectionSize !== this.size) {
      this.size = q.reflectionSize;
      this.reflector.getRenderTarget().setSize(this.size, this.size);
      this.valid = false;
    }
    this.tick = 0;
  }
  render(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    surface: Mesh,
    q: WaterQuality,
  ): boolean {
    if (!q.reflectionSize) return false;
    if (this.valid && this.tick++ % q.reflectionInterval !== 0) return true;
    const visible = surface.visible;
    surface.visible = false;
    const start = performance.now();
    try {
      scene.updateMatrixWorld(true);
      this.reflector.onBeforeRender(
        renderer,
        scene,
        camera,
        this.reflector.geometry,
        this.reflector.material as ShaderMaterial,
        this.group,
      );
      this.matrix
        .copy(
          (this.reflector.material as ShaderMaterial).uniforms.textureMatrix
            .value,
        )
        .multiply(this.inverse);
      this.valid = true;
      this.renderCount++;
    } finally {
      surface.visible = visible;
      this.lastCpuMs = performance.now() - start;
    }
    return this.valid;
  }
  dispose(): void {
    this.reflector.dispose();
    this.reflector.geometry.dispose();
  }
}
