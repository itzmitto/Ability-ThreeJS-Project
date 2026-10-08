import {
  IcosahedronGeometry,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  Vector3,
} from "three";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { seeded } from "./SanguineEclipseConfig";
import { LANCE_GLSL } from "./BloodLanceScore";
/** Nine coherent GPU motion families in one instanced glossy-droplet draw. */
export class BloodDropletSystem {
  readonly material =
    bloodMaterial(`uniform float uTime;uniform vec3 uHand;attribute vec4 aSeed;attribute float aIndex;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;${LANCE_GLSL}
float gate(float a,float b,float c,float d,float t){return smoothstep(a,b,t)*(1.0-smoothstep(c,d,t));}
void main(){float t=uTime,id=aIndex,cat=mod(id,9.0),s=aSeed.x,a=s*6.283185+t*.25,life=0.0,size=.025+aSeed.y*.095;vec3 c=vec3(0);float stretch=1.0;
 if(cat<.5){life=gate(0.0,.2,1.3,2.0,t);c=uHand+vec3(cos(a*2.0)*.19,sin(a*3.0)*.12,sin(a*2.0)*.19);size*=.5;}
 else if(cat<1.5){life=gate(1.3,2.4,5.2,6.5,t);float u=fract(aSeed.z+t*.32);float r=7.0*(1.0-u*.65);c=vec3(cos(a+u*1.8)*r,u*12.5,sin(a+u*1.8)*r-16.0);stretch=1.9;}
 else if(cat<2.5){life=gate(2.4,3.9,9.1,10.2,t);float compression=1.0-smoothstep(8.1,9.4,t)*.65;float r=(7.4+aSeed.z*2.0)*compression;c=vec3(cos(a)*r,12.5+sin(a*1.7)*r*.45,sin(a)*r-16.0);}
 else if(cat<3.5){float lance=mod(floor(id/9.0),28.0),age=t-launch(lance),u=clamp(age/.52-aSeed.y*.12,0.0,1.0);life=step(0.0,age)*(1.0-smoothstep(.5,.8,age));c=mix(lanceOrigin(lance,launch(lance)),lanceEnd(lance),u*u)+vec3(cos(a),sin(a),sin(a*1.7))*.18;stretch=2.5;}
 else if(cat<4.5){float lance=mod(floor(id/9.0),28.0),age=max(0.0,t-launch(lance)-.52);life=step(launch(lance)+.52,t)*(1.0-smoothstep(.8,1.8,age));c=lanceEnd(lance)+vec3(cos(a)*age*2.4,max(0.0,age*(2.0+aSeed.z*2.0)-age*age*3.4),sin(a)*age*2.4);stretch=1.6;}
 else if(cat<5.5){float age=max(0.0,t-10.1),travel=(1.0-exp(-age*1.4))*(7.0+aSeed.z*15.0);life=gate(10.1,10.18,12.2,13.4,t);c=vec3(cos(a)*travel,max(.04,age*(5.0+aSeed.y*6.0)-age*age*3.5),sin(a)*travel);size*=1.45;stretch=1.0+max(0.0,2.0-age);}
 else if(cat<6.5){life=gate(10.2,10.7,13.7,15.5,t);float age=max(0.0,t-10.1),r=3.0+age*2.0+aSeed.z*7.0;c=vec3(cos(a)*r,.5+aSeed.y*2.2,sin(a)*r);size*=.35;}
 else if(cat<7.5){life=gate(12.3,12.9,15.0,15.8,t);float age=max(0.0,t-12.3),r=2.0+aSeed.z*7.0;c=vec3(cos(a)*r,max(.02,6.0+aSeed.y*4.0-age*age*(.5+aSeed.z)),sin(a)*r);stretch=2.0;}
 else{life=gate(12.0,13.0,15.2,16.0,t);float r=3.0+aSeed.z*11.0;c=vec3(cos(a)*r,.18+sin(a*2.0)*.1+fract(aSeed.y+t*.05)*.8,sin(a)*r);size*=.4;}
 vec3 n=normal;vec3 p=position*size*life*vec3(1,stretch,1)+c;if(life<.001)p.y=-3.0;vLocal=p;vNormal=mat3(modelMatrix)*n;vec4 w=modelMatrix*vec4(p,1);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`);
  readonly mesh: Mesh;
  constructor() {
    const b = new IcosahedronGeometry(1, 1),
      g = new InstancedBufferGeometry().copy(
        b as unknown as InstancedBufferGeometry,
      );
    b.dispose();
    const random = seeded(954),
      seed = new Float32Array(1800 * 4),
      ids = new Float32Array(1800);
    for (let i = 0; i < 1800; i++) {
      ids[i] = i;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = random();
    }
    g.setAttribute("aSeed", new InstancedBufferAttribute(seed, 4));
    g.setAttribute("aIndex", new InstancedBufferAttribute(ids, 1));
    g.instanceCount = 1800;
    this.material.uniforms.uHand = { value: new Vector3() };
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
  }
  update(t: number, count: number, detail: number, hand: Vector3): void {
    this.mesh.visible = t < 16;
    (this.mesh.geometry as InstancedBufferGeometry).instanceCount = count;
    this.material.uniforms.uHand.value.copy(hand);
    updateBlood(this.material, t, detail, 0.05);
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
