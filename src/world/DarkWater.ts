import { Mesh, ShaderMaterial, Vector3, Matrix4 } from "three";
import type { Camera, Scene, WebGLRenderer } from "three";
import type { GraphicsSettings } from "../quality/GraphicsSettings";
import type { Player } from "../player/Player";
import { GAME_CONFIG } from "../game/config";
import { WaterInteractionManager } from "./water/WaterInteractionManager";
import { WaterFootstepInteraction } from "./water/WaterFootstepInteraction";
import { WaterReflectionSystem } from "./water/WaterReflectionSystem";
import { WaterLightingResponse } from "./water/WaterLightingResponse";
import { waterQuality } from "./water/WaterQualityConfig";
import type { WaterQuality } from "./water/WaterQualityConfig";
import { waterSurfaceGeometry } from "./water/WaterSurfaceGeometry";
import { WATER_VERTEX, WATER_FRAGMENT } from "./water/WaterShader";
import { WaterContactSpray } from "./water/WaterContactSpray";
export class DarkWater {
  readonly interactions = new WaterInteractionManager();
  readonly spray = new WaterContactSpray();
  readonly footsteps = new WaterFootstepInteraction(
    this.interactions,
    this.spray,
  );
  readonly reflection = new WaterReflectionSystem();
  readonly lighting = new WaterLightingResponse();
  readonly material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDetail: { value: 2 },
      uPlayer: { value: new Vector3() },
      uFogDensity: { value: GAME_CONFIG.world.fogDensity },
      uRipples: { value: this.interactions.data },
      uRippleShape: { value: this.interactions.shape },
      uReflection: { value: this.reflection.texture },
      uReflectionMatrix: { value: new Matrix4() },
      uReflect: { value: 0 },
      uReflectionSize: { value: 384 },
      uLightPosition: { value: this.lighting.positions },
      uLightColor: { value: this.lighting.colors },
      uLightCount: { value: 0 },
    },
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
  });
  readonly mesh = new Mesh(
    waterSurfaceGeometry(GAME_CONFIG.world.size, 96),
    this.material,
  );
  private q!: WaterQuality;
  private readonly unsubscribe: () => void;
  private segments = 96;
  constructor(
    private readonly scene: Scene,
    quality: GraphicsSettings,
  ) {
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.name = "Realistic dark water";
    scene.add(this.mesh, this.spray.points);
    this.unsubscribe = quality.subscribe((c) => {
      this.q = waterQuality(c);
      this.interactions.setCapacity(this.q.rippleCapacity);
      this.reflection.configure(this.q);
      this.material.uniforms.uDetail.value = this.q.detail;
      this.material.uniforms.uReflectionSize.value = this.q.reflectionSize;
      if (this.segments !== c.waterSegments) {
        this.mesh.geometry.dispose();
        this.mesh.geometry = waterSurfaceGeometry(
          GAME_CONFIG.world.size,
          c.waterSegments,
        );
        this.segments = c.waterSegments;
      }
    });
  }
  update(time: number, playerPosition: Vector3, player?: Player): void {
    this.interactions.update(time);
    if (player) this.footsteps.update(time, player);
    this.spray.update(time);
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uPlayer.value.copy(playerPosition);
    this.material.uniforms.uLightCount.value = this.lighting.update(
      this.scene,
      this.q.lightCapacity,
    );
    this.mesh.position.x = Math.round(playerPosition.x / 2) * 2;
    this.mesh.position.z = Math.round(playerPosition.z / 2) * 2;
  }
  prepareReflection(renderer: WebGLRenderer, camera: Camera): void {
    this.material.uniforms.uReflect.value = this.reflection.render(
      renderer,
      this.scene,
      camera,
      this.mesh,
      this.q,
    )
      ? 1
      : 0;
    this.material.uniforms.uReflectionMatrix.value.copy(this.reflection.matrix);
  }
  dispose(): void {
    this.unsubscribe();
    this.footsteps.dispose();
    this.spray.dispose();
    this.interactions.dispose();
    this.reflection.dispose();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
