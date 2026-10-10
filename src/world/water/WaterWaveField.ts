import type { OceanSettings } from './OceanSettings';
/** Shared spectrum keeps CPU impact sampling and the rendered GPU ocean consistent. */
export const WATER_SPECTRUM = [[.91,.41,36,.115,1,0],[-.38,.92,22.3,.065,.81,0],[.72,-.69,9.7,.034,1,1],[.3,.954,5.3,.021,.92,1],[-.84,.54,3.1,.012,1.12,1]] as const;
export function sampleOceanHeight(x:number,z:number,time:number,playerX:number,playerZ:number,c:Readonly<OceanSettings>,waves:number,ripples:Float32Array,shape:Float32Array,capacity:number,extent?:Float32Array,splits?:Float32Array,splitShape?:Float32Array):number {
  if(![x,z,time].every(Number.isFinite))return 0;
  let px=x,pz=z,height=0;const angle=c.direction*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle);
  // Invert the small horizontal Gerstner displacement rather than sampling the wrong world XZ.
  for(let iteration=0;iteration<4;iteration++) {
    let dx=0,dz=0; height=0;
    const r=Math.hypot(px-playerX,pz-playerZ),t=Math.max(0,Math.min(1,(r-.35)/2.3)),fade=t*t*(3-2*t);
    for(let i=0;i<Math.min(5,waves);i++) {
      const w=WATER_SPECTRUM[i],len=Math.hypot(w[0],w[1]),ux=w[0]/len,uz=w[1]/len;
      const vx=co*ux+si*uz,vz=-si*ux+co*uz,k=6.283/(w[2]*c.wavelength),a=w[3]*c.amplitude;
      const phase=k*(px*vx+pz*vz)-Math.sqrt(9.81*k)*time*w[4]*(w[5]?c.mediumSpeed:c.swellSpeed);
      height+=a*Math.sin(phase)*fade;const horizontal=c.steepness*.65*a*Math.cos(phase)*fade;dx+=vx*horizontal;dz+=vz*horizontal;
    }
    if(iteration<3){px=x-dx;pz=z-dz;}
  }
  for(let i=0;i<Math.min(32,capacity);i++) {
    const k=i*4,age=time-ripples[k+2],duration=shape[k+2];if(Math.abs(ripples[k+3])<.00001||age<0||age>=duration)continue;
    const r=Math.hypot(px-ripples[k],pz-ripples[k+1]),v=r-shape[k]*c.rippleSpeed*age-shape[k+3],width=Math.max(shape[k+1]*1.8,.18);
    const gain=extent?.[i*2]||.18,attenuation=extent?.[i*2+1]||.075;
    height+=Math.max(-.4,Math.min(.4,ripples[k+3]))*c.rippleStrength*gain*Math.sin(v*6.283/Math.max(.15,shape[k+1]))*Math.exp(-v*v/(width*width))*Math.pow(Math.max(0,1-age/duration),2*c.rippleDecay)*Math.exp(-r*attenuation);
  }
  if(splits&&splitShape)height+=sampleSplitHeight(px,pz,time,splits,splitShape);
  return Number.isFinite(height)?height:0;
}
export function sampleSplitHeight(x:number,z:number,time:number,data:Float32Array,shape:Float32Array):number{
  let height=0;for(let i=0;i<4;i++){const k=i*4,age=time-shape[k],life=shape[k+1],depth=shape[k+3];if(!depth||age<0||age>=life)continue;
    const dx=data[k+2]-data[k],dz=data[k+3]-data[k+1],lengthSq=dx*dx+dz*dz;if(lengthSq<1)continue;
    const u=Math.max(0,Math.min(1,((x-data[k])*dx+(z-data[k+1])*dz)/lengthSq)),d=Math.hypot(x-data[k]-dx*u,z-data[k+1]-dz*u),w=shape[k+2];
    const t=Math.max(0,Math.min(1,(d-w*.2)/(w*.8))),cut=1-t*t*(3-2*t);
    const ends=Math.min(1,u/.08)*Math.min(1,(1-u)/.08),envelope=Math.sin(age/life*Math.PI);
    height+=depth*envelope*ends*(-cut+.8*Math.exp(-(((d-w*1.1)/(w*.6))**2)));
  }return Number.isFinite(height)?height:0;
}
/** One coherent Gerstner spectrum, with analytic derivatives and bounded impulse wavelets. */
export const WATER_WAVES = `
uniform float uTime,uDetail,uAmplitude,uWavelength,uSteepness,uDirection,uSwellSpeed,uMediumSpeed,uWaveCount;
uniform float uRippleStrength,uRippleSpeed,uRippleDecay;uniform int uRippleCapacity;
uniform vec3 uPlayer;uniform vec4 uRipples[32],uRippleShape[32];uniform vec2 uRippleExtent[32];
uniform vec4 uSplits[4],uSplitShape[4];
vec3 rippleSurface(vec2 p){vec3 result=vec3(0.);
 for(int i=0;i<32;i++){
  if(i>=uRippleCapacity)break;if(abs(uRipples[i].w)<.00001)continue;
  float age=uTime-uRipples[i].z;vec4 s=uRippleShape[i];if(age<0.||age>=s.z)continue;
  vec2 offset=p-uRipples[i].xy;float r=length(offset);float front=s.x*uRippleSpeed*age+s.w;
  float width=max(s.y*1.8,.18),x=r-front,k=6.283/max(.15,s.y);
  float pulse=exp(-x*x/(width*width));
  float spatialDecay=uRippleExtent[i].y>0.?uRippleExtent[i].y:.075;
  float damping=pow(max(0.,1.-age/s.z),2.*uRippleDecay)*exp(-r*spatialDecay);
  float a=clamp(uRipples[i].w,-.4,.4)*uRippleStrength*max(.18,uRippleExtent[i].x);
  float h=a*sin(x*k)*pulse*damping;
  float slope=a*pulse*damping*(cos(x*k)*k-sin(x*k)*(2.*x/(width*width)+spatialDecay));
  result+=vec3(h,offset/max(r,.03)*slope);
 }
 for(int i=0;i<4;i++){
  vec4 s=uSplitShape[i];float age=uTime-s.x;if(s.w<=0.||age<0.||age>=s.y)continue;
  vec2 delta=uSplits[i].zw-uSplits[i].xy;float lengthSq=dot(delta,delta);if(lengthSq<1.)continue;
  float u=clamp(dot(p-uSplits[i].xy,delta)/lengthSq,0.,1.);vec2 offset=p-uSplits[i].xy-delta*u;float d=length(offset),w=s.z;
  float a=clamp((d-w*.2)/(w*.8),0.,1.),cut=1.-a*a*(3.-2.*a);
  float crest=exp(-pow((d-w*1.1)/(w*.6),2.));float envelope=sin(age/s.y*3.14159)*min(1.,u/.08)*min(1.,(1.-u)/.08)*s.w;
  float h=envelope*(-cut+.8*crest);float slope=envelope*(6.*a*(1.-a)/(w*.8)-1.6*crest*(d-w*1.1)/(w*w*.36));
  result+=vec3(h,offset/max(d,.01)*slope);
 }return result;}
void gerstner(vec2 p,vec2 direction,float wavelength,float amplitude,float speed,inout vec3 displacement,inout vec3 tx,inout vec3 tz){
 float angle=radians(uDirection);vec2 d=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*normalize(direction);
 float k=6.283/(wavelength*uWavelength),a=amplitude*uAmplitude;
 float phase=k*dot(p,d)-sqrt(9.81*k)*uTime*speed;
 float si=sin(phase),co=cos(phase),q=uSteepness*.65;
 displacement+=vec3(q*a*d.x*co,a*si,q*a*d.y*co);
 tx+=vec3(-q*a*k*d.x*d.x*si,a*k*d.x*co,-q*a*k*d.x*d.y*si);
 tz+=vec3(-q*a*k*d.x*d.y*si,a*k*d.y*co,-q*a*k*d.y*d.y*si);
}
void oceanSurface(vec2 p,out vec3 displacement,out vec3 n,out float crest,out vec2 rippleSlope){
 vec3 tx=vec3(1,0,0),tz=vec3(0,0,1);displacement=vec3(0);
 ${WATER_SPECTRUM.map((w,i)=>`${i>1?`if(uWaveCount>${i+.5})`:''}gerstner(p,vec2(${w[0]},${w[1]}),${w[2].toFixed(3)},${w[3]},${w[5]?'uMediumSpeed':'uSwellSpeed'}*${w[4].toFixed(3)},displacement,tx,tz);`).join('\n')}
 vec2 off=p-uPlayer.xz;float r=length(off),t=clamp((r-.35)/2.3,0.,1.);float fade=t*t*(3.-2.*t);
 vec2 fadeGradient=off/max(.001,r)*6.*t*(1.-t)/2.3;
 vec3 raw=displacement;tx=vec3(1,0,0)+(tx-vec3(1,0,0))*fade+raw*fadeGradient.x;
 tz=vec3(0,0,1)+(tz-vec3(0,0,1))*fade+raw*fadeGradient.y;displacement*=fade;
 vec3 ripple=rippleSurface(p);displacement.y+=ripple.x;tx.y+=ripple.y;tz.y+=ripple.z;rippleSlope=ripple.yz;
 n=normalize(cross(tz,tx));crest=max(0.,1.-(tx.x*tz.z-tx.z*tz.x));
}
`;
