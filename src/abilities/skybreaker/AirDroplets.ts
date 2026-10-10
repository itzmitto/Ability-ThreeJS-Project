import { NormalBlending,Vector3 } from 'three';
import { SeedParticles } from '../bending/SeedParticles';
export class AirDroplets extends SeedParticles{
  readonly centers=[new Vector3(),new Vector3(),new Vector3()];readonly hits=new Vector3(-1,-1,-1);
  constructor(){super(650,`
    int slot=int(floor(aSeed.y*2.999));float t=slot==0?uHits.x:slot==1?uHits.y:uHits.z;
    vec3 center=slot==0?uCenters[0]:slot==1?uCenters[1]:uCenters[2];
    float a=aSeed.x*6.283;
    if(t<0.){float behind=aSeed.z*4.;p=center+vec3(cos(a)*(1.+behind*.15),sin(a)*.5,behind);p.x+=sin(behind*4.-uTime*12.)*.2;vFade*=.2*(1.-aSeed.z);size=.045;}
    else{float drag=(1.-exp(-t*4.))*3.;p=center+vec3(cos(a)*drag,.05+(aSeed.z*3.+.5)*t-4.*t*t,sin(a)*drag-t*2.);vFade*=max(0.,1.-t/1.3)*smoothstep(-.2,.1,p.y);size=.07;}
  `,`alpha=exp(-q.x*q.x*180.-q.y*q.y*12.)*vFade;color=vec3(.48,.56,.56);`,NormalBlending,'uniform vec3 uCenters[3];uniform vec3 uHits;');
    this.material.uniforms.uCenters={value:this.centers};this.material.uniforms.uHits={value:this.hits};
  }
}
