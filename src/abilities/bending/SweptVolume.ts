import { BufferGeometry, DynamicDrawUsage, Float32BufferAttribute, Vector3 } from 'three';
/** Closed elliptical sweep with persistent topology/buffers. Analytic radial normals and bounded central differences. */
export class SweptVolume {
  readonly geometry = new BufferGeometry();
  private readonly points: Float32Array;
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;
  private readonly tangent=new Vector3(); private readonly right=new Vector3(); private readonly up=new Vector3();
  private readonly a=new Vector3(); private readonly b=new Vector3(); private readonly p=new Vector3();
  constructor(readonly segments=64,readonly sides=10) {
    this.points=new Float32Array((segments+1)*3);
    this.positions=new Float32Array(((segments+1)*sides+2)*3);this.normals=new Float32Array(this.positions.length);
    const indices:number[]=[],uv:number[]=[];
    for(let i=0;i<=segments;i++)for(let j=0;j<sides;j++){uv.push(i/segments,j/sides);if(i<segments){const k=i*sides+j,n=i*sides+(j+1)%sides;indices.push(k,k+sides,n,n,k+sides,n+sides);}}
    const cap=(segments+1)*sides;uv.push(0,.5,1,.5);
    for(let j=0;j<sides;j++){indices.push(cap,j,(j+1)%sides);indices.push(cap+1,segments*sides+(j+1)%sides,segments*sides+j);}
    this.geometry.setAttribute('position',new Float32BufferAttribute(this.positions,3).setUsage(DynamicDrawUsage));
    this.geometry.setAttribute('normal',new Float32BufferAttribute(this.normals,3).setUsage(DynamicDrawUsage));
    this.geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));this.geometry.setIndex(indices);
  }
  update(path:(t:number,out:Vector3)=>void,radius:(t:number)=>number,ellipse=.7):void {
    for(let i=0;i<=this.segments;i++){path(i/this.segments,this.p);this.p.toArray(this.points,i*3);}
    for(let i=0;i<=this.segments;i++){
      const t=i/this.segments;this.p.fromArray(this.points,i*3);
      this.a.fromArray(this.points,Math.max(0,i-1)*3);this.b.fromArray(this.points,Math.min(this.segments,i+1)*3);
      this.tangent.subVectors(this.b,this.a);if(this.tangent.lengthSq()<1e-9)this.tangent.set(0,0,-1);this.tangent.normalize();
      this.up.set(0,1,0);if(Math.abs(this.tangent.y)>.96)this.up.set(1,0,0);
      this.right.crossVectors(this.tangent,this.up).normalize();this.up.crossVectors(this.right,this.tangent).normalize();
      const r=Math.max(.008,radius(t));
      for(let j=0;j<this.sides;j++){
        const angle=j/this.sides*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),k=(i*this.sides+j)*3;
        this.a.copy(this.p).addScaledVector(this.right,c*r).addScaledVector(this.up,s*r*ellipse).toArray(this.positions,k);
        this.a.copy(this.right).multiplyScalar(c).addScaledVector(this.up,s/ellipse).normalize().toArray(this.normals,k);
      }
    }
    const cap=(this.segments+1)*this.sides*3;
    this.a.fromArray(this.points,0).toArray(this.positions,cap);this.a.fromArray(this.points,this.segments*3).toArray(this.positions,cap+3);
    this.b.fromArray(this.points,0).sub(this.a.fromArray(this.points,3)).normalize().toArray(this.normals,cap);
    this.tangent.toArray(this.normals,cap+3);
    (this.geometry.getAttribute('position').array as Float32Array).set(this.positions);
    (this.geometry.getAttribute('normal').array as Float32Array).set(this.normals);
    this.geometry.getAttribute('position').needsUpdate=true;this.geometry.getAttribute('normal').needsUpdate=true;
    this.geometry.computeBoundingBox();this.geometry.computeBoundingSphere();
  }
  dispose():void{this.geometry.dispose();}
}
