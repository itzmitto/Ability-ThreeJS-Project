import { InstancedMesh, Mesh, Object3D, ShaderMaterial } from 'three';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { gridGeometry } from '../elemental/ElementalVisuals';
import { crescentGeometry, packMaterial, ease } from '../elemental/PackVisuals';
/** Open corkscrew ribbons with porous dusty shading, never a solid cone. */
export class GlassTempestVisuals {
  readonly ribbons: Mesh[]=[];
  readonly blades:Mesh[]=[];
  readonly trails:InstancedMesh;
  readonly sandMaterial:ShaderMaterial;
  readonly glassMaterial:ShaderMaterial;
  private readonly dummy=new Object3D();
  constructor(owner:VisualOwner){
    this.sandMaterial=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:2,uniforms:{uTime:{value:0},uRise:{value:0},uCompress:{value:0},uFade:{value:1}},
      vertexShader:`varying vec2 vUv;uniform float uTime,uRise,uCompress;void main(){vUv=uv;float h=uv.x*9.*uRise*(1.-uCompress*.7);float a=uv.x*17.+uTime*(1.3+uCompress*3.)+(uv.y-.5)*.75;float r=(1.7+uv.x*2.+sin(uv.x*22.-uTime*3.)*.22)*(1.-uCompress*.88);vec3 p=vec3(cos(a)*r,h+.16*sin(a*2.),sin(a)*r);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime,uFade,uCompress;void main(){float bands=.5+.5*sin(vUv.x*130.-uTime*8.+sin(vUv.y*30.)*2.);float pores=smoothstep(.17,.7,bands);float edge=pow(max(0.,sin(vUv.y*3.14159)),1.7);float vertical=sin(vUv.x*3.14159);vec3 col=mix(vec3(.22,.13,.055),vec3(.78,.63,.36),bands);col+=vec3(.19,.12,.04)*uCompress;gl_FragColor=vec4(col,pores*edge*vertical*uFade*.52);}` }));
    const ribbon=owner.geometry(gridGeometry(100,8));for(let i=0;i<8;i++){const m=new Mesh(ribbon,this.sandMaterial);m.rotation.y=i*2.39996;m.frustumCulled=false;this.ribbons.push(m);owner.root.add(m);}
    this.glassMaterial=owner.material(packMaterial('#e5d8ad',true));const blade=owner.geometry(crescentGeometry());for(let i=0;i<9;i++){const m=new Mesh(blade,this.glassMaterial);this.blades.push(m);owner.root.add(m);}
    this.trails=new InstancedMesh(blade,this.glassMaterial,36);this.trails.frustumCulled=false;owner.root.add(this.trails);
  }
  update(t:number,ribbons:number,blades:number,fade:number):void{
    const compress=ease((t-3.4)/1),growth=ease((t-.3)/1.5),u=this.sandMaterial.uniforms;u.uTime.value=t;u.uRise.value=growth;u.uCompress.value=compress;u.uFade.value=fade*(1-ease((t-4.4)/.35));
    this.ribbons.forEach((m,i)=>{m.visible=i<ribbons&&t>=.3&&t<4.75;m.rotation.y=i*2.39996+t*.12;});this.glassMaterial.uniforms.uTime.value=t;this.glassMaterial.uniforms.uFade.value=fade;this.glassMaterial.uniforms.uEnergy.value=.15+compress*.8;
    let n=0;
    for(let i=0;i<9;i++){const m=this.blades[i],launch=2.4+i*.085,p=Math.max(0,Math.min(1,(t-launch)/.42)),form=ease((t-1.6-i*.055)/.5),a=i*2.39996+Math.min(t,launch)*.35,r=6*(1-p);m.visible=i<blades&&t>=1.6+i*.055&&p<1;m.position.set(Math.cos(a)*r,1+(4+i%3)*(1-p),Math.sin(a)*r);m.rotation.set(.4+p*.7,a+.5,i*.3);m.scale.setScalar(form*(.55+(i%3)*.1)*(1-ease((p-.88)/.12)));
      if(i>=blades||t<launch||t>launch+.52)continue;
      for(let j=0;j<4;j++){const tail=Math.max(0,Math.min(1,(t-launch-j*.018)/.42)),d=this.dummy;d.position.set(Math.cos(a)*6*(1-tail),1+(4+i%3)*(1-tail),Math.sin(a)*6*(1-tail));d.rotation.copy(m.rotation);d.scale.set(.5*(1-j*.18)*(1-tail),.5*(1-j*.18)*(1-tail),.08);d.updateMatrix();this.trails.setMatrixAt(n++,d.matrix);}
    }
    this.trails.count=n;this.trails.visible=n>0;this.trails.instanceMatrix.needsUpdate=true;
  }
}
