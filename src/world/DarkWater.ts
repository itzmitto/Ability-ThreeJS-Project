import { Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { Scene } from 'three';
import type { GraphicsSettings } from '../quality/GraphicsSettings';
import { GAME_CONFIG } from '../game/config';

export class DarkWater {
  private readonly material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDetail: { value: 2 }, uPlayer: { value: new Vector3() }, uFogDensity: { value: GAME_CONFIG.world.fogDensity } },
    vertexShader: `
      uniform float uTime; varying vec3 vWorld;
      void main() {
        vec3 p=position;
        p.z=sin(p.x*0.12+uTime*0.38)*cos(p.y*0.15-uTime*0.26)*0.018;
        vec4 world=modelMatrix*vec4(p,1.0); vWorld=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uDetail; uniform vec3 uPlayer; uniform float uFogDensity;
      varying vec3 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      float height(vec2 p){
        float h=sin(p.x*0.53+p.y*0.37+uTime*0.35)*0.14+sin(p.x*0.24-p.y*0.68-uTime*0.27)*0.10;
        h+=noise(p*1.25+vec2(uTime*0.045,-uTime*0.035))*0.20;
        if(uDetail>1.5)h+=noise(p*3.3-vec2(uTime*0.025))*0.055;
        if(uDetail>2.5)h+=noise(p*8.0+vec2(uTime*0.014))*0.022;
        return h;
      }
      void main(){
        vec2 p=vWorld.xz;
        float h=height(p),e=0.10;
        vec3 normal=normalize(vec3((h-height(p+vec2(e,0)))*1.9,1.0,(h-height(p+vec2(0,e)))*1.9));
        vec3 view=normalize(cameraPosition-vWorld);
        vec3 reflected=reflect(-view,normal);
        float fresnel=pow(1.0-max(dot(normal,view),0.0),4.0);
        float canopy=pow(max(reflected.y,0.0),0.55);
        float surfaceNoise=noise(p*0.045+uTime*0.007);
        vec3 color=vec3(0.002,0.004,0.008);
        color+=vec3(0.006,0.013,0.024)*canopy*(0.3+0.7*surfaceNoise);
        color+=vec3(0.006,0.014,0.027)*fresnel;
        vec3 light=normalize(vec3(-0.3,0.7,-0.9));
        float spec=pow(max(dot(reflect(-light,normal),view),0.0),uDetail<1.5?45.0:100.0);
        color+=vec3(0.15,0.24,0.36)*spec*(0.4+0.6*surfaceNoise);
        float nearGlow=exp(-length(p-uPlayer.xz)*0.075);
        color+=vec3(0.004,0.012,0.021)*nearGlow*(0.35+0.65*noise(p*0.6));
        float contact=1.0-exp(-dot(p-uPlayer.xz,p-uPlayer.xz)*3.5)*0.82;
        color*=contact;
        float distanceToCamera=length(cameraPosition-vWorld);
        float fog=1.0-exp(-pow(distanceToCamera*uFogDensity,2.0));
        color=mix(color,vec3(0.0012,0.0027,0.0058),fog);
        gl_FragColor=vec4(color,1.0);
      }`,
  });
  private readonly mesh = new Mesh(new PlaneGeometry(1, 1), this.material);
  private readonly unsubscribe: () => void;
  constructor(scene: Scene, quality: GraphicsSettings) {
    this.mesh.rotation.x = -Math.PI / 2;
    scene.add(this.mesh);
    this.unsubscribe = quality.subscribe(config => {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new PlaneGeometry(GAME_CONFIG.world.size, GAME_CONFIG.world.size, config.waterSegments, config.waterSegments);
      this.material.uniforms.uDetail.value = config.waterDetail;
    });
  }
  update(time: number, playerPosition: Vector3): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uPlayer.value.copy(playerPosition);
    // Recenter an enormous surface so the horizon never exposes an edge.
    this.mesh.position.x = Math.floor(playerPosition.x / 100) * 100;
    this.mesh.position.z = Math.floor(playerPosition.z / 100) * 100;
  }
  dispose(): void { this.unsubscribe(); this.mesh.geometry.dispose(); this.material.dispose(); this.mesh.removeFromParent(); }
}
