import {BufferGeometry,Float32BufferAttribute,InstancedBufferAttribute,DynamicDrawUsage} from 'three';
function finish(p:number[],uv:number[],idx:number[],capacity:number):BufferGeometry{
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.setAttribute('aTemporal',new InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(DynamicDrawUsage));return g;
}
/** A closed bevelled ring arc, centered on its own fracture pivot rather than the entire clock. */
export function clockRingSegment(capacity:number,subdivisions=6):BufferGeometry{
  const p:number[]=[],uv:number[]=[],idx:number[]=[],span=Math.PI*2/32*.83;
  for(let i=0;i<=subdivisions;i++){const a=(i/subdivisions-.5)*span;
    for(let j=0;j<8;j++){const b=j*Math.PI/4,r=1+Math.cos(b)*.021,z=Math.sin(b)*.018;p.push(Math.cos(a)*r-1,Math.sin(a)*r,z);uv.push(i/subdivisions,j/8);}}
  for(let i=0;i<subdivisions;i++)for(let j=0;j<8;j++){const a=i*8+j,b=i*8+(j+1)%8;idx.push(a,b,a+8,b,b+8,a+8);}
  for(let j=1;j<7;j++){idx.push(0,j+1,j);const o=subdivisions*8;idx.push(o,o+j,o+j+1);}
  for(let i=0;i<idx.length;i+=3){const swap=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=swap;}return finish(p,uv,idx,capacity);
}
export function clockPlate(capacity:number):BufferGeometry{
  const p=[-.14,-.36,-.07,.14,-.36,-.07,.14,.36,-.07,-.14,.36,-.07,-.1,-.32,.07,.1,-.32,.07,.1,.32,.07,-.1,.32,.07],uv=[0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],idx=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];return finish(p,uv,idx,capacity);
}
export const HAND_CENTERS=[.45,1.9,3.65];
/** Three interlocking solid pieces compose each clock hand and can physically detach later. */
export function clockHandPiece(piece:number,capacity:number):BufferGeometry{
  const ends=[[-.5,1.42,.18],[1.4,3.2,.13],[3.18,4.62,.19]][piece],center=HAND_CENTERS[piece],p=[0,ends[1]-center,0,-ends[2],-.01,0,0,-.01,.075,ends[2],-.01,0,0,-.01,-.075,0,ends[0]-center,0],uv=[.5,1,0,.5,.5,.5,1,.5,.5,.5,.5,0],idx=[0,1,2,0,2,3,0,3,4,0,4,1,5,2,1,5,3,2,5,4,3,5,1,4];return finish(p,uv,idx,capacity);
}
