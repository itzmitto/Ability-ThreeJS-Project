import {Color,Group,Object3D,Quaternion} from 'three';
import type {AbilityCastContext} from '../Ability';
import {VisualOwner,ease,hash} from '../elemental/ElementalVisuals';
import {AstralParticles} from '../elemental/AstralVisuals';
import type {ChronoState} from './ChronoTimeline';
/** Analytic paths are evaluated with the same local clock, so rewind retraces actual prior positions. */
export class TemporalParticles{
  readonly particles:AstralParticles;
  private readonly dummy=new Object3D();
  private readonly inverse=new Quaternion();
  private readonly gold=new Color('#f5d18a');
  private readonly cyan=new Color('#a6e8ff');
  constructor(owner:VisualOwner,private readonly parent:Group){this.particles=new AstralParticles(owner,500,'#f5d18a','solar');parent.add(this.particles.mesh);}
  update(age:number,s:ChronoState,count:number,context:AbilityCastContext):void{
    const mesh=this.particles.mesh;mesh.count=count;mesh.visible=age>=.25;this.particles.material.uniforms.uColor.value.copy(this.gold).lerp(this.cyan,s.blue*.85);this.particles.material.uniforms.uFade.value=s.fade*.72;
    this.parent.getWorldQuaternion(this.inverse).invert();const d=this.dummy,after=age-5.8;
    for(let i=0;i<count;i++){const seed=hash(i+33),angle=i*2.39996+s.time*(.24+seed*.46),radius=(2+seed*6+s.fracture*.5)*(1-s.collapse*s.collapse),out=after>=0?after*(3+seed*9):0;
      d.position.set(Math.cos(angle)*(radius+out),Math.sin(angle)*(radius+out)-(after>=0?after*after*.9:0),Math.sin(s.time*.7+i)*(.3+seed*1.6)*(1-s.collapse));d.quaternion.copy(this.inverse).multiply(context.camera.quaternion);const size=(.025+seed*.075)*ease((age-.25)/.6)*s.fade;d.scale.set(size,size*(i%5===0?2.8:1),size);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
    }mesh.instanceMatrix.needsUpdate=true;
  }
}
