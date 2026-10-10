import { InstancedMesh,Mesh,Points,Scene,ShaderMaterial,type Camera,type Material,type Object3D,type WebGLRenderer } from 'three';
/** Cancellable one-program-per-idle preparation. Detached compilation prototypes never enter the playable scene. */
export class BendingWarmup{
  private callback=0;private disposed=false;private index=0;private readonly prototypes:Object3D[]=[];private readonly scene=new Scene();
  get ready():boolean{return this.disposed||this.index>=this.prototypes.length;}
  constructor(root:Object3D,private readonly renderer:WebGLRenderer,private readonly camera:Camera,private readonly target:Scene){
    if(typeof window==='undefined'||!window.requestIdleCallback)return;
    const keys=new Set<string>();root.traverse(o=>{
      if(!(o instanceof Mesh||o instanceof Points))return;
      const m=o.material as Material;if(Array.isArray(o.material))return;
      const kind=o instanceof InstancedMesh?'instance':o instanceof Points?'points':'mesh';
      const key=kind+(m instanceof ShaderMaterial?m.vertexShader+m.fragmentShader:m.customProgramCacheKey());if(keys.has(key))return;keys.add(key);
      this.prototypes.push(o instanceof InstancedMesh?new InstancedMesh(o.geometry,m,1):o instanceof Points?new Points(o.geometry,m):new Mesh(o.geometry,m));
    });this.schedule();
  }
  private schedule():void{if(this.disposed||this.index>=this.prototypes.length)return;this.callback=window.requestIdleCallback(()=>{this.callback=0;if(this.disposed)return;const p=this.prototypes[this.index++];this.scene.add(p);this.renderer.compile(this.scene,this.camera,this.target);this.scene.remove(p);this.schedule();},{timeout:2000});}
  dispose():void{if(this.disposed)return;this.disposed=true;if(this.callback&&typeof window!=='undefined')window.cancelIdleCallback(this.callback);this.scene.clear();this.prototypes.forEach(o=>{if(o instanceof InstancedMesh)o.dispose();});this.prototypes.length=0;}
}
