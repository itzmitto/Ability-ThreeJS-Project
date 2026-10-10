import { BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, Raycaster, SkinnedMesh, Triangle, Uint16BufferAttribute, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { CharacterMaterials } from './CharacterMaterials';
/** Fit selected garment faces over the source; copy exact skin indices/weights, never alter anatomy. */
export function createGarmentPatch(source:SkinnedMesh,include:(p:Vector3,index:number)=>boolean,offset:number):BufferGeometry {
  const g=source.geometry,pos=g.getAttribute('position'),normal=g.getAttribute('normal'),skin=g.getAttribute('skinIndex'),weight=g.getAttribute('skinWeight');
  const p=new Vector3(),vertices:number[]=[],normals:number[]=[],indices:number[]=[],weights:number[]=[];
  const count=g.index?.count??pos.count;
  for(let i=0;i<count;i+=3){const face=[0,1,2].map(k=>g.index?.getX(i+k)??i+k);
    if(!face.every(v=>include(p.fromBufferAttribute(pos,v),v)))continue;
    for(const v of face){vertices.push(pos.getX(v)+normal.getX(v)*offset,pos.getY(v)+normal.getY(v)*offset,pos.getZ(v)+normal.getZ(v)*offset);normals.push(normal.getX(v),normal.getY(v),normal.getZ(v));
      indices.push(skin.getX(v),skin.getY(v),skin.getZ(v),skin.getW(v));weights.push(weight.getX(v),weight.getY(v),weight.getZ(v),weight.getW(v));}
  }
  const out=new BufferGeometry();out.setAttribute('position',new Float32BufferAttribute(vertices,3));out.setAttribute('normal',new Float32BufferAttribute(normals,3));out.setAttribute('skinIndex',new Uint16BufferAttribute(indices,4));out.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));out.computeBoundingBox();out.computeBoundingSphere();return out;
}
/** Trace two narrow raised seam strips over the real bind-pose chest; interpolate the skin weights. */
export function createTorsoSeams(source:SkinnedMesh):BufferGeometry {
  const material=new MeshBasicMaterial({side:DoubleSide}),surface=new Mesh(source.geometry,material),ray=new Raycaster();
  const g=source.geometry,p=g.getAttribute('position'),skin=g.getAttribute('skinIndex'),weights=g.getAttribute('skinWeight');
  const positions:number[]=[],joints:number[]=[],influence:number[]=[],a=new Vector3(),b=new Vector3(),c=new Vector3(),bary=new Vector3(),samples:{p:Vector3;indices:number[];weights:number[]}[]=[];
  for(const sign of [-1,1]){
    samples.length=0;
    for(let row=0;row<=12;row++)for(const edge of [-1,1]){
      const x=sign*.115+edge*.006,y=1.05+row*.029;ray.set(a.set(x,y,1),b.set(0,0,-1));const hit=ray.intersectObject(surface,false)[0];if(!hit?.face)continue;
      const face=hit.face;Triangle.getBarycoord(hit.point,a.fromBufferAttribute(p,face.a),b.fromBufferAttribute(p,face.b),c.fromBufferAttribute(p,face.c),bary);
      const combined=new Map<number,number>();for(let v=0;v<3;v++)for(let k=0;k<4;k++){const index=[face.a,face.b,face.c][v],joint=skin.getComponent(index,k);combined.set(joint,(combined.get(joint)??0)+weights.getComponent(index,k)*bary.getComponent(v));}
      const sorted=[...combined].sort((u,v)=>v[1]-u[1]).slice(0,4);while(sorted.length<4)sorted.push([0,0]);const total=sorted.reduce((sum,pair)=>sum+pair[1],0);
      samples.push({p:hit.point.clone().add(new Vector3(0,0,.016)),indices:sorted.map(pair=>pair[0]),weights:sorted.map(pair=>pair[1]/total)});
    }
    if(samples.length!==26)continue;
    for(let row=0;row<12;row++)for(const k of [row*2,row*2+1,row*2+2,row*2+1,row*2+3,row*2+2]){const sample=samples[k];positions.push(...sample.p.toArray());joints.push(...sample.indices);influence.push(...sample.weights);}
  }
  material.dispose();const out=new BufferGeometry();out.setAttribute('position',new Float32BufferAttribute(positions,3));out.computeVertexNormals();out.setAttribute('skinIndex',new Uint16BufferAttribute(joints,4));out.setAttribute('skinWeight',new Float32BufferAttribute(influence,4));out.computeBoundingBox();out.computeBoundingSphere();return out;
}
export class CharacterGeometry {
  readonly accessories:Mesh[]=[];
  constructor(model:Object3D,materials:CharacterMaterials) {
    let source:SkinnedMesh|undefined;model.traverse(o=>{if(o instanceof SkinnedMesh&&(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name.includes('body')))source=o;});
    if(!source)return;
    const body=source;
    const patch=(name:string,include:(p:Vector3,index:number)=>boolean,offset:number,surface:'fabric'|'leather',color:string)=>{
      const geometry=createGarmentPatch(body,include,offset);if(!geometry.getAttribute('position').count){geometry.dispose();return;}
      const mesh=new SkinnedMesh(geometry,materials.create(surface,color));mesh.name=name;
      mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);
      body.parent!.add(mesh);mesh.bind(body.skeleton,body.bindMatrix);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;this.accessories.push(mesh);
    };
    patch('Adventurer · fitted leather jerkin',p=>p.y>.98&&p.y<1.46&&Math.abs(p.x)<.25,.010,'leather','#3c3025');
    patch('Adventurer · leather boots',p=>p.y<.43,.006,'leather','#2b211b');
    // Existing forearm skin weights provide a reliable limb mask in the source A-pose.
    const ids=body.skeleton.bones.map(b=>b.name);const forearms=ids.map((n,i)=>/Forearm/.test(n)?i:-1).filter(i=>i>=0);
    const skin=body.geometry.getAttribute('skinIndex'),weights=body.geometry.getAttribute('skinWeight');
    patch('Adventurer · forearm wraps',(p,v)=>Math.abs(p.x)>.42&&Math.abs(p.x)<.56&&[0,1,2,3].some(k=>forearms.includes(skin.getComponent(v,k))&&weights.getComponent(v,k)>.4),.007,'leather','#44372b');
    patch('Adventurer · belt',p=>p.y>.955&&p.y<1.015&&Math.abs(p.x)<.22,.018,'leather','#211b16');
    const seams=createTorsoSeams(body);if(seams.getAttribute('position').count){const mesh=new SkinnedMesh(seams,materials.create('fabric','#665743'));mesh.name='Adventurer · raised stitched seams';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);body.parent!.add(mesh);mesh.bind(body.skeleton,body.bindMatrix);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;this.accessories.push(mesh);}else seams.dispose();
    // Small real-volume fasteners share a single skinned mesh. Bind-pose vertices inherit nearest body weights.
    const parts:BufferGeometry[]=[];
    for(const y of [1.13,1.23,1.33])parts.push(new BoxGeometry(.04,.011,.012).translate(0,y,.151));
    parts.push(new BoxGeometry(.06,.008,.018).translate(0,.989,.162),new BoxGeometry(.06,.008,.018).translate(0,1.024,.162),new BoxGeometry(.008,.035,.018).translate(-.026,1.006,.162),new BoxGeometry(.008,.035,.018).translate(.026,1.006,.162));
    const positions:number[]=[],normals:number[]=[],joint:number[]=[],jointWeights:number[]=[],point=new Vector3(),p=new Vector3(),base=body.geometry.getAttribute('position'),n=body.geometry.getAttribute('normal');
    for(const part of parts){const g=part.toNonIndexed(),a=g.getAttribute('position'),normal=g.getAttribute('normal');part.computeBoundingBox();part.boundingBox!.getCenter(point);
      let nearest=0,distance=Infinity;for(let k=0;k<base.count;k++){const d=p.fromBufferAttribute(base,k).distanceToSquared(point);if(d<distance){nearest=k;distance=d;}}
      const frontOffset=base.getZ(nearest)+Math.max(0,n.getZ(nearest))*.025-point.z;
      for(let v=0;v<a.count;v++){point.fromBufferAttribute(a,v);
        // Translate each complete solid to the chest/waist; never flatten its thickness.
        positions.push(point.x,point.y,point.z+frontOffset);normals.push(normal.getX(v),normal.getY(v),normal.getZ(v));
        for(let k=0;k<4;k++){joint.push(skin.getComponent(nearest,k));jointWeights.push(weights.getComponent(nearest,k));}}
      g.dispose();part.dispose();}
    const fasteners=new BufferGeometry();fasteners.setAttribute('position',new Float32BufferAttribute(positions,3));fasteners.setAttribute('normal',new Float32BufferAttribute(normals,3));fasteners.setAttribute('skinIndex',new Uint16BufferAttribute(joint,4));fasteners.setAttribute('skinWeight',new Float32BufferAttribute(jointWeights,4));fasteners.computeBoundingBox();fasteners.computeBoundingSphere();
    const mesh=new SkinnedMesh(fasteners,materials.create('metal','#756447'));mesh.name='Adventurer · bronze clasps';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);body.parent!.add(mesh);mesh.bind(body.skeleton,body.bindMatrix);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;this.accessories.push(mesh);
  }
  dispose():void {for(const mesh of this.accessories){mesh.geometry.dispose();mesh.removeFromParent();}this.accessories.length=0;}
}
