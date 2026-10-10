import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2, Vector3 } from 'three';
import { seed } from './DrownedKingConfig';
type Point=readonly[number,number,number];
function solid(vertices:Point[],faces:readonly number[][]):BufferGeometry{
  const positions:number[]=[],uv:number[]=[],center=new Vector3(),a=new Vector3(),b=new Vector3(),c=new Vector3(),cross=new Vector3(),temp=new Vector3();
  vertices.forEach(p=>center.add(new Vector3(...p)));center.multiplyScalar(1/vertices.length);
  const triangle=(i:number,j:number,k:number)=>{a.set(...vertices[i]);b.set(...vertices[j]);c.set(...vertices[k]);cross.subVectors(b,a).cross(temp.subVectors(c,a));
    if(cross.dot(temp.copy(a).add(b).add(c).multiplyScalar(1/3).sub(center))<0)[j,k]=[k,j];
    for(const id of [i,j,k]){positions.push(...vertices[id]);uv.push(vertices[id][0]*.5+.5,vertices[id][1]*.5+.5);}};
  faces.forEach(f=>{
    if(f.length<=4){for(let i=1;i<f.length-1;i++)triangle(f[0],f[i],f[i+1]);return;}
    a.set(...vertices[f[0]]);b.set(...vertices[f[1]]);c.set(...vertices[f[2]]);cross.subVectors(b,a).cross(temp.subVectors(c,a));
    const drop=Math.abs(cross.x)>Math.abs(cross.y)&&Math.abs(cross.x)>Math.abs(cross.z)?0:Math.abs(cross.y)>Math.abs(cross.z)?1:2;
    const contour=f.map(id=>{const v=vertices[id];return drop===0?new Vector2(v[1],v[2]):drop===1?new Vector2(v[0],v[2]):new Vector2(v[0],v[1]);});
    for(const tri of ShapeUtils.triangulateShape(contour,[]))triangle(f[tri[0]],f[tri[1]],f[tri[2]]);
  });
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
/** Closed four-ring beveled polygonal extrusion. Every plate has volume and deliberate hard facets. */
export function armorPlate(profile:readonly(readonly[number,number])[],thickness=.28):BufferGeometry{
  const verts:Point[]=[],faces:number[][]=[],n=profile.length;
  for(const [scale,z] of [[.84,-thickness],[1,-thickness*.55],[1,thickness*.55],[.84,thickness]])for(const [x,y] of profile)verts.push([x*scale,y*scale,z]);
  faces.push(Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>3*n+i));
  for(let layer=0;layer<3;layer++)for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([layer*n+i,layer*n+j,(layer+1)*n+j,(layer+1)*n+i]);}
  return solid(verts,faces);
}
/** Angular ring-based closed shell, with a pronounced front ridge instead of rounded primitive limbs. */
export function armorLoft(rings:readonly(readonly[number,number,number])[]):BufferGeometry{
  const verts:Point[]=[],faces:number[][]=[];const n=10;
  for(const [y,w,d] of rings)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;verts.push([Math.cos(a)*w,y,Math.sin(a)*d*(i===2||i===3?1.12:1)]);}
  faces.push(Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>(rings.length-1)*n+i));
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++)faces.push([r*n+i,r*n+(i+1)%n,(r+1)*n+(i+1)%n,(r+1)*n+i]);
  return solid(verts,faces);
}
export const SHIELD=[[-.75,.8],[0,1],[.75,.8],[1,.25],[.68,-.65],[0,-1],[-.68,-.65],[-1,.25]] as const;
export function armorLibrary():BufferGeometry[]{return [
  armorPlate(SHIELD),
  armorLoft([[-.5,.63,.55],[-.38,.8,.72],[.3,1,.83],[.5,.85,.7]]),
  armorLoft([[-.5,.58,.48],[-.2,.8,.65],[.3,.92,.73],[.5,.68,.59]]),
  armorPlate([[-1,.2],[-.7,.8],[0,1],[.7,.8],[1,.2],[.5,-.7],[0,-1],[-.5,-.7]],.42),
  armorLoft([[-.5,.65,.58],[-.15,1,.85],[.25,.95,.8],[.5,.55,.56]]),
  armorPlate([[-1,-.5],[-.7,.6],[0,1],[.7,.6],[1,-.5],[0,-.75]],.3),
  armorPlate([[-.7,-1],[-.6,.6],[0,1],[.6,.6],[.7,-1],[0,-.8]],.3),
  armorPlate([[-.3,-1],[.3,-1],[.7,.4],[.1,1],[-.5,.5]],.3),
  armorPlate([[-1,-.2],[-.7,.35],[.7,.35],[1,-.2],[.6,-.4],[-.6,-.4]],.25),
];}
/** Diamond cross-sections supply the thick spine and genuinely thin double cutting edges. */
export function createRunebladeGeometry():BufferGeometry{
  const rows=[[-5,.65,.55],[0,.65,.55],[5,.65,.55],[8,2.6,1.05],[16,2.8,1.1],[29,2.55,1.0],[43,2.4,.95],[53,1.8,.7],[60,.06,.04]];
  const verts:Point[]=[],faces:number[][]=[];
  for(const [y,w,d] of rows){verts.push([-w,y,0],[0,y,d],[w,y,0],[0,y,-d]);}
  faces.push([3,2,1,0],[32,33,34,35]);for(let r=0;r<rows.length-1;r++)for(let j=0;j<4;j++)faces.push([r*4+j,r*4+(j+1)%4,(r+1)*4+(j+1)%4,(r+1)*4+j]);return solid(verts,faces);
}
export function createKingFragment(variant:number):BufferGeometry{
  const scale=.6+seed(variant+6)*.3;
  return armorPlate([[-.8,-.7],[-.55,.8],[.4,1],[1,.15],[.45,-.7]],(.12+variant*.07)*scale);
}
