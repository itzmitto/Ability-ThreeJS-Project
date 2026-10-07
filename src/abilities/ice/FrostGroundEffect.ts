import { AdditiveBlending, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import type { Group } from 'three';

export class FrostGroundEffect {
  private readonly material = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDetail: { value: 2 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv;uniform float uTime,uDetail;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){
        vec2 p=(vUv-0.5)*2.0;float r=length(p);float n=noise(p*8.0);float angle=atan(p.y,p.x);
        float spread=smoothstep(0.22,0.58,uTime);float bound=1.0-smoothstep(spread*0.80,spread*0.88+0.08,r+n*0.09);
        vec2 cell=p*7.0;vec2 g=floor(cell),f=fract(cell);float first=8.0,second=8.0;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(float(x),float(y));vec2 jitter=vec2(hash(g+o),hash(g+o+31.0));float d=length(o+jitter-f);if(d<first){second=first;first=d;}else if(d<second)second=d;}
        float cracks=1.0-smoothstep(0.015,0.065,second-first);
        float branches=pow(0.5+0.5*sin(angle*13.0+r*9.0+n*1.2),30.0)*(1.0-r);
        float ring=exp(-pow((r-spread*0.83)*85.0,2.0))*0.22;
        float pulse=exp(-max(0.0,uTime-0.58)*3.0);
        float fade=1.0-smoothstep(3.2,4.8,uTime);
        vec3 color=mix(vec3(0.05,0.21,0.30),vec3(0.42,0.90,1.0),cracks);
        color+=vec3(0.15,0.32,0.38)*pulse;
        float frost=pow(n,2.5)*0.28;
        float alpha=(frost+cracks*0.62+branches*0.20)*bound+ring;
        alpha*=fade*smoothstep(0.25,0.35,uTime)*(1.0-smoothstep(0.92,1.0,r));
        gl_FragColor=vec4(color,alpha);
      }`,
  });
  private readonly mesh: Mesh;
  constructor(parent: Group, geometry: PlaneGeometry) {
    this.mesh = new Mesh(geometry, this.material); this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.scale.setScalar(8.2); this.mesh.position.y = 0.055; parent.add(this.mesh);
  }
  setQuality(detail: number): void { this.material.uniforms.uDetail.value = detail; }
  update(time: number): void { this.material.uniforms.uTime.value = time; this.mesh.visible = time >= 0.2 && time < 4.85; }
  dispose(): void { this.mesh.removeFromParent(); this.material.dispose(); }
}
