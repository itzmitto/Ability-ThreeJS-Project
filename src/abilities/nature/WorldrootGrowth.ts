import { CatmullRomCurve3, ConeGeometry, InstancedMesh, Mesh, Object3D, ShaderMaterial, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { VisualOwner,gridGeometry } from '../elemental/ElementalVisuals';
import { ease,hash,packMaterial } from '../elemental/PackVisuals';
function rootCurve(variant:number,small=false):CatmullRomCurve3{
  return new CatmullRomCurve3(small?[new Vector3(6,0,0),new Vector3(8,1,1),new Vector3(6,4,2),new Vector3(3,6,1),new Vector3(2,4,-1)]
    :[new Vector3(6.8,0,0),new Vector3(7.6,1.8,1+variant*.3),new Vector3(7.1,5,1.6),new Vector3(4.8,8.4+variant*.65,.3),new Vector3(1.8,10+variant*.5,-1.4),new Vector3(.4,7.4+variant*.3,-.7)]);
}
function taperedRoot(curve:CatmullRomCurve3,segments:number,radial:number,radius:number):TubeGeometry{
  const g=new TubeGeometry(curve,segments,radius,radial,false),p=g.getAttribute('position'),uv=g.getAttribute('uv'),center=new Vector3();
  for(let i=0;i<p.count;i++){const t=uv.getX(i);curve.getPointAt(t,center);const taper=Math.pow(1-t,.8)*.94+.06,rough=1+.08*Math.sin(t*50+uv.getY(i)*19)+.035*Math.cos(t*91-uv.getY(i)*31);p.setXYZ(i,center.x+(p.getX(i)-center.x)*taper*rough,center.y+(p.getY(i)-center.y)*taper*rough,center.z+(p.getZ(i)-center.z)*taper*rough);}
  g.computeVertexNormals();return g;
}
function barkMaterial():ShaderMaterial{
  return new ShaderMaterial({transparent:true,side:2,uniforms:{uTime:{value:0},uGrowth:{value:0},uCrush:{value:0},uEnergy:{value:0},uFade:{value:1},uLift:{value:0}},
    vertexShader:`varying vec2 vUv;varying vec3 vP,vW,vN;uniform float uTime,uCrush,uLift;void main(){vUv=uv;vP=position;vec3 p=position;float grip=smoothstep(1.,7.,p.y);p.xz*=1.-uCrush*.66*grip;p.y*=uLift;p.y-=pow(uCrush,1.8)*uv.x*3.6;p.xz+=vec2(sin(uv.x*18.+uTime),cos(uv.x*19.+uTime))*.06*uv.x;vec4 w=modelMatrix*vec4(p,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`varying vec2 vUv;varying vec3 vP,vW,vN;uniform float uTime,uGrowth,uCrush,uEnergy,uFade;void main(){if(vUv.x>uGrowth)discard;float bark=.5+.5*sin(vUv.y*85.+sin(vUv.x*43.)*3.+vUv.x*13.);float groove=pow(max(0.,sin(vUv.y*44.+sin(vUv.x*15.)*2.)),12.);float vein=pow(max(0.,sin(vUv.y*31.+vUv.x*17.-uTime*2.)),16.);float moss=smoothstep(.3,.75,sin(vP.x*3.+vP.z*5.)*sin(vP.y*4.));float lit=.3+.7*max(0.,dot(normalize(vN),normalize(vec3(-.4,.85,.3))));vec3 wood=mix(vec3(.09,.055,.025),vec3(.3,.21,.105),bark);wood=mix(wood,vec3(.08,.15,.055),moss*.55);wood*=lit*(1.-groove*.35);float pulse=.55+.45*sin(vUv.x*18.-uTime*6.);vec3 glow=vec3(.18,.55,.13)*vein*uEnergy*(.5+pulse);gl_FragColor=vec4(wood+glow,uFade);}` });
}
export class WorldrootGrowth {
  readonly roots:Mesh[]=[];
  readonly vines:Mesh[]=[];
  readonly thorns:InstancedMesh;
  readonly material:ShaderMaterial;
  readonly vineMaterial:ShaderMaterial;
  readonly field:Mesh;
  readonly fieldMaterial:ShaderMaterial;
  private readonly geometries:BufferGeometry[][]=[];
  private readonly thornPositions=new Float32Array(120*3);
  private readonly dummy=new Object3D();
  private readonly thornMaterial;
  constructor(owner:VisualOwner){
    this.material=owner.material(barkMaterial());this.vineMaterial=owner.material(barkMaterial());
    for(const segments of [32,52,76])this.geometries.push([0,1,2].map(i=>owner.geometry(taperedRoot(rootCurve(i),segments,8,.9+i*.12))));
    for(let i=0;i<10;i++){const m=new Mesh(this.geometries[1][i%3],this.material);m.rotation.y=i*2.39996;this.roots.push(m);owner.root.add(m);}
    const vine=owner.geometry(taperedRoot(rootCurve(0,true),40,6,.22));for(let i=0;i<18;i++){const m=new Mesh(vine,this.vineMaterial);m.rotation.y=i*2.39996+.7;m.scale.set(1+(i%3)*.07,1+(i%4)*.16,1);this.vines.push(m);owner.root.add(m);}
    this.thornMaterial=owner.material(packMaterial('#6d7440'));this.thorns=new InstancedMesh(owner.geometry(new ConeGeometry(.22,.95,5)),this.thornMaterial,120);this.thorns.frustumCulled=false;owner.root.add(this.thorns);
    const point=new Vector3();for(let i=0;i<120;i++){const root=i%10,t=.17+Math.floor(i/10)/12*.73,a=root*2.39996;rootCurve(root%3).getPointAt(t,point);const k=i*3;this.thornPositions[k]=point.x*Math.cos(a)+point.z*Math.sin(a);this.thornPositions[k+1]=point.y;this.thornPositions[k+2]=-point.x*Math.sin(a)+point.z*Math.cos(a);}
    this.fieldMaterial=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:2,uniforms:{uTime:{value:0},uPower:{value:0}},
      vertexShader:`varying vec2 vUv;uniform float uTime,uPower;void main(){vUv=uv;vec2 p=(position.xy*2.-1.)*11.;float r=length(p);float y=.075+sin(r*4.-uTime*6.)*.09*uPower;gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,y,p.y,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime,uPower;void main(){vec2 p=vUv*2.-1.;float r=length(p),a=atan(p.y,p.x);if(r>1.)discard;float roots=pow(max(0.,cos(a*9.+sin(r*13.-uTime*.7)*.55)),18.);float wave=pow(max(0.,sin(r*35.-uTime*7.)),12.);float mask=(1.-smoothstep(.7,1.,r))*smoothstep(.04,.15,r);vec3 col=mix(vec3(.02,.065,.018),vec3(.27,.58,.15),roots);gl_FragColor=vec4(col,mask*uPower*(roots*.48+wave*.28));}` }));
    this.field=new Mesh(owner.geometry(gridGeometry(48,48)),this.fieldMaterial);this.field.frustumCulled=false;owner.root.add(this.field);
  }
  update(t:number,roots:number,vines:number,thorns:number,detail:number,fade:number):void{
    const growth=ease((t-.8)/2.4),lift=ease((t-.8)/1.2),crush=ease((t-4.1)/.65)*(1-ease((t-5.5)/1.5)),energy=(.25+ease((t-3)/1.5)*1.2)*(1-ease((t-5)/2));
    for(const m of [this.material,this.vineMaterial]){m.uniforms.uTime.value=t;m.uniforms.uCrush.value=crush;m.uniforms.uEnergy.value=energy;m.uniforms.uFade.value=fade;m.uniforms.uLift.value=lift;}this.material.uniforms.uGrowth.value=growth;this.vineMaterial.uniforms.uGrowth.value=ease((t-1.5)/1.7);
    this.roots.forEach((m,i)=>{m.visible=i<roots&&t>=.8;m.geometry=this.geometries[detail][i%3];m.position.y=-ease((t-6.8)/1.2)*(3+hash(i)*2);m.rotation.y=i*2.39996+ease((t-5.5)/1.5)*.12*Math.sin(i);});
    this.vines.forEach((m,i)=>{m.visible=i<vines&&t>=1.5;m.position.y=-ease((t-6.6)/1.4)*4;m.rotation.y=i*2.39996+.7+ease((t-5.5)/1.5)*.4;});
    this.thorns.count=thorns;this.thorns.visible=t>=1;this.thornMaterial.uniforms.uTime.value=t;this.thornMaterial.uniforms.uFade.value=fade;this.thornMaterial.uniforms.uEnergy.value=energy*.4;
    const d=this.dummy;
    for(let i=0;i<thorns;i++){const source=(i%roots)+Math.floor(i/roots)*10,k=source*3,y=this.thornPositions[k+1],grip=ease((y-1)/6),g=ease((growth-(.17+Math.floor(source/10)/12*.73))/.1),angle=i%roots*2.39996;d.position.set(this.thornPositions[k]*(1-crush*.66*grip),y*lift-crush**1.8*(.17+Math.floor(source/10)/12*.73)*3.6-ease((t-6.8)/1.2)*4,this.thornPositions[k+2]*(1-crush*.66*grip));d.rotation.set(.2,angle,-1.1);d.scale.setScalar(g*fade*(.7+hash(i)*.5));d.updateMatrix();this.thorns.setMatrixAt(i,d.matrix);}this.thorns.instanceMatrix.needsUpdate=true;
    this.fieldMaterial.uniforms.uTime.value=t;this.fieldMaterial.uniforms.uPower.value=ease((t-.3)/.6)*fade*(.4+energy*.3);
  }
}
