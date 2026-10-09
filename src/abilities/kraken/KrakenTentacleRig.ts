// Port of KrakenAbility.js's two instanced variants and pose attributes.
// Copyright (c) 2026 mohamedachrefelouafi — MIT, public/licenses/LinearAbilityExtThreeJS.txt.
import { InstancedMesh, InstancedBufferAttribute, DynamicDrawUsage, Object3D, Vector3 } from 'three';
import type { ShaderMaterial } from 'three';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { clamp01, ease, hash } from '../elemental/ElementalVisuals';
import { createTentacleGeometry } from './KrakenGeometry';
import { createKrakenMaterial } from './KrakenMaterial';
import { KRAKEN, KRAKEN_QUALITY } from './KrakenConfig';
import type { KrakenBudget } from './KrakenConfig';
import { solveKrakenPose, strikeBeat, tentacleTip } from './KrakenTimeline';
import type { KrakenPose, StrikeBeat } from './KrakenTimeline';
interface ArmRecord { angle:number; radius:number; birth:number; seed:number; lastStrike:number; breached:boolean; }
export type KrakenImpact = (time:number,x:number,z:number,power:number,finale:boolean,breach:boolean)=>void;
export class KrakenTentacleRig {
  readonly material:ShaderMaterial;
  readonly meshes:InstancedMesh[]=[];
  private readonly geometry;
  private readonly shape:InstancedBufferAttribute[]=[];
  private readonly waves:InstancedBufferAttribute[]=[];
  private readonly life:InstancedBufferAttribute[]=[];
  private readonly records:ArmRecord[][]=[[],[]];
  private readonly transform=new Object3D();
  private readonly beat:StrikeBeat={time:0,finale:false,wind:1,fit:1};
  private readonly pose:KrakenPose={lean:0,curl:0,wave:0,twist:0,flash:0,squash:1};
  private readonly tip={x:0,y:0};
  private readonly up=new Vector3(0,1,0);
  private readonly unitStrikeReach:number;
  constructor(owner:VisualOwner,entry:number){
    tentacleTip(1,Math.PI,0,0,0,1,this.tip);
    this.unitStrikeReach=this.tip.x;
    this.material=owner.material(createKrakenMaterial());
    this.geometry=Object.values(KRAKEN_QUALITY).map(q=>[0,1].map(v=>owner.geometry(createTentacleGeometry({rings:q.rings,sides:q.sides,seed:3.7+v*17.3,taper:v?.0175:.05,swell:v?1.12:1.3}))));
    for(let v=0;v<2;v++){
      const cap=v?8:16;
      this.shape[v]=new InstancedBufferAttribute(new Float32Array(cap*4),4).setUsage(DynamicDrawUsage);
      this.waves[v]=new InstancedBufferAttribute(new Float32Array(cap*4),4).setUsage(DynamicDrawUsage);
      this.life[v]=new InstancedBufferAttribute(new Float32Array(cap*4),4).setUsage(DynamicDrawUsage);
      for(const row of this.geometry){row[v].setAttribute('aShape',this.shape[v]);row[v].setAttribute('aWave',this.waves[v]);row[v].setAttribute('aLife',this.life[v]);}
      const mesh=new InstancedMesh(this.geometry[0][v],this.material,cap);mesh.instanceMatrix.setUsage(DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=2;owner.root.add(mesh);this.meshes.push(mesh);
      // Records are fixed per cast. Bearings are resolved using current count below.
      for(let i=0;i<cap;i++)this.records[v].push({angle:entry,radius:0,birth:0,seed:hash(i+v*31+3),lastStrike:-1,breached:false});
    }
  }
  update(t:number,q:KrakenBudget,entry:number,onImpact:KrakenImpact):void {
    const detail=q.rings===24?0:q.rings===36?1:2;
    this.material.uniforms.uTime.value=t;this.material.uniforms.uNoiseOctaves.value=q.noise;
    this.material.uniforms.uBiolume.value=.4+ease((t-7.1)/.6)*(1-ease((t-7.85)/.5))*.3;
    this.material.uniforms.uColorFlush.value.setRGB(.028+Math.sin(t*.37)*.008,.065,.1+Math.sin(t*.28)*.025);
    this.material.uniforms.uOpacity.value=1-ease((t-9.9)/.55);
    for(let v=0;v<2;v++){
      const count=v?q.whips:q.arms,m=this.meshes[v];m.count=count;m.geometry=this.geometry[detail][v];m.visible=t<10.45;
      for(let i=0;i<count;i++){
        const r=this.records[v][i],seed=r.seed;
        r.angle=entry+((i+(v?.5:0)+(seed-.5)*.3)/count)*Math.PI*2;
        r.radius=KRAKEN.radius*(v?.85:1)*(1+(seed-.5)*.1);
        const around=Math.abs(Math.atan2(Math.sin(r.angle-entry),Math.cos(r.angle-entry)))/Math.PI;
        r.birth=1.1+around*.72+seed*.12+(v?.13:0);
        const emerge=clamp01((t-r.birth)/.84),retract=ease((t-8.65-seed*.18)/1.6);
        strikeBeat(t,r.birth,!!v,seed,this.beat);solveKrakenPose(t,r.birth,seed,this.beat,this.pose);
        // Compensate the 12-step integral's tiny circular-arc error so tips meet center.
        const length=(r.radius/this.unitStrikeReach)*(1-retract*.965);
        const phase=seed*Math.PI*2-t*1.3, freq=1.2+seed*.5;
        const p=this.pose;
        this.transform.position.set(Math.cos(r.angle)*r.radius,.035,Math.sin(r.angle)*r.radius);
        this.transform.quaternion.setFromAxisAngle(this.up,-(r.angle+Math.PI));this.transform.scale.setScalar(1);this.transform.updateMatrix();m.setMatrixAt(i,this.transform.matrix);
        this.shape[v].setXYZW(i,length,(v?.27:.78)*(1+seed*.24)*p.squash*(1-retract*.3),p.lean,p.curl);
        this.waves[v].setXYZW(i,p.wave,phase,p.twist,freq);
        this.life[v].setXYZW(i,emerge,p.flash,seed*10,retract*2.2);
        if(!r.breached&&emerge>.15){r.breached=true;onImpact(t,Math.cos(r.angle)*r.radius,Math.sin(r.angle)*r.radius,v?.22:.45,false,true);}
        if(t>=this.beat.time&&r.lastStrike!==this.beat.time&&emerge>=1&&t<8.4){
          r.lastStrike=this.beat.time;
          tentacleTip(length,Math.PI,0,0,phase,freq,this.tip);
          onImpact(this.beat.time,Math.cos(r.angle)*(r.radius-this.tip.x),Math.sin(r.angle)*(r.radius-this.tip.x),v?.38:1,this.beat.finale,false);
        }
      }
      m.instanceMatrix.needsUpdate=true;this.shape[v].needsUpdate=true;this.waves[v].needsUpdate=true;this.life[v].needsUpdate=true;
    }
  }
}
