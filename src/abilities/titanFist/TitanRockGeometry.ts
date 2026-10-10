import { BufferGeometry,Float32BufferAttribute,Vector3 } from 'three';
import { seed } from '../bending/BendingSupport';
/** Closed beveled cuboid rock with perturbed corner planes; triangle soup preserves hard basalt facets. */
export function createTitanRock(variant:number):BufferGeometry{
  const points:Vector3[]=[],values:number[]=[];
  for(let ring=0;ring<3;ring++)for(let j=0;j<8;j++){
    const a=Math.PI*2*j/8+Math.PI/8,bevel=ring===1?1:.74;
    const r=.58*bevel*(1+(seed(variant*91+ring*13+j)-.5)*.12);
    points.push(new Vector3(Math.cos(a)*r,(ring-1)*.5+(seed(j*17+variant)-.5)*.045,Math.sin(a)*r));
  }
  const tri=(a:Vector3,b:Vector3,c:Vector3)=>{const normal=new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a)),out=new Vector3().copy(a).add(b).add(c).multiplyScalar(1/3);const vertices=normal.dot(out)>=0?[a,b,c]:[a,c,b];for(const p of vertices)values.push(p.x,p.y,p.z);};
  for(let ring=0;ring<2;ring++)for(let j=0;j<8;j++){const a=points[ring*8+j],b=points[ring*8+(j+1)%8],c=points[(ring+1)*8+j],d=points[(ring+1)*8+(j+1)%8];tri(a,b,c);tri(b,d,c);}
  // Cap fan uses actual ring center; bounded planar faces and no collapsed tip triangles.
  const lower=new Vector3(0,-.5,0),upper=new Vector3(0,.5,0);
  for(let j=0;j<8;j++){tri(lower,points[j],points[(j+1)%8]);tri(upper,points[16+j],points[16+(j+1)%8]);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(values,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
