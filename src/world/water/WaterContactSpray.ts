import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, Vector3, DynamicDrawUsage } from 'three';
/** Shared shoe/contact/impact spray: fixed ring buffers, analytic GPU gravity and three droplet scales. */
export class WaterContactSpray {
  private readonly origins = new Float32Array(256 * 4);
  private readonly motions = new Float32Array(256 * 4);
  private readonly sizes = new Float32Array(256);
  private cursor = 0;
  private budgetTime = -1;
  private impactBudget = 0;
  private active = 0;
  readonly geometry = new BufferGeometry();
  readonly material = new ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:{uTime:{value:0}},
    vertexShader:`uniform float uTime;attribute vec4 aOrigin,aMotion;attribute float aSize;varying float vLife,vKind;
      void main(){float age=uTime-aOrigin.w;float life=max(.01,aMotion.w);vLife=step(0.,age)*(1.-smoothstep(life*.55,life,age));
      vec3 p=aOrigin.xyz+aMotion.xyz*max(0.,age)+vec3(0,-4.9*age*age,0);
      if(p.y<-.05)vLife=0.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(aSize*180./max(1.,-mv.z),1.,7.)*vLife;vKind=aSize;}`,
    fragmentShader:`varying float vLife,vKind;void main(){vec2 p=gl_PointCoord-.5;p.x*=1.4;float r=dot(p,p);if(r>.25||vLife<.001)discard;
      float glint=exp(-length(p-vec2(-.1,.15))*18.);gl_FragColor=vec4(mix(vec3(.09,.16,.23),vec3(.6,.76,.85),glint),(.35+glint*.4)*(1.-smoothstep(.05,.25,r))*vLife);}`,
  });
  readonly points = new Points(this.geometry,this.material);
  constructor(){
    for(let i=0;i<256;i++)this.origins[i*4+3]=-100;
    this.geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(256*3),3));
    this.geometry.setAttribute('aOrigin',new BufferAttribute(this.origins,4).setUsage(DynamicDrawUsage));
    this.geometry.setAttribute('aMotion',new BufferAttribute(this.motions,4).setUsage(DynamicDrawUsage));
    this.geometry.setAttribute('aSize',new BufferAttribute(this.sizes,1).setUsage(DynamicDrawUsage));
    this.points.frustumCulled=false;this.points.visible=false;
  }
  private particle(p:Readonly<Vector3>,time:number,vx:number,vy:number,vz:number,life:number,size:number):void{
    const i=this.cursor++%256,k=i*4;this.origins[k]=p.x;this.origins[k+1]=(Number.isFinite(p.y)?p.y:0)+.04;this.origins[k+2]=p.z;this.origins[k+3]=time;
    this.motions[k]=vx;this.motions[k+1]=vy;this.motions[k+2]=vz;this.motions[k+3]=life;this.sizes[i]=size;
  }
  emit(position:Vector3,time:number,count:number):void{
    for(let i=0;i<Math.min(32,count);i++){const a=this.cursor*2.399963;this.particle(position,time,Math.cos(a)*.4,.8+(i%4)*.15,Math.sin(a)*.4,.55,.08);}
    this.dirty();
  }
  emitImpact(position:Readonly<Vector3>,time:number,strength:number,density:number):void{
    if(!Number.isFinite(strength)||!Number.isFinite(density)||density<=0)return;
    if(this.budgetTime!==time){this.budgetTime=time;this.impactBudget=128;}
    const count=Math.min(this.impactBudget,Math.round((12+Math.min(1,strength)*50)*density));this.impactBudget-=count;
    for(let i=0;i<count;i++){const a=this.cursor*2.399963,s=(i%11)/11;this.particle(position,time,Math.cos(a)*(1+s*3),1.5+s*3.5,Math.sin(a)*(1+s*3),.6+s*.8,.055+s*.11);}
    this.dirty();
  }
  private dirty():void{for(const name of ['aOrigin','aMotion','aSize'])this.geometry.getAttribute(name).needsUpdate=true;}
  get count():number{return this.active;}
  update(time:number):void{this.material.uniforms.uTime.value=time;this.active=0;for(let i=0;i<256;i++){const age=time-this.origins[i*4+3];if(age>=0&&age<this.motions[i*4+3])this.active++;}this.points.visible=this.active>0;}
  dispose():void{this.geometry.dispose();this.material.dispose();this.points.removeFromParent();}
}
