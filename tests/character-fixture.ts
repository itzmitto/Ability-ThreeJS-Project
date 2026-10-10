import { readFileSync } from 'node:fs';
import { AnimationClip, Box3, Group, Mesh, MeshStandardMaterial, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CharacterRig } from '../src/player/CharacterRig';
import { CharacterAnimationController } from '../src/player/CharacterAnimationController';
import { CharacterMaterials } from '../src/player/CharacterMaterials';
import { CharacterGeometry } from '../src/player/CharacterGeometry';
import { CharacterMotion } from '../src/player/CharacterMotion';
import { CharacterFootIK } from '../src/player/CharacterFootIK';
/** Load the actual GLB skeleton/geometry/clips in Node; omit images, which require browser decoding. */
export async function characterFixture() {
  const original=readFileSync('public/models/casual-male.glb'),jsonLength=original.readUInt32LE(12);
  const json=JSON.parse(original.subarray(20,20+jsonLength).toString());
  json.images=[];json.textures=[];json.materials=json.materials.map((m:{name:string})=>({name:m.name,pbrMetallicRoughness:{roughnessFactor:.85,metallicFactor:0}}));
  const encoded=Buffer.from(JSON.stringify(json)),padded=Math.ceil(encoded.length/4)*4,bin=original.subarray(20+jsonLength),buffer=Buffer.alloc(20+padded+bin.length,32);
  original.copy(buffer,0,0,12);buffer.writeUInt32LE(buffer.length,8);buffer.writeUInt32LE(padded,12);buffer.writeUInt32LE(0x4e4f534a,16);encoded.copy(buffer,20);bin.copy(buffer,20+padded);
  const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
  const model=gltf.scene,root=new Group();model.rotation.y=Math.PI;model.updateMatrixWorld(true);const box=new Box3().setFromObject(model);model.scale.multiplyScalar(1.82/box.getSize(new Vector3()).y);model.updateMatrixWorld(true);box.setFromObject(model);const center=box.getCenter(new Vector3());model.position.set(-center.x,-box.min.y+.025,-center.z);root.add(model);root.updateMatrixWorld(true);
  const materials=new CharacterMaterials();model.traverse(o=>{if(o instanceof Mesh&&o.material instanceof MeshStandardMaterial)materials.enhance(o.material,o.material.name.includes('head')?'skin':'fabric');});
  const clothing=new CharacterGeometry(model,materials),rig=new CharacterRig(model),animation=new CharacterAnimationController(model,gltf.animations as AnimationClip[],rig),motion=new CharacterMotion(rig,root),feet=new CharacterFootIK(rig);
  const tick=(speed:number,delta=1/60,sprint=false)=>{rig.restore();animation.update(delta,speed,sprint);rig.capture();root.updateWorldMatrix(true,true);motion.update(delta,speed,sprint);};
  const dispose=()=>{animation.dispose();clothing.dispose();materials.dispose();const skeletons=new Set();model.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();if(o instanceof SkinnedMesh&&!skeletons.has(o.skeleton)){skeletons.add(o.skeleton);o.skeleton.dispose();}}});root.clear();};
  return {root,model,rig,animation,motion,feet,clothing,materials,tick,dispose,clips:gltf.animations};
}
