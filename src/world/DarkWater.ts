import { Color, Mesh, ShaderMaterial, Vector3, Matrix4 } from "three";
import { OCEAN_DEFAULTS, validateOcean } from './water/OceanSettings';
import type { OceanSettings } from './water/OceanSettings';
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
import { sampleOceanHeight } from './water/WaterWaveField';
export class DarkWater {
  readonly settings: OceanSettings = { ...OCEAN_DEFAULTS };
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
      uRippleExtent: { value: this.interactions.extent },
      uReflection: { value: this.reflection.texture },
      uReflectionMatrix: { value: new Matrix4() },
      uReflect: { value: 0 },
      uReflectionSize: { value: 384 },
      uLightPosition: { value: this.lighting.positions },
      uLightColor: { value: this.lighting.colors },
      uLightCount: { value: 0 },
      uAmplitude:{value:1},uWavelength:{value:1},uSteepness:{value:.55},uDirection:{value:0},uSwellSpeed:{value:1},uMediumSpeed:{value:1},uWaveCount:{value:4},
      uRippleStrength:{value:1},uRippleSpeed:{value:1},uRippleDecay:{value:1},uRippleCapacity:{value:20},
      uMicroIntensity:{value:.65},uNormalScale:{value:1},uRoughness:{value:.22},uReflectionGain:{value:.9},uFresnelGain:{value:1},uSpecularSharpness:{value:1},
      uFoamIntensity:{value:.3},uFoamThreshold:{value:.035},uDeepColor:{value:new Color()},uSurfaceColor:{value:new Color()},uReflectionTint:{value:new Color()},uFoamColor:{value:new Color()},
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
  private readonly unsubscribeRipple: () => void;
  private time = 0;
  constructor(
    private readonly scene: Scene,
    quality: GraphicsSettings,
  ) {
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.name = "Realistic dark water";
    scene.add(this.mesh, this.spray.points);
    this.unsubscribe = quality.subscribe((c) => {
      this.q = waterQuality(c);
      this.syncSettings();
      this.reflection.configure(this.q);
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
    this.mesh.frustumCulled = false;
    this.interactions.setHeightSampler((x,z)=>{const u=this.material.uniforms,p=u.uPlayer.value as Vector3;return sampleOceanHeight(x,z,this.time,p.x,p.z,this.settings,u.uWaveCount.value,this.interactions.data,this.interactions.shape,this.interactions.capacity,this.interactions.extent);});
    this.unsubscribeRipple = this.interactions.subscribe(r => { if (Math.abs(r.strength) >= .18) this.spray.emitImpact(r.position, this.time, Math.abs(r.strength), this.settings.splashDensity * this.q.detail / 3); });
  }
  configure(patch: Partial<OceanSettings>): void { Object.assign(this.settings, validateOcean(patch, this.settings)); this.syncSettings(); }
  private syncSettings(): void {
    const c=this.settings,u=this.material.uniforms;
    for(const [key,name] of Object.entries({amplitude:'uAmplitude',wavelength:'uWavelength',steepness:'uSteepness',direction:'uDirection',swellSpeed:'uSwellSpeed',mediumSpeed:'uMediumSpeed',microIntensity:'uMicroIntensity',normalScale:'uNormalScale',roughness:'uRoughness',reflectionIntensity:'uReflectionGain',fresnelStrength:'uFresnelGain',specularSharpness:'uSpecularSharpness',foamIntensity:'uFoamIntensity',foamThreshold:'uFoamThreshold',rippleStrength:'uRippleStrength',rippleSpeed:'uRippleSpeed',rippleDecay:'uRippleDecay'})) u[name].value=c[key as keyof OceanSettings];
    for(const [key,name] of Object.entries({deepColor:'uDeepColor',surfaceColor:'uSurfaceColor',reflectionTint:'uReflectionTint',foamColor:'uFoamColor'})) (u[name].value as Color).set(c[key as keyof OceanSettings] as string);
    const cap=Math.min(this.q.rippleCapacity,c.maxRipples);this.interactions.setCapacity(cap);u.uRippleCapacity.value=cap;
    u.uDetail.value=Math.min(this.q.detail,c.normalQuality);u.uWaveCount.value=Math.min(this.q.detail===1?2:this.q.detail===2?4:5,c.waveQuality);
  }
  update(time: number, playerPosition: Vector3, player?: Player): void {
    this.time = time;
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
    this.interactions.setHeightSampler(undefined);
    this.unsubscribe();
    this.unsubscribeRipple();
    this.footsteps.dispose();
    this.spray.dispose();
    this.interactions.dispose();
    this.reflection.dispose();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
