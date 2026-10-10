import type { DarkWater } from '../world/DarkWater';
import { OCEAN_DEFAULTS, OCEAN_LIMITS } from '../world/water/OceanSettings';
import type { OceanSettings } from '../world/water/OceanSettings';
/** Development-only controls, created once and hidden outside F3 debug mode. */
export class OceanVFXControls {
  readonly element = document.createElement('section');
  private readonly controller = new AbortController();
  constructor(water: DarkWater) {
    this.element.className='ocean-editor';this.element.hidden=true;this.element.setAttribute('aria-label','Ocean VFX Editor');
    this.element.innerHTML='<header><strong>OCEAN VFX</strong><span>LIVE UNIFORMS · F3</span></header>';
    const groups: Record<string, readonly (keyof OceanSettings)[]>={
      Waves:['amplitude','wavelength','steepness','direction','swellSpeed','mediumSpeed'],
      Surface:['microIntensity','normalScale','roughness','reflectionIntensity','fresnelStrength','specularSharpness'],
      Colors:['deepColor','surfaceColor','reflectionTint','foamColor'],
      Interactions:['foamIntensity','foamThreshold','rippleStrength','rippleSpeed','rippleDecay','splashDensity'],
      Budget:['waveQuality','normalQuality','maxRipples'],
    };
    for(const [title,keys] of Object.entries(groups)){
      const details=document.createElement('details');details.open=title==='Waves';const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
      for(const key of keys){const label=document.createElement('label'),text=document.createElement('span'),input=document.createElement('input'),value=document.createElement('output');
        text.textContent=key.replace(/[A-Z]/g,c=>' '+c.toLowerCase());input.setAttribute('aria-label',`Ocean ${key}`);
        if(typeof water.settings[key]==='number'){input.type='range';const bounds=OCEAN_LIMITS[key as keyof typeof OCEAN_LIMITS];input.min=String(bounds[0]);input.max=String(bounds[1]);input.step=String(bounds[2]);}
        else input.type='color';input.value=String(water.settings[key]);value.textContent=input.value;
        input.addEventListener('input',()=>{const v=input.type==='color'?input.value:Number(input.value);water.configure({[key]:v});value.textContent=String(water.settings[key]);},{signal:this.controller.signal});
        label.append(text,value,input);details.append(label);
      }this.element.append(details);
    }
    const reset=document.createElement('button');reset.type='button';reset.textContent='Restore ocean defaults';reset.addEventListener('click',()=>{water.configure({...OCEAN_DEFAULTS});this.element.querySelectorAll<HTMLInputElement>('input').forEach(input=>{const key=input.getAttribute('aria-label')!.slice(6) as keyof OceanSettings;input.value=String(water.settings[key]);input.parentElement!.querySelector('output')!.textContent=input.value;});reset.blur();},{signal:this.controller.signal});this.element.append(reset);
  }
  dispose():void{this.controller.abort();this.element.remove();}
}
