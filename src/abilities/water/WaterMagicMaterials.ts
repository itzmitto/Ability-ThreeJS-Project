import { DoubleSide, ShaderMaterial } from 'three';
/** Curved two-sided water shell: no scene-colour refraction or additional ocean renderer. */
export function waterMagicMaterial(mode: number): ShaderMaterial {
  return new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uRise: { value: 0 }, uCurl: { value: 0 }, uCrash: { value: 0 }, uFade: { value: 1 }, uMode: { value: mode }, uDetail: { value: 2 } },
    vertexShader: `varying vec2 vUv;varying vec3 vWorld;varying float vLayer;uniform float uTime,uRise,uCurl,uCrash,uMode,uDetail;
      void main(){vUv=uv;vLayer=position.z;float x=(uv.x-.5)*16.;float s=uv.y;vec3 p;
        if(uMode<.5){float h=10.5*(.93+.07*cos(uv.x*6.283));float top=max(0.,(s-.65)/.35);float theta=top*(1.5708+uCurl*2.5);float y=s<.65?h*s:h*.65+h*.3*sin(theta);float z=-10.+s*4.+uCurl*h*.26*(1.-cos(theta));float ripple=sin(uv.x*24.+s*18.-uTime*5.)*.13+sin(uv.x*53.-s*28.+uTime*3.)*.045*uDetail;p=vec3(x,y+ripple*s,z);p.z+=position.z*.65*(.3+s);p.z+=p.y*uCrash*.95;p.y*=uRise*(1.-uCrash*.94);p.z+=uCrash*3.;}
        else if(uMode<1.5){float a=(uv.x-.5)*2.9;float r=2.4+sin(s*3.14159)*.75;p=vec3(sin(a)*r,(cos(a)-.4)*r,(s-.5)*.45+position.z*.2);p.z+=sin(uv.x*14.-uTime*14.)*.06;}
        else if(uMode<2.5){float a=uv.x*6.283+uTime*2.,r=.22+s*.08;p=vec3(cos(a)*r,sin(a)*r,sin(a*2.+uTime)*.09+position.z*.025);}
        else if(uMode<3.5){float a=uv.x*6.283;float r=s*12.;float age=max(0.,uTime-3.7);float crown=sin(s*3.14159)*exp(-age*.9);float jag=.75+.25*sin(a*11.+uTime*4.)*sin(a*7.-uTime*2.);p=vec3(cos(a)*r*(1.+age*.4),.12+crown*(7.-s*2.)*jag+position.z*.25,sin(a)*r*(1.+age*.4));}
        if(uMode>3.5){float a=uv.x*6.283;float r=s*9.;p=vec3(cos(a)*r,.09+exp(-r*r/22.)*uRise*2.8+sin(r*3.-uTime*4.)*.09*uRise+position.z*.12,sin(a)*r);}
        vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec2 vUv;varying vec3 vWorld;varying float vLayer;uniform float uTime,uFade,uMode,uDetail,uCrash;
      void main(){vec3 n=normalize(cross(dFdx(vWorld),dFdy(vWorld)));if(!gl_FrontFacing)n=-n;vec3 eye=normalize(cameraPosition-vWorld);float flow=sin(vUv.x*45.+vUv.y*26.-uTime*7.+sin(vUv.x*15.+uTime*2.)*2.);float fine=sin(vUv.x*110.-vUv.y*62.+uTime*12.)*sin(vUv.y*85.+uTime*4.);n=normalize(n+vec3(flow*.12,fine*.045*uDetail,flow*.06));float fres=pow(1.-abs(dot(n,eye)),3.);float spec=pow(max(0.,dot(reflect(-normalize(vec3(-.4,.85,.2)),n),eye)),64.);float crest=smoothstep(.76,.96,vUv.y);float foam=crest*smoothstep(-.05,.65,flow+fine*.35);if(uMode>.5&&uMode<1.5)foam=pow(abs(vUv.y*2.-1.),8.)*.8+smoothstep(.8,.98,abs(vUv.x*2.-1.));if(uMode>2.5)foam=smoothstep(.55,.88,flow)*sin(vUv.y*3.14159);vec3 deep=vec3(.012,.12,.22),blue=vec3(.06,.43,.58);vec3 col=mix(deep,blue,.4+flow*.13+fres*.45);col+=vec3(.35,.69,.76)*fres*.5+vec3(.7,.9,.94)*spec*.7;col=mix(col,vec3(.8,.96,.99),clamp(foam,0.,1.)*.9);float edge=pow(abs(vUv.x*2.-1.),12.);float alpha=(.52+fres*.26+foam*.2-edge*.27)*(vLayer>.5?.65:1.);gl_FragColor=vec4(col,alpha*uFade);}` });
}
