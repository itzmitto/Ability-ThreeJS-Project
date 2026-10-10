import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import { frostNoise } from '../frostLance/FrostLanceNoise';
import type { KingConfig } from './DrownedKingConfig';
import { seed } from './DrownedKingConfig';
export class DrownedKingCape {
  readonly mesh:Mesh;private readonly geometry=new BufferGeometry();
  private readonly uniforms={uCapeTime:{value:0},uFlow:{value:1},uCapeFade:{value:1},uCapeLength:{value:1}};
  private readonly material=new MeshStandardMaterial({color:'#101923',roughness:.9,metalness:0,side:DoubleSide,transparent:true,opacity:.88,depthWrite:false,fog:false});
  constructor(){
    const positions:number[]=[],uv:number[]=[],indices:number[]=[];const n=28,m=22;
    for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){const u=i/n,v=j/m,tear=(j===m?seed(i)*7:0),width=17*(1-v*.2);
      positions.push((u-.5)*2*width,62-v*45+tear,-9-v*11);uv.push(u,v);}
    for(let j=0;j<m;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;indices.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
    this.geometry.setAttribute('position',new Float32BufferAttribute(positions,3));this.geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));this.geometry.setIndex(indices);this.geometry.computeVertexNormals();
    this.material.onBeforeCompile=s=>{Object.assign(s.uniforms,this.uniforms);s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
      uniform float uCapeTime,uFlow,uCapeLength;varying vec2 vCapeUv;`)
      .replace('#include <beginnormal_vertex>',`float dzdx=cos(position.x*.2+uCapeTime*.7)*uv.y*.8*uFlow;
        float dzdy=-sin(position.x*.2+uCapeTime*.7)*4.*uFlow/max(10.,45.*uCapeLength);
        vec3 objectNormal=normalize(vec3(-dzdx,-dzdy,1.));`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vCapeUv=uv;transformed.y=62.+(position.y-62.)*uCapeLength;transformed.z+=sin(position.x*.2+uCapeTime*.7)*uv.y*4.*uFlow;
        transformed.x+=sin(uv.y*5.-uCapeTime*.6)*uv.y*1.5*uFlow;`);
      s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
        uniform float uCapeFade;varying vec2 vCapeUv;${frostNoise}`)
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        float n=snoise(vec3(vCapeUv*25.,0.));if(vCapeUv.y>.55&&n>.4)discard;
        diffuseColor.rgb*=.8+n*.1;totalEmissiveRadiance+=vec3(.008,.025,.028)*pow(abs(n),4.);`)
      .replace('#include <opaque_fragment>',`diffuseColor.a*=uCapeFade;#include <opaque_fragment>` .replace(';#include',';\n#include'));
    };this.material.customProgramCacheKey=()=> 'drowned-king-torn-cape-v1';this.mesh=new Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=2;
  }
  update(t:number,c:Readonly<KingConfig>,fade:number):void{this.uniforms.uCapeTime.value=t;this.uniforms.uFlow.value=c.capeTurbulence;this.uniforms.uCapeFade.value=fade;this.uniforms.uCapeLength.value=c.capeLength;}
  dispose():void{this.geometry.dispose();this.material.dispose();this.mesh.removeFromParent();}
}
