import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { frostNoise } from '../frostLance/FrostLanceNoise';
import type { CometResources } from './EmberCometGeometry';
import type { CometConfig, CometQuality } from './EmberCometConfig';
import { createCometCoreMaterial, createCometFlameMaterial } from './EmberCometMaterials';

const Z = new Vector3(0, 0, 1);
/** Contact flare, six outward volume tongues and a localized hot water/pressure overlay. */
export class EmberCometImpact {
  readonly root = new Group(); private readonly flash: Mesh; private readonly tongues: Mesh[] = [];
  private readonly groundMaterial = new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uAge: { value: -1 }, uFlash: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv;uniform float uAge,uFlash;${frostNoise}
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p),t=max(0.,uAge),n=snoise(vec3(p*18.,t*2.));
      float front=.15+(1.-exp(-t*4.))*.7;float ring=exp(-pow((r-front)*45.,2.))*exp(-t*3.);
      float hot=exp(-r*r*15.)*exp(-t*7.)*(.8+n*.2);
      float alpha=(ring*.22+hot*.24)*uFlash;if(alpha<.003)discard;
      gl_FragColor=vec4(mix(vec3(.43,.09,.025),vec3(1.3,.53,.1),hot),alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  readonly waterOverlay = new Mesh(new PlaneGeometry(2, 2), this.groundMaterial);
  private readonly direction = new Vector3();
  constructor(resources: CometResources) {
    this.flash = new Mesh(resources.cores[1], createCometCoreMaterial()); this.root.add(this.flash);
    for (let i = 0; i < 6; i++) { const material = createCometFlameMaterial(); material.uniforms.uLayer.value = i; const m = new Mesh(resources.tail, material); m.frustumCulled = false; m.renderOrder = 3; this.root.add(m); this.tongues.push(m); }
    this.waterOverlay.rotation.x = -Math.PI / 2; this.waterOverlay.renderOrder = 2; this.root.add(this.waterOverlay); this.root.visible = false;
  }
  update(age: number, time: number, point: Vector3, q: CometQuality, c: Readonly<CometConfig>): void {
    this.root.visible = age >= 0 && age < 2.6; if (!this.root.visible) return; this.root.position.copy(point);
    this.flash.visible = age < .18; this.flash.position.y = .4;
    this.flash.scale.setScalar((.28 + Math.sin(Math.min(1, age / .18) * Math.PI) * .65) * c.impactFlash);
    (this.flash.material as ShaderMaterial).uniforms.uTime.value = time; (this.flash.material as ShaderMaterial).uniforms.uGlow.value = c.impactFlash;
    for (let i = 0; i < this.tongues.length; i++) {
      const m = this.tongues[i], material = m.material as ShaderMaterial, a = i * Math.PI * 2 / this.tongues.length;
      m.visible = i < q.tailLayers + 1 && age < .75; this.direction.set(-Math.cos(a), -.25 - (i % 2) * .18, -Math.sin(a)).normalize(); m.quaternion.setFromUnitVectors(Z, this.direction);
      m.position.y = .3; const width = .38 + age * .9;
      m.scale.set(width, width, (.4 + (1 - Math.exp(-age * 9)) * c.impactRadius) * (1 - age * .35));
      material.uniforms.uTime.value = time; material.uniforms.uAlpha.value = (1 - Math.min(1, age / .75)) * .65 * c.impactFlash; material.uniforms.uDetail.value = q.detail;
    }
    this.waterOverlay.position.y = .055; this.waterOverlay.scale.setScalar(c.impactRadius * 1.25);
    this.groundMaterial.uniforms.uAge.value = age; this.groundMaterial.uniforms.uFlash.value = c.impactFlash;
  }
  dispose(): void { (this.flash.material as ShaderMaterial).dispose(); this.tongues.forEach(m => (m.material as ShaderMaterial).dispose()); this.waterOverlay.geometry.dispose(); this.groundMaterial.dispose(); this.root.clear(); }
}
