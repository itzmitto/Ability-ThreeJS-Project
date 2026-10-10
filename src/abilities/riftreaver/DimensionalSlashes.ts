import { Group, Mesh, Quaternion, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { RiftResources } from './RiftGeometry';
import type { RiftConfig, RiftQuality } from './RiftreaverConfig';
import { createRiftEdgeMaterial, createRiftEnergyMaterial } from './RiftMaterials';
import type { RiftImpact } from './RiftImpact';
const Z=new Vector3(0,0,1);
/** Three solid sharp slashes; trajectory, banking and hit timing remain distinct. */
export class DimensionalSlashes {
  readonly root=new Group();readonly rock;readonly energy=createRiftEnergyMaterial();
  readonly blades:Group[]=[];readonly hit=[false,false,false];
  private readonly local=new Vector3();private readonly point=new Vector3();private readonly direction=new Vector3();private readonly tilt=new Quaternion();
  constructor(resources:RiftResources,c:RiftConfig){
    this.rock=createRiftEdgeMaterial(c);
    for(let i=0;i<3;i++){const g=new Group(),body=new Mesh(resources.slash,this.rock.material),core=new Mesh(resources.slash,this.energy);
      core.scale.set(.055,.99,1.03);core.position.z=.025;core.renderOrder=3;g.add(body,core);g.visible=false;this.root.add(g);this.blades.push(g);}
  }
  reset():void{this.hit.fill(false);this.blades.forEach(g=>g.visible=false);}
  update(t:number,frame:Group,ctx:AbilityCastContext,impact:RiftImpact,c:RiftConfig,owner:object,q:RiftQuality):void{
    this.root.position.copy(frame.position);this.root.quaternion.copy(frame.quaternion);
    for(let i=0;i<3;i++){
      const age=t-(1.5+i*c.slashInterval),g=this.blades[i];
      const approach=Math.hypot(ctx.origin.x-frame.position.x,ctx.origin.z-frame.position.z);
      const duration=Math.min(.68+(i===2?.08:0),Math.max(4,approach*.44)/c.slashSpeed);
      g.visible=age>=0&&age<duration;
      const angle=[-.56,.58,.03][i];
      this.local.set(Math.sin(angle),-.18,Math.cos(angle)).normalize();
      if(g.visible){g.position.copy(this.local).multiplyScalar(age*c.slashSpeed);g.position.y+=2.8;
        g.quaternion.setFromUnitVectors(Z,this.local);this.tilt.setFromAxisAngle(Z,[-.72,.68,-.18][i]);g.quaternion.multiply(this.tilt);
        const fade=Math.min(1,age/.05)*Math.max(.04,1-Math.max(0,age-duration+.13)/.13);
        g.scale.set(c.slashWidth*(i===2?1.4:1)*fade,c.slashLength*(i===2?1.15:1),1.3);
      }
      if(age>=duration&&!this.hit[i]){this.hit[i]=true;this.point.copy(this.local).multiplyScalar(duration*c.slashSpeed);this.point.y=0;this.point.applyQuaternion(frame.quaternion).add(frame.position);
        this.point.y=ctx.water?.getSurfaceHeight(this.point.x,this.point.z)??frame.position.y;
        this.direction.copy(this.local).applyQuaternion(frame.quaternion);impact.slash(ctx,this.point,this.direction,i,c,owner);ctx.cameraFeedback?.(i===2?.016:.006,.1);
      }
    }
    this.rock.uniforms.uDetail.value=q.detail;this.rock.uniforms.uRiftTime.value=t;this.rock.uniforms.uEnergy.value=c.edgeGlow*.65;this.energy.uniforms.uTime.value=t;this.energy.uniforms.uGlow.value=.85;
  }
  dispose():void{this.rock.material.dispose();this.energy.dispose();this.root.clear();}
}
