import { MathUtils, Vector3 } from 'three';
import type { Object3D } from 'three';
import { CHARACTER_CONFIG as C, characterCastStyle, shortestHeadingDifference } from './CharacterConfig';
import type { CastStyle } from './CharacterConfig';
import type { CharacterRig } from './CharacterRig';
import { TwoBoneCorrection } from './CharacterFootIK';
/** Conservative post-mixer upper-body layer. No cast clips are fabricated. */
export class CharacterMotion {
  castStyle:CastStyle='strike';castPhase:'READY'|'CAST'|'RECOVER'='READY';
  private remaining=0;private duration=0;private elevation=.18;private clock=0;
  private heading=0;private turn=0;private speed=0;private lean=0;private headYaw=0;private headPitch=0;
  private readonly aim=new Vector3(0,0,-1);private aimed=false;
  private explicitCast=false;private spatialCut=false;private cutProgress=0;
  private readonly axis=new Vector3();private readonly point=new Vector3();private readonly target=new Vector3();
  private readonly solver=new TwoBoneCorrection();
  constructor(private readonly rig:CharacterRig,private readonly root:Object3D){}
  begin(duration:number,elevation=.18):void {if(!Number.isFinite(duration)||duration<=0)return;this.duration=this.remaining=Math.min(1.5,duration);this.elevation=Number.isFinite(elevation)?MathUtils.clamp(elevation,.18,1.5):.18;this.explicitCast=true;}
  ability(id:string,direction:Vector3):void {
    this.castStyle=characterCastStyle(id);this.spatialCut=id==='riftreaver';
    if(direction.toArray().every(Number.isFinite)&&direction.lengthSq()>.001){this.aim.copy(direction).normalize();this.aimed=true;}
    // An ability's existing explicit pose wins. Otherwise each accepted cast starts its own gesture,
    // even when another slot's previous pose is still recovering.
    if(!this.explicitCast)this.begin(this.castStyle==='summon'?1.3:this.castStyle==='heavy'?.9:.55,this.castStyle==='summon'?1.1:.18);
    this.explicitCast=false;
  }
  setAim(direction:Vector3):void {if(Number.isFinite(direction.x)&&Number.isFinite(direction.y)&&Number.isFinite(direction.z)&&direction.lengthSq()>.001){this.aim.copy(direction).normalize();this.aimed=true;}}
  update(delta:number,speed:number,sprint:boolean):void {
    this.explicitCast=false;
    this.clock+=delta;const yaw=this.root.parent?.rotation.y??0,blend=1-Math.exp(-delta*9);
    const turnRate=delta>0?shortestHeadingDifference(yaw,this.heading)/delta:0;this.heading=yaw;this.turn=MathUtils.lerp(this.turn,MathUtils.clamp(turnRate,-4,4),blend);
    const acceleration=delta>0?(speed-this.speed)/delta:0;this.speed=speed;
    this.lean=MathUtils.lerp(this.lean,MathUtils.clamp(speed*.004+acceleration*.002+(sprint?.025:0),-.025,C.lean),blend);
    const spine=this.rig.bone('Spine1'),chest=this.rig.bone('Spine2'),head=this.rig.bone('Head');
    if(spine){this.axis.set(Math.cos(yaw),0,-Math.sin(yaw));this.rig.rotateWorld(spine,this.axis,-this.lean);this.axis.set(0,1,0);this.rig.rotateWorld(spine,this.axis,this.turn*.012);}
    if(chest){const breath=Math.sin(this.clock*1.8)*C.breathing*(1-Math.min(1,speed/2));chest.scale.y*=1+breath;chest.scale.z*=1+breath*.35;}
    if(head&&this.aimed){const targetYaw=shortestHeadingDifference(Math.atan2(-this.aim.x,-this.aim.z),yaw);this.headYaw=MathUtils.lerp(this.headYaw,MathUtils.clamp(targetYaw,-C.headYaw,C.headYaw),blend);this.headPitch=MathUtils.lerp(this.headPitch,MathUtils.clamp(this.aim.y,-C.headPitch,C.headPitch),blend);this.axis.set(0,1,0);this.rig.rotateWorld(head,this.axis,this.headYaw);this.axis.set(Math.cos(yaw),0,-Math.sin(yaw));this.rig.rotateWorld(head,this.axis,this.headPitch);}
    this.remaining=Math.max(0,this.remaining-delta);
    this.castPhase=this.remaining<=0?'READY':this.remaining<C.castRecovery?'RECOVER':'CAST';
    if(this.remaining<=0)return;
    const elapsed=this.duration-this.remaining,weight=MathUtils.smoothstep(Math.min(1,elapsed/C.castAttack,this.remaining/C.castRecovery),0,1)*.92;
    this.cutProgress=MathUtils.smoothstep(elapsed/.3,0,1);
    if(this.spatialCut&&spine){this.axis.set(0,1,0);this.rig.rotateWorld(spine,this.axis,(.04-.08*this.cutProgress)*weight);}
    this.arm('R',yaw,weight,this.spatialCut?.38-.3*this.cutProgress:this.elevation);
    if(this.castStyle==='summon')this.arm('L',yaw,weight*.65,this.elevation*.9);
  }
  private arm(side:'L'|'R',yaw:number,weight:number,elevation:number):void {
    const upper=this.rig.bone(`${side}_UpperArm`),lower=this.rig.bone(`${side}_Forearm`),hand=this.rig.bone(`${side}_Hand`);if(!upper||!lower||!hand)return;
    const castYaw=yaw+(this.aimed?MathUtils.clamp(shortestHeadingDifference(Math.atan2(-this.aim.x,-this.aim.z),yaw),-.6,.6):0);
    upper.getWorldPosition(this.point);this.axis.set(-Math.sin(castYaw),elevation,-Math.cos(castYaw)).normalize();
    // Leave elbow flexion and a small lateral clearance from the chest.
    this.target.copy(this.point).addScaledVector(this.axis,this.spatialCut?.35+.14*this.cutProgress:.49).addScaledVector(this.axis.set(Math.cos(yaw),0,-Math.sin(yaw)),this.spatialCut?.13-.23*this.cutProgress:side==='R'?.025:-.025);
    this.solver.solve(upper,lower,hand,this.target,weight);
    this.rig.openHand(side,weight*.55);
  }
}
