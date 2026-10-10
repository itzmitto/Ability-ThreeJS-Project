import { NormalBlending } from 'three';
import { SeedParticles } from '../bending/SeedParticles';
/** Heavy debris dust, separate pale water droplets and settling mineral grit; no glowing sparks. */
export class TitanDust extends SeedParticles{
  constructor(){super(780,`
    float angle=aSeed.x*6.283;
    if(uImpact<0.){float f=fract(aSeed.y+uTime*.3);p=vec3(cos(angle+uTime)*(.7+f),f*1.8,sin(angle+uTime)*(.7+f));vFade*=.15;size=.08;}
    else{float t=max(0.,uImpact-aSeed.y*.09),spread=(1.-exp(-t*2.))*(2.+aSeed.z*6.);p=vec3(cos(angle)*spread,uSurface+.05+t*(vKind>.7?5.+aSeed.z*4.:1.6)-t*t*(vKind>.7?5.:1.),-uLength+sin(angle)*spread);vFade*=max(0.,1.-t/1.8)*smoothstep(-.2,.1,p.y-uSurface);size=vKind>.7?.11:.18+aSeed.z*.3;}
  `,`float r=length(q);alpha=exp(-r*r*22.)*vFade*(vKind>.7?.7:.24);color=vKind>.7?vec3(.48,.6,.63):mix(vec3(.12,.15,.145),vec3(.31,.36,.32),vKind);`,NormalBlending);}
}
