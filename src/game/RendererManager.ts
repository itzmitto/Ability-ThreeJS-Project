import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace, Vector2, WebGLRenderer } from 'three';
import type { Camera, Scene } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { GraphicsSettings } from '../quality/GraphicsSettings';

export class RendererManager {
  readonly renderer: WebGLRenderer;
  readonly composer: EffectComposer;
  beforeRender?:()=>void;
  private readonly bloom = new UnrealBloomPass(new Vector2(1, 1), 0.18, 0.65, 0.85);
  private readonly vignette = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){vec4 c=texture2D(tDiffuse,vUv);float v=1.0-smoothstep(0.15,0.85,length((vUv-0.5)*vec2(1.05,0.85)));gl_FragColor=vec4(c.rgb*mix(0.64,1.0,v),c.a);}',
  });
  private unsubscribe: () => void;
  constructor(root: HTMLElement, scene: Scene, camera: Camera, quality: GraphicsSettings, canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#03060c');
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.renderer.domElement.className = 'world-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Interactive third-person dark water arena');
    root.append(this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.vignette);
    this.composer.addPass(new OutputPass());
    this.unsubscribe = quality.subscribe(config => {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.pixelRatio));
      this.renderer.shadowMap.enabled = config.shadows;
      this.bloom.enabled = config.bloom > 0;
      this.bloom.strength = config.bloom;
      this.resize();
    });
    window.addEventListener('resize', this.resize);
  }
  resize = (): void => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(window.innerWidth, window.innerHeight);
  };
  render(): void { this.renderer.info.reset(); this.beforeRender?.(); this.composer.render(); }
  dispose(): void {
    this.unsubscribe();
    window.removeEventListener('resize', this.resize);
    this.composer.passes.forEach(pass => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
