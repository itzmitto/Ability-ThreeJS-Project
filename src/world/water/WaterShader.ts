import { WATER_WAVES } from "./WaterWaveField";
export const WATER_VERTEX = `${WATER_WAVES}
uniform mat4 uReflectionMatrix;varying vec3 vWorld;varying vec4 vReflection;
void main(){vec4 world=modelMatrix*vec4(position,1.0);world.y+=broadHeight(world.xz);vWorld=world.xyz;vReflection=uReflectionMatrix*vec4(world.x,0.0,world.z,1.0);gl_Position=projectionMatrix*viewMatrix*world;}`;
export const WATER_FRAGMENT = `${WATER_WAVES}
uniform sampler2D uReflection;uniform float uReflect;uniform float uReflectionSize;uniform float uFogDensity;
uniform vec4 uLightPosition[12];uniform vec4 uLightColor[12];uniform int uLightCount;
varying vec3 vWorld;varying vec4 vReflection;
float fresnel(float ndv){return .02+.98*pow(1.0-clamp(ndv,0.0,1.0),5.0);}
float specular(vec3 n,vec3 v,vec3 l,float rough){
 vec3 h=normalize(v+l);float nv=max(.02,dot(n,v)),nl=max(0.0,dot(n,l)),nh=max(0.0,dot(n,h)),vh=max(0.0,dot(v,h));
 float a=rough*rough,a2=a*a;float d=a2/(3.14159*pow(nh*nh*(a2-1.0)+1.0,2.0));float k=pow(rough+1.0,2.0)*.125;
 float g=nv/(nv*(1.0-k)+k)*nl/(nl*(1.0-k)+k);return min(8.0,d*g*fresnel(vh)/max(.03,4.0*nv));
}
void main(){vec2 p=vWorld.xz;vec3 v=normalize(cameraPosition-vWorld);
 float distanceToCamera=length(cameraPosition-vWorld),footprint=length(fwidth(p));
 vec2 grad=spectrum(p,footprint)+rippleGradient(p);grad*=mix(1.6,.3,smoothstep(80.0,700.0,distanceToCamera));
 vec3 n=normalize(vec3(-grad.x,1.0,-grad.y));float nv=max(.0,dot(n,v));float f=fresnel(nv);
 float rough=.25+.045*sin(p.x*.19+p.y*.13-uTime*.12)+smoothstep(80.0,600.0,distanceToCamera)*.14;
 vec3 r=reflect(-v,n);float haze=pow(max(0.0,r.y),.6);
 vec3 env=vec3(.005,.012,.025)+vec3(.011,.024,.043)*haze;
 vec3 moon=normalize(vec3(-.3,.7,-.9));vec3 col=vec3(.002,.004,.008)*(1.0-f)+env*(.18+f);
 col+=vec3(.18,.29,.43)*specular(n,v,moon,rough);
 if(uReflect>.5&&vReflection.w>0.0){vec2 uv=vReflection.xy/vReflection.w;vec2 distortion=grad*.018*min(1.0,35.0/max(1.0,distanceToCamera));uv+=distortion;
  if(all(greaterThan(uv,vec2(.002)))&&all(lessThan(uv,vec2(.998)))){
   vec2 blur=vec2(1.4+rough*3.0)/max(1.0,uReflectionSize);
   vec3 reflection=texture2D(uReflection,uv).rgb*.4;
   reflection+=(texture2D(uReflection,uv+vec2(blur.x,0)).rgb+texture2D(uReflection,uv-vec2(blur.x,0)).rgb+texture2D(uReflection,uv+vec2(0,blur.y)).rgb+texture2D(uReflection,uv-vec2(0,blur.y)).rgb)*.15;
   col+=reflection*(.04+f*.65)*exp(-distanceToCamera*.0015);
  }
 }
 for(int i=0;i<12;i++){if(i>=uLightCount)break;vec3 offset=uLightPosition[i].xyz-vWorld;float d=length(offset),range=uLightPosition[i].w;float attenuation=pow(max(0.0,1.0-d/range),2.0)/max(1.0,d*d);
  col+=uLightColor[i].rgb*uLightColor[i].w*attenuation*(specular(n,v,normalize(offset),rough)*.28+.004*(1.0-f));
 }
 float contact=1.0-.35*exp(-dot(p-uPlayer.xz,p-uPlayer.xz)*5.0);col*=contact;
 float fog=1.0-exp(-pow(distanceToCamera*uFogDensity,2.0));col=mix(col,vec3(.0012,.0027,.0058),fog);
 gl_FragColor=vec4(col,1.0);
}`;
