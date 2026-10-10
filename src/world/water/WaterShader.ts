import { WATER_WAVES } from './WaterWaveField';
import { frostNoise } from '../../abilities/frostLance/FrostLanceNoise';
export const WATER_VERTEX = `${WATER_WAVES}
uniform mat4 uReflectionMatrix;varying vec3 vWorld,vNormal;varying vec4 vReflection;varying float vCrest;varying vec2 vRippleSlope;
void main(){vec4 world=modelMatrix*vec4(position,1.);vec3 displacement;
 oceanSurface(world.xz,displacement,vNormal,vCrest,vRippleSlope);world.xyz+=displacement;
 vWorld=world.xyz;vReflection=uReflectionMatrix*vec4(world.x,0.,world.z,1.);gl_Position=projectionMatrix*viewMatrix*world;}`;
export const WATER_FRAGMENT = `${WATER_WAVES}
${frostNoise}
uniform sampler2D uReflection;uniform float uReflect,uReflectionSize,uFogDensity,uMicroIntensity,uNormalScale,uRoughness,uReflectionGain,uFresnelGain,uSpecularSharpness,uFoamIntensity,uFoamThreshold;
uniform vec3 uDeepColor,uSurfaceColor,uReflectionTint,uFoamColor;
uniform vec4 uLightPosition[12],uLightColor[12];uniform int uLightCount;
varying vec3 vWorld,vNormal;varying vec4 vReflection;varying float vCrest;varying vec2 vRippleSlope;
float fresnel(float ndv){return clamp((.02+.98*pow(1.-clamp(ndv,0.,1.),5.))*uFresnelGain,0.,1.);}
float specular(vec3 n,vec3 v,vec3 l,float rough){
 vec3 h=normalize(v+l);float nv=max(.02,dot(n,v)),nl=max(0.,dot(n,l)),nh=max(0.,dot(n,h)),vh=max(0.,dot(v,h));
 float a=rough*rough,a2=a*a;float d=a2/(3.14159*pow(nh*nh*(a2-1.)+1.,2.));float k=pow(rough+1.,2.)*.125;
 float g=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);return min(8.,d*g*fresnel(vh)/max(.03,4.*nv));
}
void main(){vec2 p=vWorld.xz;vec3 v=normalize(cameraPosition-vWorld);float distanceToCamera=length(cameraPosition-vWorld),footprint=length(fwidth(p));
 vec2 noiseP=p*uNormalScale*.9+vec2(uTime*.12,-uTime*.09);
 float medium=uDetail<1.5?snoise(vec3(noiseP*.6,uTime*.035)):fbm3(vec3(noiseP*.6,uTime*.035));
 float fine=sin(dot(p,vec2(.3,.954))*11.7-uTime*1.7+medium*2.);
 if(uDetail>2.5)fine+=sin(dot(p,vec2(-.84,.54))*19.3+uTime*2.1+medium)*.4;
 float height=medium*.035/(1.+footprint*2.)+fine*.002/(1.+footprint*19.);
 vec2 dx=dFdx(p),dy=dFdy(p);float det=dx.x*dy.y-dx.y*dy.x;
 vec2 micro=(vec2(dy.y,-dy.x)*dFdx(height)+vec2(-dx.y,dx.x)*dFdy(height))/max(abs(det),.0000001)*sign(det);
 vec3 ripple=rippleSurface(p);vec2 slope=-normalize(vNormal).xz/max(.1,normalize(vNormal).y)+ripple.yz-vRippleSlope;
 slope+=clamp(micro,vec2(-.12),vec2(.12))*uMicroIntensity*mix(1.,.15,smoothstep(50.,400.,distanceToCamera));
 vec3 n=normalize(vec3(-slope.x,1.,-slope.y));float nv=max(0.,dot(n,v)),f=fresnel(nv);
 float rough=clamp(uRoughness/sqrt(uSpecularSharpness)+footprint*.06,.12,.48);
 vec3 r=reflect(-v,n);float haze=pow(max(0.,r.y),.6);
 vec3 env=uDeepColor*.7+uReflectionTint*(.045*haze);
 vec3 col=mix(uDeepColor*.55,uSurfaceColor*.23,smoothstep(-.15,.22,vWorld.y))*(1.-f)+env*(.18+f)*uReflectionGain;
 col+=uReflectionTint*specular(n,v,normalize(vec3(-.3,.7,-.9)),rough)*.75;
 if(uReflect>.5&&vReflection.w>0.){
  vec2 uv=vReflection.xy/vReflection.w+slope*.019*min(1.,35./max(1.,distanceToCamera));
  if(all(greaterThan(uv,vec2(.003)))&&all(lessThan(uv,vec2(.997)))){
   vec2 blur=vec2(1.3+rough*4.)/max(1.,uReflectionSize);
   vec3 reflection=texture2D(uReflection,uv).rgb*.4;
   reflection+=(texture2D(uReflection,uv+vec2(blur.x,0)).rgb+texture2D(uReflection,uv-vec2(blur.x,0)).rgb+texture2D(uReflection,uv+vec2(0,blur.y)).rgb+texture2D(uReflection,uv-vec2(0,blur.y)).rgb)*.15;
   col+=reflection*(.035+f*.65)*uReflectionGain*exp(-distanceToCamera*.0015);
  }
 }
 for(int i=0;i<12;i++){if(i>=uLightCount)break;vec3 offset=uLightPosition[i].xyz-vWorld;float d=length(offset),range=uLightPosition[i].w;float attenuation=pow(max(0.,1.-d/range),2.)/max(1.,d*d);
  col+=uLightColor[i].rgb*uLightColor[i].w*attenuation*(specular(n,v,normalize(offset),rough)*.28+.004*(1.-f));
 }
 float foamGrain=smoothstep(-.12,.48,snoise(vec3(p*2.1+vec2(uTime*.2,-uTime*.1),uTime*.07)));
 float crestFoam=smoothstep(uFoamThreshold,uFoamThreshold+.05,vCrest);
 float impactFoam=smoothstep(.09,.55,length(ripple.yz));
 float foam=(crestFoam*.35+impactFoam*.8)*foamGrain*uFoamIntensity/(1.+footprint*2.);
 col=mix(col,uFoamColor*.48,clamp(foam,0.,.5));
 col*=1.-.25*exp(-dot(p-uPlayer.xz,p-uPlayer.xz)*5.);
 float fog=1.-exp(-pow(distanceToCamera*uFogDensity,2.));col=mix(col,vec3(.0012,.0027,.0058),fog);
 gl_FragColor=vec4(col,1.);
}`;
