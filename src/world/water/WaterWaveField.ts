/** Shared displacement/gradient equations: stable world coordinates, directional spectrum, shallow waves. */
export const WATER_WAVES = `
uniform float uTime;uniform float uDetail;uniform vec3 uPlayer;
uniform vec4 uRipples[32];uniform vec4 uRippleShape[32];
float wave(vec2 p,vec2 d,float k,float speed,float a){return sin(dot(p,d)*k+uTime*speed)*a;}
float broadHeight(vec2 p){
 float h=wave(p,vec2(.91,.41),.21,.42,.023)+wave(p,vec2(-.38,.92),.35,-.55,.014)+wave(p,vec2(.72,-.69),.63,.77,.008);
 return h*smoothstep(.25,2.2,length(p-uPlayer.xz));
}
vec2 spectrum(vec2 p,float footprint){
 vec2 g=vec2(0.0);
 g+=vec2(.91,.41)*cos(dot(p,vec2(.91,.41))*.21+uTime*.42+sin(p.y*.13)*.5)*.045;
 g+=vec2(-.38,.92)*cos(dot(p,vec2(-.38,.92))*.35-uTime*.55+sin(p.x*.17)*.4)*.036;
 g+=vec2(.72,-.69)*cos(dot(p,vec2(.72,-.69))*1.7+uTime*.91+sin(p.x*.37+p.y*.43+uTime*.17)*1.6)*.075;
 g+=vec2(.3,.954)*cos(dot(p,vec2(.3,.954))*2.83-uTime*1.22+sin(p.x*.21-p.y*.32-uTime*.13)*1.9)*.038;
 if(uDetail>1.5){
  g+=vec2(-.84,.54)*cos(dot(p,vec2(-.84,.54))*5.43+uTime*1.57)*.04/(1.0+footprint*5.43);
  g+=vec2(.66,.75)*cos(dot(p,vec2(.66,.75))*8.1-uTime*2.03+sin(p.x*.31)*.8)*.024/(1.0+footprint*8.1);
 }
 if(uDetail>2.5){
  g+=vec2(.91,-.42)*cos(dot(p,vec2(.91,-.42))*17.3+uTime*2.47)*.018/(1.0+footprint*17.3);
  g+=vec2(-.2,-.98)*cos(dot(p,vec2(-.2,-.98))*24.7-uTime*3.21)*.009/(1.0+footprint*24.7);
 }
 return g;
}
vec2 rippleGradient(vec2 p){vec2 g=vec2(0.0);
 for(int i=0;i<32;i++){
  if(abs(uRipples[i].w)<.00001)continue;
  float age=uTime-uRipples[i].z;vec4 s=uRippleShape[i];
  vec2 offset=p-uRipples[i].xy;float r=length(offset),front=s.x*age+s.w;
  float width=max(s.y*1.8,.16);float x=r-front;
  float pulse=exp(-x*x/(width*width));
  float damping=pow(max(0.0,1.0-age/s.z),2.0)*exp(-r*.09);
  g+=offset/max(r,.02)*cos(x*6.283/max(.1,s.y))*pulse*damping*uRipples[i].w;
 }return g;}
`;
