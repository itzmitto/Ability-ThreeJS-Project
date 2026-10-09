import { Mesh, ShaderMaterial } from 'three';
import type { AbilityCastContext } from '../Ability';
import { ElementParticles, VisualOwner, SurfacePulse, gridGeometry, ease } from '../elemental/ElementalVisuals';
import { waterMagicMaterial } from './WaterMagicMaterials';
import { waterShell } from './TidalWave';
export class WaterImpact {
  readonly crown: Mesh;
  readonly material;
  readonly spray: ElementParticles;
  readonly mist: ElementParticles;
  readonly pulse: SurfacePulse;
  readonly whirlpool: Mesh;
  readonly whirlpoolMaterial: ShaderMaterial;
  constructor(owner: VisualOwner) {
    this.material = owner.material(waterMagicMaterial(3)); this.crown = new Mesh(owner.geometry(waterShell(64, 20)), this.material); this.crown.frustumCulled = false; owner.root.add(this.crown);
    this.spray = new ElementParticles(owner, 500, true); this.mist = new ElementParticles(owner, 100, true, true); this.mist.material.uniforms.uColor.value.set('#91bdca'); this.pulse = new SurfacePulse(owner, true);
    this.whirlpoolMaterial = owner.material(new ShaderMaterial({ transparent: true, depthWrite: false, side: 2,
      uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uDetail: { value: 2 } },
      vertexShader: `varying vec2 vUv;uniform float uPower,uTime;void main(){vUv=uv;vec2 p=(position.xy*2.-1.)*8.;float r=length(p)/8.;float h=.12+.15*sin(r*32.+uTime*3.)*uPower*clamp(r,0.,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,h,p.y,1.);}`,
      fragmentShader: `varying vec2 vUv;uniform float uTime,uPower,uDetail;void main(){vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);if(r>1.)discard;float spiral=sin(a*5.+r*24.+uTime*(5.-2.*r)*uPower);float foam=pow(max(0.,spiral),12.)*smoothstep(.15,.4,r);float inward=pow(max(0.,sin(r*50.+uTime*8.)),14.)*.2;float mask=(1.-smoothstep(.75,1.,r));vec3 col=mix(vec3(.003,.014,.025),vec3(.015,.16,.23),r);col=mix(col,vec3(.7,.9,.94),foam*.8+inward*uDetail*.1);gl_FragColor=vec4(col,mask*uPower*(.68+foam*.25));}` }));
    this.whirlpool = new Mesh(owner.geometry(gridGeometry(40, 40)), this.whirlpoolMaterial); this.whirlpool.frustumCulled = false; owner.root.add(this.whirlpool);
  }
  update(t: number, count: number, mist: number, detail: number, fade: number, camera: AbilityCastContext['camera']): void {
    const age = t - 3.7, power = ease((t - 3.65) / .18) * (1 - ease((t - 4.2) / 1.4)); this.crown.visible = t >= 3.65 && t < 5.6; this.material.uniforms.uTime.value = t; this.material.uniforms.uFade.value = power * fade; this.material.uniforms.uDetail.value = detail;
    this.spray.update(t, count, 3.7, fade * ease((t - .3) / .5), camera); this.mist.update(t, mist, 3.7, fade * ease((t - 3.7) / .6), camera);
    const wh = ease((t - 4) / .5) * (1 - ease((t - 5.5) / 1.5)); this.whirlpool.visible = wh > .001; this.whirlpoolMaterial.uniforms.uTime.value = t; this.whirlpoolMaterial.uniforms.uPower.value = wh; this.whirlpoolMaterial.uniforms.uDetail.value = detail;
    this.pulse.update(Math.max(0, age), age < 0 ? ease((t - .3) / .7) * .45 : (1 - ease(age / 3.3)) * fade, age < 0 ? 10 : 6 + age * 13);
  }
}
