import { BufferGeometry, DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute } from 'three';
/** Closed double-pointed spear/diamond/dagger/lance/jagged gems, with independent triangle normals. */
export function prismBoltGeometry(variant:number,capacity:number):BufferGeometry {
  const sides=[6,4,4,8,5][variant],length=[7.2,6,6.8,8.4,7.5][variant],width=[.3,.38,.36,.27,.4][variant];
  const levels=variant===1?[-.24,.02]:variant===4?[-.3,-.08,.14]:[-.3,-.12,.16];
  const radii=variant===1?[.66,1]:variant===4?[.52,1,.68]:[.43,.91,.76];
  const indexed:number[]=[],uv:number[]=[],faces:number[]=[];
  const flat=variant===2?.26:variant===1?.7:.86;
  for(let row=0;row<levels.length;row++)for(let j=0;j<sides;j++){
    const a=j/sides*Math.PI*2+(variant===2?Math.PI*.25:0),irregular=variant===4?1+.2*Math.sin(j*3.1+row):1;
    indexed.push(Math.cos(a)*width*radii[row]*irregular,levels[row]*length,Math.sin(a)*width*radii[row]*flat*irregular);uv.push(j/sides,(levels[row]+.5));
  }
  const rear=indexed.length/3;indexed.push(-width*.12,-length*.5,0);uv.push(.5,0);
  const tip=indexed.length/3;indexed.push(variant===1?width*.22:variant===4?width*.26:0,length*.5,variant===4?width*.09:0);uv.push(.5,1);
  for(let j=0;j<sides;j++){
    const next=(j+1)%sides;faces.push(rear,j,next);
    for(let row=0;row<levels.length-1;row++){const a=row*sides+j,b=row*sides+next;faces.push(a,a+sides,b,b,a+sides,b+sides);}
    const end=(levels.length-1)*sides;faces.push(end+j,tip,end+next);
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(indexed,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(faces);
  const faceted=g.toNonIndexed();g.dispose();faceted.computeVertexNormals();
  faceted.setAttribute('aBolt',new InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(DynamicDrawUsage));return faceted;
}
