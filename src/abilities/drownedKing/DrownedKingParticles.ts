import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, NormalBlending, Points, ShaderMaterial, Vector3 } from 'three';
import { seed,type KingConfig,type KingQuality } from './DrownedKingConfig';
/** Fixed GPU droplets, mist, rust flakes and sharp runic streaks; no per-grain objects. */
export class DrownedKingParticles {
  readonly root=new Group();private readonly geometry=new BufferGeometry();private readonly materials:ShaderMaterial[]=[];private count=0;
  private readonly uniforms={uTime:{value:0},uGround:{value:new Vector3()},uKing:{value:new Vector3()},uAxis:{value:new Vector3(0,0,1)},uLength:{value:105},uWidth:{value:9},uFade:{value:1}};
  constructor(){
    const data=new Float32Array(6000*4);for(let i=0;i<6000;i++)data.set([seed(i+1),seed(i+17000),seed(i+41000),i%4],i*4);
    this.geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(6000*3),3));this.geometry.setAttribute('aData',new Float32BufferAttribute(data,4));
    for(let layer=0;layer<2;layer++){
      const m=new ShaderMaterial({transparent:true,depthWrite:false,blending:layer?AdditiveBlending:NormalBlending,
        uniforms:{...this.uniforms,uLayer:{value:layer}},vertexShader:`
          attribute vec4 aData;uniform float uTime,uLength,uWidth,uFade;uniform vec3 uGround,uKing,uAxis;varying float vKind,vFade;varying vec3 vColor;
          void main(){float h=aData.x,s=aData.y,k=aData.w,a=s*6.283185;vKind=k;vec3 p;
            float age=max(0.,uTime-9.-h*.3);vec3 side=vec3(-uAxis.z,0.,uAxis.x);
            if(uTime<9.){float rise=fract(h+uTime*.1);p=uKing+vec3(cos(a+uTime*.4)*30.,rise*40.,sin(a+uTime*.4)*30.);
              vFade=smoothstep(0.,1.,uTime)*(1.-smoothstep(.7,1.,rise))*.3;
              if(k<.5){p.y=1.+rise*9.;vFade*=.5;}
            }else{
              float drag=(1.-exp(-age*.65))/.65;float signSide=s>.5?1.:-1.;
              p=uGround+uAxis*((h-.5)*uLength)+side*signSide*(uWidth+(8.+s*22.)*drag);
              p.y+=(8.+h*23.)*age-6.*age*age;vFade=(1.-smoothstep(1.3,4.,age))*.5;
              if(k<.5){p.y=1.+h*5.;vFade*=.3;}
              if(k>2.5){p.y+=(sin(age*3.+a)*.6);vFade*=.7;}
              if(p.y<uGround.y-.1)vFade=0.;
            }
            p.x+=sin(uTime*.7+h*7.)*1.2;p.z+=cos(uTime*.5+s*8.)*1.2;
            vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
            gl_PointSize=clamp((k<.5?1.4:k<1.5?.3:.15+h*.15)*500./max(1.,-mv.z),1.,k<.5?24.:9.);
            vFade*=uFade;vColor=k<.5?vec3(.085,.15,.16):k<1.5?vec3(.46,.64,.66):k<2.5?vec3(.12,.07,.04):vec3(.33,.78,.65);
            if(vFade<.001)gl_Position=vec4(2.,2.,2.,1.);
          }`,fragmentShader:`varying float vKind,vFade;varying vec3 vColor;uniform float uLayer;
            void main(){if((uLayer<.5&&vKind>2.5)||(uLayer>.5&&vKind<2.5))discard;vec2 p=gl_PointCoord*2.-1.;float a;
              if(vKind<.5)a=exp(-dot(p,p)*5.)*(1.-smoothstep(.5,1.,length(p)));
              else if(vKind<1.5)a=(1.-smoothstep(.06,.16,abs(p.x)))*(1.-smoothstep(.3,1.,abs(p.y)));
              else a=1.-smoothstep(.18,.3,abs(p.x)+abs(p.y)*.5);
              if(a*vFade<.004)discard;gl_FragColor=vec4(vColor,a*vFade);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`});const points=new Points(this.geometry,m);points.frustumCulled=false;points.renderOrder=layer?5:4;this.materials.push(m);this.root.add(points);
    }
  }
  update(t:number,ground:Vector3,king:Vector3,axis:Vector3,c:Readonly<KingConfig>,q:KingQuality):void{this.count=q.particles;this.geometry.setDrawRange(0,this.count);this.uniforms.uTime.value=t;this.uniforms.uGround.value.copy(ground);this.uniforms.uKing.value.copy(king);this.uniforms.uKing.value.y=ground.y;
    this.uniforms.uAxis.value.copy(axis);this.uniforms.uLength.value=c.splitLength;this.uniforms.uWidth.value=c.splitWidth;this.uniforms.uFade.value=1-Math.max(0,Math.min(1,(t-13)/4));}
  get particleCount():number{return Math.round(this.count*this.uniforms.uFade.value);}
  dispose():void{this.geometry.dispose();this.materials.forEach(m=>m.dispose());this.root.clear();}
}
