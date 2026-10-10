import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { frostNoise } from '../frostLance/FrostLanceNoise';
import { smooth,type KingConfig,type KingQuality } from './DrownedKingConfig';
function waterWall(n:number):BufferGeometry{
  const p:number[]=[],uv:number[]=[],idx:number[]=[],section=[[0,0],[.6,.18],[.8,.65],[.3,1],[-.3,.75],[-.12,0]];
  for(let i=0;i<=n;i++)for(let j=0;j<6;j++){p.push(i/n-.5,section[j][1],section[j][0]);uv.push(i/n,section[j][1]);}
  for(let i=0;i<n;i++)for(let j=0;j<6;j++){const k=i*6+j,next=i*6+(j+1)%6;idx.push(k,next,k+6,next,next+6,k+6);}
  for(const offset of [0,n*6])for(let j=1;j<5;j++)idx.push(offset,offset+j,offset+j+1);
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export class DrownedKingOcean {
  readonly root=new Group();readonly walls:Mesh[]=[];private readonly lods=[48,80,120].map(waterWall);
  private readonly materials:MeshStandardMaterial[]=[];private readonly wallUniforms:{uAge:{value:number},uLength:{value:number},uWidth:{value:number},uHeight:{value:number},uSide:{value:number},uWallFade:{value:number}}[]=[];
  private readonly swirlMaterial=new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
    uniforms:{uTime:{value:0},uRadius:{value:35},uOpacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float uTime,uRadius,uOpacity;void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);
      float rip=pow(max(0.,sin(r*30.+uTime*2.+sin(a*3.-uTime))),8.)*smoothstep(.1,.4,r)*(1.-smoothstep(.6,1.,r));
      float core=exp(-r*r*9.);gl_FragColor=vec4(mix(vec3(.003,.009,.012),vec3(.08,.2,.2),rip),uOpacity*(core*.35+rip*.3));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  readonly swirl=new Mesh(new PlaneGeometry(2,2),this.swirlMaterial);
  private readonly axis=new Vector3(0,1,0);
  constructor(){
    for(const side of [-1,1]){
      const u={uAge:{value:0},uLength:{value:105},uWidth:{value:9},uHeight:{value:0},uSide:{value:side},uWallFade:{value:1}};
      const m=new MeshStandardMaterial({color:'#173136',roughness:.22,metalness:.08,fog:false,transparent:true,opacity:.87,depthWrite:false,side:DoubleSide});
      m.onBeforeCompile=s=>{Object.assign(s.uniforms,u);
        s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
          uniform float uAge,uLength,uWidth,uHeight,uSide;varying vec2 vWallUv;`)
          .replace('#include <beginnormal_vertex>',`vec3 objectNormal=normalize(vec3(-cos(uv.x*38.+uAge)*.25,normal.y,normal.z*uSide));`)
          .replace('#include <begin_vertex>',`float crest=(.88+.07*sin(uv.x*38.-uAge*2.)+.04*sin(uv.x*83.+uAge*4.));
            float endFade=sin(uv.x*3.14159);vec3 transformed=vec3(position.x*uLength,position.y*uHeight*crest*pow(endFade,.4),uSide*(uWidth+uAge*2.+position.z*4.));vWallUv=uv;`);
        s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
          varying vec2 vWallUv;uniform float uAge,uWallFade;${frostNoise}`)
          .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
            float n=snoise(vec3(vWallUv*vec2(60.,7.),uAge*.7));float foam=smoothstep(.55,.94,vWallUv.y+n*.15);
            diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.38,.55,.58),foam*.8);totalEmissiveRadiance+=vec3(.012,.035,.037)*foam;`)
          .replace('#include <opaque_fragment>',`diffuseColor.a*=uWallFade*(1.-smoothstep(.9,1.,vWallUv.y));
            if(diffuseColor.a<.01)discard;
            #include <opaque_fragment>`);
      };m.customProgramCacheKey=()=> 'drowned-king-volume-waterwall-v1';const wall=new Mesh(this.lods[0],m);wall.frustumCulled=false;wall.renderOrder=3;wall.name=`Sea split wall ${side}`;
      this.materials.push(m);this.wallUniforms.push(u);this.walls.push(wall);this.root.add(wall);
    }
    this.swirl.rotation.x=-Math.PI/2;this.swirl.renderOrder=1;this.root.add(this.swirl);
  }
  update(t:number,midpoint:Vector3,start:Vector3,c:Readonly<KingConfig>,q:KingQuality,yaw:number):void{
    this.root.position.copy(midpoint);this.root.rotation.y=yaw-Math.PI/2;const age=Math.max(0,t-9),life=age/c.waterWallDuration;
    for(let i=0;i<2;i++){const u=this.wallUniforms[i];u.uAge.value=age;u.uLength.value=c.splitLength;u.uWidth.value=c.splitWidth;
      u.uHeight.value=c.waterWallHeight*smooth(age/.35)*(1-smooth(life));u.uWallFade.value=1-smooth(life);this.walls[i].geometry=this.lods[q.tier];this.walls[i].visible=t>=9&&life<1;}
    this.swirl.position.copy(start).sub(midpoint).applyAxisAngle(this.axis,-this.root.rotation.y);this.swirl.position.y=.07;this.swirl.scale.setScalar(35);
    this.swirlMaterial.uniforms.uTime.value=t;this.swirlMaterial.uniforms.uOpacity.value=smooth(t/1.5)*(1-smooth((t-4)/2));
  }
  dispose():void{this.lods.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.swirl.geometry.dispose();this.swirlMaterial.dispose();this.root.clear();}
}
