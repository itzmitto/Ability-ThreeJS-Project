import { NormalBlending,Vector3 } from 'three';
import { SeedParticles } from '../bending/SeedParticles';
export class InfernoParticles extends SeedParticles{
  readonly hands=[new Vector3(),new Vector3()];
  constructor(){super(1050,`
    float angle=aSeed.x*6.283;float side=aSeed.y<.5?1.:-1.;vec3 hand=aSeed.y<.5?uHands[0]:uHands[1];
    if(uImpact<0.){float f=fract(aSeed.z+uTime*.45)*uRelease;p=mix(hand,vec3(0.,.2,-uLength),f);float r=sin(f*3.14159)*1.8+.1;p.x+=side*r*cos(f*9.+uTime*4.);p.y+=r*.55*sin(f*9.+uTime*4.)+.1+aSeed.x*.2;vFade*=.5;vKind=mix(.1,.8,aSeed.w);size=aSeed.w>.7?.14:.045;}
    else{float t=max(0.,uImpact-aSeed.y*.16),spread=(1.-exp(-t*2.))*(2.+aSeed.z*5.);p=vec3(cos(angle)*spread,.2+t*(1.+aSeed.z*3.),-uLength+sin(angle)*spread);p.x+=sin(t*3.+angle)*t*.35;vFade*=max(0.,1.-t/2.);size=aSeed.w>.84?.35+aSeed.x*.6:.05;}
  `,`float r=length(q);if(vKind>.84){alpha=exp(-r*r*20.)*vFade*.15;color=vec3(.49,.47,.4);}else if(vKind>.66){alpha=exp(-r*r*27.)*vFade*.25;color=vec3(.15,.08,.055);}else{alpha=exp(-q.x*q.x*170.-q.y*q.y*16.)*vFade;color=mix(vec3(1.,.09,.003),vec3(1.3,.55,.08),vKind);}`,NormalBlending,'uniform vec3 uHands[2];');
    this.material.uniforms.uHands={value:this.hands};
  }
}
