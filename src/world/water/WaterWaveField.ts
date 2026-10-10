import type { OceanSettings } from './OceanSettings';
/** Shared spectrum keeps CPU impact sampling and the rendered GPU ocean consistent. */
export const WATER_SPECTRUM = [[.91,.41,36,.115,1,0],[-.38,.92,22.3,.065,.81,0],[.72,-.69,9.7,.034,1,1],[.3,.954,5.3,.021,.92,1],[-.84,.54,3.1,.012,1.12,1]] as const;
export function sampleOceanHeight(x:number,z:number,time:number,playerX:number,playerZ:number,c:Readonly<OceanSettings>,waves:number,ripples:Float32Array,shape:Float32Array,capacity:number):number {
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
    height+=Math.max(-.4,Math.min(.4,ripples[k+3]))*c.rippleStrength*.18*Math.sin(v*6.283/Math.max(.15,shape[k+1]))*Math.exp(-v*v/(width*width))*Math.pow(Math.max(0,1-age/duration),2*c.rippleDecay)*Math.exp(-r*.075);
  }
  return height;
}
/** One coherent Gerstner spectrum, with analytic derivatives and bounded impulse wavelets. */
export const WATER_WAVES = `
uniform float uTime,uDetail,uAmplitude,uWavelength,uSteepness,uDirection,uSwellSpeed,uMediumSpeed,uWaveCount;
uniform float uRippleStrength,uRippleSpeed,uRippleDecay;uniform int uRippleCapacity;
uniform vec3 uPlayer;uniform vec4 uRipples[32],uRippleShape[32];
vec3 rippleSurface(vec2 p){vec3 result=vec3(0.);
 for(int i=0;i<32;i++){
  if(i>=uRippleCapacity)break;if(abs(uRipples[i].w)<.00001)continue;
  float age=uTime-uRipples[i].z;vec4 s=uRippleShape[i];if(age<0.||age>=s.z)continue;
  vec2 offset=p-uRipples[i].xy;float r=length(offset);float front=s.x*uRippleSpeed*age+s.w;
  float width=max(s.y*1.8,.18),x=r-front,k=6.283/max(.15,s.y);
  float pulse=exp(-x*x/(width*width));
  float damping=pow(max(0.,1.-age/s.z),2.*uRippleDecay)*exp(-r*.075);
  float a=clamp(uRipples[i].w,-.4,.4)*uRippleStrength*.18;
  float h=a*sin(x*k)*pulse*damping;
  float slope=a*pulse*damping*(cos(x*k)*k-sin(x*k)*(2.*x/(width*width)+.075));
  result+=vec3(h,offset/max(r,.03)*slope);
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
