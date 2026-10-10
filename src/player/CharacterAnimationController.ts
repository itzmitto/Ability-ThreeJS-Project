import { AnimationMixer, MathUtils, Vector3 } from 'three';
import type { AnimationAction, AnimationClip, Object3D } from 'three';
import { CHARACTER_CONFIG as C } from './CharacterConfig';
import type { CharacterRig } from './CharacterRig';
export type LocomotionState='IDLE'|'START'|'WALK'|'RUN'|'SPRINT'|'DECELERATE';
export class CharacterAnimationController {
  readonly mixer:AnimationMixer;
  readonly weights={Idle:1,Walk:0,Run:0};
  readonly sourceSpeeds={Walk:1.6,Run:3.4};
  state:LocomotionState='IDLE';phase=0;cadence=0;speed=0;
  private readonly actions=new Map<string,AnimationAction>();
  private runOffset=0;
  private previousSpeed=0;
  constructor(readonly model:Object3D,clips:readonly AnimationClip[],rig:CharacterRig) {
    this.mixer=new AnimationMixer(model);
    for(const clip of clips){const action=this.mixer.clipAction(clip);action.play().setEffectiveWeight(0);this.actions.set(clip.name,action);}
    const walk=this.calibrate('Walk',rig),run=this.calibrate('Run',rig);
    this.sourceSpeeds.Walk=walk.speed;this.sourceSpeeds.Run=run.speed;this.runOffset=run.leftContact-walk.leftContact;
    for(const [name,a]of this.actions){a.reset().play().setEffectiveWeight(name==='Idle'?1:0);a.setEffectiveTimeScale(name==='Idle'?1:0);}
    this.mixer.update(0);rig.capture();
  }
  /** Measure backward stance travel from the actual in-place clips at normalized human scale. */
  private calibrate(name:'Walk'|'Run',rig:CharacterRig):{speed:number;leftContact:number} {
    const action=this.actions.get(name),foot=rig.bone('L_Foot');if(!action||!foot)return {speed:this.sourceSpeeds[name],leftContact:0};
    for(const a of this.actions.values())a.setEffectiveWeight(a===action?1:0).setEffectiveTimeScale(0);
    const samples:{y:number;z:number}[]=[],point=new Vector3(),n=48,duration=action.getClip().duration;
    for(let i=0;i<n;i++){action.time=i/n*duration;this.mixer.update(0);this.model.updateWorldMatrix(true,true);foot.getWorldPosition(point);samples.push({y:point.y,z:point.z});}
    const minimum=Math.min(...samples.map(p=>p.y)),velocities:number[]=[];
    for(let i=1;i<n;i++){const a=samples[i-1],b=samples[i];if(a.y<minimum+.10&&b.y<minimum+.10&&b.z>a.z)velocities.push((b.z-a.z)/(duration/n));}
    // Late/early contact slows before toe-off; use the central, faster stance samples.
    velocities.sort((a,b)=>a-b);const measured=velocities[Math.floor(velocities.length*.75)]??this.sourceSpeeds[name];
    return {speed:MathUtils.clamp(measured,name==='Walk'?.9:2.2,name==='Walk'?2.7:5),leftContact:samples.findIndex(p=>p.y===minimum)/n};
  }
  update(delta:number,speed:number,sprint=false):void {
    delta=Number.isFinite(delta)?MathUtils.clamp(delta,0,.1):0;speed=Number.isFinite(speed)?MathUtils.clamp(speed,0,12):0;
    const moving=MathUtils.smoothstep(speed,.06,.65),run=MathUtils.smoothstep(speed,C.walkToRunStart,C.walkToRunEnd);
    const blend=1-Math.exp(-C.blendRate*delta);
    this.weights.Idle=MathUtils.lerp(this.weights.Idle,1-moving,blend);
    this.weights.Walk=MathUtils.lerp(this.weights.Walk,moving*(1-run),blend);
    this.weights.Run=Math.max(0,1-this.weights.Idle-this.weights.Walk);
    const weightSum=this.weights.Idle+this.weights.Walk+this.weights.Run;this.weights.Idle/=weightSum;this.weights.Walk/=weightSum;this.weights.Run/=weightSum;
    const walk=this.actions.get('Walk'),running=this.actions.get('Run'),sum=this.weights.Walk+this.weights.Run;
    const cycles=sum>.01&&walk&&running?speed*(this.weights.Walk/(this.sourceSpeeds.Walk*walk.getClip().duration)+this.weights.Run/(this.sourceSpeeds.Run*running.getClip().duration))/sum:0;
    this.cadence=Math.min(3.4,cycles);this.phase=(this.phase+this.cadence*delta)%1;
    if(walk)walk.time=this.phase*walk.getClip().duration;if(running)running.time=((this.phase+this.runOffset+1)%1)*running.getClip().duration;
    for(const [name,a]of this.actions)a.setEffectiveWeight(this.weights[name as keyof typeof this.weights]??0);
    this.mixer.update(delta);
    this.state=speed<.12?'IDLE':speed<this.previousSpeed-.04?'DECELERATE':speed<.7?'START':sprint&&speed>6?'SPRINT':run>.5?'RUN':'WALK';
    this.previousSpeed=this.speed=speed;
  }
  get activeClip():'Idle'|'Walk'|'Run' {return this.weights.Idle>.5?'Idle':this.weights.Run>this.weights.Walk?'Run':'Walk';}
  dispose():void {this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.actions.clear();}
}
