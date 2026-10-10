import { Camera, InstancedMesh, Mesh, PointLight, Scene, WebGLRenderer } from 'three';
import type { GraphicsSettings } from '../../quality/GraphicsSettings';
import type { RiftConfig } from './RiftreaverConfig';
import type { RiftResources } from './RiftGeometry';
import { createRiftEdgeMaterial, createRiftEnergyMaterial, createRiftVoidMaterial } from './RiftMaterials';
import { RiftParticles } from './RiftParticles';
/** Compile tiny detached prototypes one per idle callback. No attack, render pass or persistent scene object. */
export class RiftWarmup {
  private readonly scene=new Scene();private readonly edge;private readonly energy=createRiftEnergyMaterial();private readonly voidMaterial;
  private readonly particles=new RiftParticles();private readonly instance:InstancedMesh;private readonly light=new PointLight('#9476dc',1,23);
  private readonly queue:(Mesh|typeof this.particles.mesh)[];private handle=0;private disposed=false;
  constructor(resources:RiftResources,c:RiftConfig,renderer:WebGLRenderer,camera:Camera,target:Scene,settings:GraphicsSettings){
    this.edge=createRiftEdgeMaterial(c);this.voidMaterial=createRiftVoidMaterial(c);this.instance=new InstancedMesh(resources.shards[0],this.edge.material,1);
    this.queue=[new Mesh(resources.tiers[0].left,this.edge.material),this.instance,new Mesh(resources.tiers[0].interior,this.voidMaterial),new Mesh(resources.slash,this.energy),this.particles.mesh];
    this.scene.add(this.light);
    const step=()=>{
      this.handle=0;if(this.disposed)return;const object=this.queue.shift();if(!object)return;
      this.light.visible=settings.config.waterDetail>1;this.scene.add(object);
      try{renderer.compile(this.scene,camera,target);}finally{this.scene.remove(object);}
      if(this.queue.length)this.handle=window.requestIdleCallback(step,{timeout:2000});
    };
    // The normal lazy/cached path remains available on browsers without idle scheduling.
    if(typeof window.requestIdleCallback==='function')this.handle=window.requestIdleCallback(step,{timeout:2000});
  }
  dispose():void{if(this.disposed)return;this.disposed=true;if(this.handle)window.cancelIdleCallback(this.handle);this.handle=0;this.queue.length=0;this.scene.clear();this.instance.dispose();this.edge.material.dispose();this.energy.dispose();this.voidMaterial.dispose();this.particles.dispose();this.light.dispose();}
}
