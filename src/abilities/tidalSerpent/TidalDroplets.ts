import { NormalBlending } from 'three';
import { SeedParticles } from '../bending/SeedParticles';
export class TidalDroplets extends SeedParticles {
  constructor(){super(900,`
    float angle=aSeed.x*6.283;
    if(uImpact<0.){float f=fract(aSeed.y+uTime*.7);float z=f*uLength;p=vec3(sin(angle+f*8.-uTime*5.)*(.2+sin(f*3.14)*1.2),.2+sin(f*3.14)*1.4,-z);vFade*=.32*sin(f*3.14);size=1.4;}
    else{float t=max(0.,uImpact-aSeed.y*.13),v=3.+aSeed.z*6.;p=vec3(cos(angle)*v*t,.12+(3.+aSeed.y*6.)*t-6.*t*t,-uLength+sin(angle)*v*t);vFade*=max(0.,1.-t/1.5)*smoothstep(-.2,.1,p.y);size=mix(1.2,3.3,aSeed.z);}
  `,`float r=length(q*vec2(1.35,.8));alpha=exp(-r*r*23.)*vFade;color=mix(vec3(.16,.36,.45),vec3(.73,.85,.9),vKind);`,NormalBlending);}
}
