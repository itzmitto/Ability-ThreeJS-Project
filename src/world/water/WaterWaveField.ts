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
 gerstner(p,vec2(.91,.41),36.,.115,uSwellSpeed,displacement,tx,tz);
 gerstner(p,vec2(-.38,.92),22.3,.065,uSwellSpeed*.81,displacement,tx,tz);
 if(uWaveCount>2.5)gerstner(p,vec2(.72,-.69),9.7,.034,uMediumSpeed,displacement,tx,tz);
 if(uWaveCount>3.5)gerstner(p,vec2(.3,.954),5.3,.021,uMediumSpeed*.92,displacement,tx,tz);
 if(uWaveCount>4.5)gerstner(p,vec2(-.84,.54),3.1,.012,uMediumSpeed*1.12,displacement,tx,tz);
 vec2 off=p-uPlayer.xz;float r=length(off),t=clamp((r-.35)/2.3,0.,1.);float fade=t*t*(3.-2.*t);
 vec2 fadeGradient=off/max(.001,r)*6.*t*(1.-t)/2.3;
 vec3 raw=displacement;tx=vec3(1,0,0)+(tx-vec3(1,0,0))*fade+raw*fadeGradient.x;
 tz=vec3(0,0,1)+(tz-vec3(0,0,1))*fade+raw*fadeGradient.y;displacement*=fade;
 vec3 ripple=rippleSurface(p);displacement.y+=ripple.x;tx.y+=ripple.y;tz.y+=ripple.z;rippleSlope=ripple.yz;
 n=normalize(cross(tz,tx));crest=max(0.,1.-(tx.x*tz.z-tx.z*tz.x));
}
`;
