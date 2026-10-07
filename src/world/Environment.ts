import { AmbientLight, BackSide, DirectionalLight, HemisphereLight, Mesh, PlaneGeometry, ShaderMaterial, ShadowMaterial, SphereGeometry } from 'three';
import type { Scene, Vector3 } from 'three';
import type { GraphicsSettings } from '../quality/GraphicsSettings';

export class Environment {
  private readonly ambient = new AmbientLight('#7b92b4', 0.6);
  private readonly hemisphere = new HemisphereLight('#a1bedb', '#080e19', 1.15);
  private readonly key = new DirectionalLight('#c0d8ee', 2.6);
  private readonly rim = new DirectionalLight('#426d9a', 2.2);
  private readonly sky = new Mesh(new SphereGeometry(1500, 32, 20), new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float uTime; varying vec3 vPos;
      void main(){vec3 d=normalize(vPos);float top=smoothstep(-0.03,0.7,d.y);
      float haze=exp(-pow((d.x+0.24)*2.4,2.0)-pow((d.y-0.28)*3.5,2.0));
      float veil=0.85+0.15*sin(d.x*9.0+d.z*6.0+uTime*0.025);
      vec3 c=mix(vec3(0.0012,0.0027,0.0058),vec3(0.0018,0.004,0.009),top);
      c+=vec3(0.002,0.006,0.014)*haze*veil;gl_FragColor=vec4(c,1.0);}`,
  }));
  private readonly shadow = new Mesh(new PlaneGeometry(40, 40), new ShadowMaterial({ opacity: 0.3 }));
  private readonly unsubscribe: () => void;
  constructor(scene: Scene, quality: GraphicsSettings) {
    this.key.position.set(-5, 9, -6);
    this.key.castShadow = true;
    Object.assign(this.key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.1, far: 40 });
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.03;
    this.rim.position.set(5, 4, 5);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.026;
    this.shadow.receiveShadow = true;
    this.sky.frustumCulled = false;
    scene.add(this.ambient, this.hemisphere, this.key, this.key.target, this.rim, this.rim.target, this.sky, this.shadow);
    this.unsubscribe = quality.subscribe(config => {
      this.key.castShadow = config.shadows;
      this.shadow.visible = config.shadows;
      this.key.shadow.mapSize.setScalar(config.shadowMapSize);
      this.key.shadow.map?.dispose(); this.key.shadow.map = null;
      this.key.shadow.needsUpdate = true;
    });
  }
  update(time: number, position: Vector3): void {
    this.sky.position.copy(position);
    this.sky.material.uniforms.uTime.value = time;
    this.key.position.set(position.x - 5, position.y + 9, position.z - 6);
    this.key.target.position.copy(position);
    this.rim.position.set(position.x + 5, position.y + 4, position.z + 5);
    this.rim.target.position.copy(position);
    this.shadow.position.set(position.x, 0.026, position.z);
  }
  dispose(): void {
    this.unsubscribe();
    this.sky.geometry.dispose(); this.sky.material.dispose();
    this.shadow.geometry.dispose(); this.shadow.material.dispose();
    this.key.dispose(); this.rim.dispose();
    [this.ambient, this.hemisphere, this.key, this.key.target, this.rim, this.rim.target, this.sky, this.shadow].forEach(object => object.removeFromParent());
  }
}
