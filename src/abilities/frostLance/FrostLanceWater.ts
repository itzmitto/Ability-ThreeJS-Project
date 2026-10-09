// Donor frost/decal/burst calls adapted to effect-owned overlays on existing water.
// Copyright (c) 2026 mohamedachrefelouafi — MIT; public/licenses/LinearAbilityExtThreeJS.txt.
import { AdditiveBlending, Color, DoubleSide, DynamicDrawUsage, Group, InstancedBufferAttribute, InstancedMesh, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { WaterInteractionManager } from '../../world/water/WaterInteractionManager';
import { NORMAL_TRANSFORM_GLSL } from '../../effects/NormalTransform';
import { FROST_LANCE as c, lerp, saturate } from './FrostLanceConfig';
/** Fixed patch buffer covers at most 15m × 3.6 patches/m plus terminal rime/ring. */
export class FrostLanceWater {
    readonly root = new Group();
    private readonly patches: InstancedMesh;
    private readonly patchMaterial: ShaderMaterial;
    private readonly positions = new InstancedBufferAttribute(new Float32Array(80 * 4), 4);
    private readonly sizes = new InstancedBufferAttribute(new Float32Array(80 * 4), 4);
    private readonly shellMaterial: ShaderMaterial;
    private readonly shell: Mesh;
    private readonly flashMaterial = new ShaderMaterial({
        transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
        uniforms: { uColor: { value: new Color(c.colorFlash) }, uOpacity: { value: 0 } },
        vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader: 'uniform vec3 uColor;uniform float uOpacity;void main(){gl_FragColor=vec4(uColor,uOpacity);}',
    });
    private readonly flash = new Mesh(new PlaneGeometry(2, 2), this.flashMaterial);
    private placed = 0;
    private lastRipple = -1;
    private impactAge = -1;
    private endTime = 0;
    constructor(private readonly water?: WaterInteractionManager) {
        const geometry = new PlaneGeometry(2, 2);
        geometry.rotateX(-Math.PI / 2);
        this.positions.setUsage(DynamicDrawUsage);
        this.sizes.setUsage(DynamicDrawUsage);
        geometry.setAttribute('aPatch', this.positions);
        geometry.setAttribute('aSize', this.sizes);
        this.patchMaterial = new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide, uniforms: { uTime: { value: 0 }, uFrost: { value: new Color(c.colorFrost) }, uEdge: { value: new Color(c.colorFrostEdge) }, uShockA: { value: new Color(c.colorShockA) }, uShockB: { value: new Color(c.colorShockB) } },
            vertexShader: `attribute vec4 aPatch,aSize;uniform float uTime;varying vec2 vUv;varying vec4 vData;
      void main(){vUv=uv;float age=uTime-aPatch.w;float life=aSize.y;float growth=aSize.w>.5?1.-pow(1.-clamp(age/life,0.,1.),3.):smoothstep(0.,.18,age);
        vData=vec4(age/life,aSize.z,aSize.w,growth);vec3 p=position*aSize.x*growth;p+=aPatch.xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
            fragmentShader: `uniform vec3 uFrost,uEdge,uShockA,uShockB;varying vec2 vUv;varying vec4 vData;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec2 p=vUv*2.-1.;float radius=length(p);float life=vData.x;float fade=1.-smoothstep(.65,1.,life);
        if(radius>1.||life<0.||life>1.)discard;
        float angle=atan(p.y,p.x);float streak=pow(max(0.,cos(angle*19.+sin(radius*17.+vData.y)*2.)),15.);
        float grain=hash(floor(p*70.+vData.y));float frost=streak*.6+pow(grain,6.)*.5;
        float a=(1.-smoothstep(.3,1.,radius))*frost*${c.frostIntensity.toFixed(2)}*fade;
        vec3 col=mix(uEdge,uFrost,grain);
        if(vData.z>.5){a=exp(-pow((radius-.96)*32.,2.))*fade*.9;col=mix(uShockA,uShockB,exp(-pow((radius-.96)*60.,2.)));}
        if(a<.005)discard;gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
        this.patches = new InstancedMesh(geometry, this.patchMaterial, 80);
        this.patches.count = 0;
        this.patches.frustumCulled = false;
        this.patches.renderOrder = 1;
        this.root.add(this.patches);
        this.shellMaterial = new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending,
            uniforms: { uAge: { value: 0 }, uA: { value: new Color(c.colorBurstA) }, uB: { value: new Color(c.colorBurstB) }, uC: { value: new Color(c.colorBurstC) } },
            vertexShader: `${NORMAL_TRANSFORM_GLSL}uniform float uAge;varying vec3 vNormal,vWorld;void main(){float n=sin(position.x*13.+uAge*9.)*sin(position.y*11.-uAge*7.)*sin(position.z*12.);
        vec3 p=position*(1.+n*.11*sin(min(1.,uAge/.95)*3.14159));vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;vNormal=normalize(normalForTransform(modelMatrix,normal));gl_Position=projectionMatrix*viewMatrix*w;}`,
            fragmentShader: `uniform float uAge;uniform vec3 uA,uB,uC;varying vec3 vNormal,vWorld;void main(){float t=uAge/.95;float rim=pow(1.-abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),1.3);
        float noise=.5+.5*sin(vWorld.x*11.+sin(vWorld.y*9.+uAge*3.)+vWorld.z*8.);float a=rim*(.35+.65*noise)*(1.-smoothstep(.15,1.,t))*.85;
        gl_FragColor=vec4(mix(mix(uA,uB,noise),uC,rim*.5)*.75,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
        this.shell = new Mesh(new SphereGeometry(1, 24, 16), this.shellMaterial);
        this.shell.visible = false;
        this.shell.renderOrder = 3;
        this.root.add(this.shell);
        this.flash.visible = false; this.flash.frustumCulled = false; this.flash.renderOrder = 10;
        this.root.add(this.flash);
    }
    patch(t: number, p: Vector3, radius: number, life: number = c.frostLife, shock = false): void {
        if (this.placed >= 80)
            return;
        const i = this.placed++;
        this.positions.setXYZW(i, p.x, .04, p.z, t);
        this.sizes.setXYZW(i, radius, life, Math.random() * 17, shock ? 1 : 0);
        this.positions.needsUpdate = this.sizes.needsUpdate = true;
        this.patches.count = this.placed;
        this.endTime = Math.max(this.endTime, t + life);
        if (shock || t - this.lastRipple > .065) {
            this.lastRipple = t;
            this.water?.addRipple({ position: p, strength: shock ? .2 : .035, duration: shock ? 2.3 : 1.2, waveSpeed: shock ? 7 : 2.3, radius: shock ? 1 : .2 }, this);
        }
    }
    impact(t: number, p: Vector3): void {
        this.impactAge = t;
        this.shell.position.copy(p).setY(.6);
        this.patch(t, p, c.width * c.frostSpread * 2.2, c.frostLife * 1.3);
        // The pressure edge draws after rime in this instanced overlay so it stays readable.
        this.patch(t, p, c.shockRadius, .75, true);
    }
    update(t: number): void {
        this.patchMaterial.uniforms.uTime.value = t;
        const age = t - this.impactAge;
        this.flash.visible = this.impactAge >= 0 && age < .22;
        this.flashMaterial.uniforms.uOpacity.value = c.impactFlash * Math.exp(-Math.max(0, age) * 28);
        this.shell.visible = this.impactAge >= 0 && age < .95;
        if (this.shell.visible) {
            const r = lerp(c.burstSize * .3, c.burstSize, Math.pow(saturate(age / .95), .6));
            this.shell.scale.set(r, r * .72, r);
            this.shellMaterial.uniforms.uAge.value = age;
        }
        this.patches.visible = t < this.endTime;
    }
    get expiry(): number { return this.endTime; }
    get patchCount(): number { return this.placed; }
    reset(): void { this.water?.removeOwner(this); this.placed = this.endTime = 0; this.lastRipple = this.impactAge = -1; this.patches.count = 0; this.shell.visible = this.flash.visible = false; }
    dispose(): void { this.water?.removeOwner(this); this.root.removeFromParent(); this.patches.dispose(); this.patches.geometry.dispose(); this.patchMaterial.dispose(); this.shell.geometry.dispose(); this.shellMaterial.dispose(); this.flash.geometry.dispose(); this.flashMaterial.dispose(); }
}
