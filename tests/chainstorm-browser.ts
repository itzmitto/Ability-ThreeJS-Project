import '../src/styles/game.css';
import { InstancedMesh, Matrix4, Mesh, PointLight, Vector3 } from 'three';
import { Game } from '../src/game/Game';
import type { AbilityCastContext } from '../src/abilities/Ability';
const root=document.querySelector<HTMLElement>('#app')!,game=new Game(root),query=new URLSearchParams(location.search),renderer=game.renderer.renderer;
const report=document.createElement('pre');report.id='chain-report';report.style.cssText='position:fixed;left:24px;top:145px;color:#c5e2ef;background:#06111dde;font:10px monospace;max-height:48vh;overflow:auto;z-index:40;pointer-events:none';root.append(report);
const lines:string[]=[];let errors=0;const check=(ok:boolean,label:string)=>{lines.push(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)errors++;report.textContent=lines.join('\n');};
window.addEventListener('error',e=>check(false,e.message));window.addEventListener('unhandledrejection',e=>check(false,String(e.reason)));renderer.debug.onShaderError=gl=>check(false,`GLSL ${gl.getError()}`);
const frame=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));const frames=async(n=3)=>{for(let i=0;i<n;i++)await frame();};
const key=(code:string,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));const click=(selector:string)=>root.querySelector<HTMLElement>(selector)!.click();
const counts=()=>{let objects=0,lights=0,materials=new Set<unknown>();game.sceneManager.scene.traverse(o=>{objects++;if(o instanceof PointLight)lights++;if(o instanceof Mesh)materials.add(o.material);});return {objects,lights,materials:materials.size,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length,subscriptions:game.settings.subscriberCount,effects:game.effects.activeCount,ripples:game.world.water.interactions.activeCount};};
const context=():AbilityCastContext=>{const target=new Vector3(game.player.position.x,0,game.player.position.z-30);return {player:game.player,scene:game.sceneManager.scene,camera:game.camera.camera,origin:game.player.visual.getRightHandWorldPosition(),direction:game.targeting.aimDirection.clone(),targetPoint:target,groundTarget:target,playerForward:game.player.getForward().clone(),cameraForward:game.targeting.aimDirection.clone(),targeting:game.targeting,effectManager:game.effects,quality:game.settings,time:0,water:game.world.water.interactions,cameraFeedback:game.camera.addFeedback};};
const clean=()=>{game.effects.update(120,120);game.abilities.update(120);game.world.water.update(120,game.player.position);game.renderer.render();};
try{
await game.player.visual.ready;game.settings.setPreset((query.get('quality')??'LOW') as 'LOW'|'MEDIUM'|'MAX');game.start();await frames(12);
check(game.abilities.registry.all.length===28,'Exactly 28 registered spells; old shortcuts preserved');
click('[data-open-book]');await frames();check(root.querySelectorAll('.spell-card').length===28,'Spellbook dynamically displays 28 cards');
const search=root.querySelector<HTMLInputElement>('[aria-label="Search spells"]')!;search.value='runebreaker';search.dispatchEvent(new Event('input'));check(root.querySelectorAll('.spell-card:not([hidden])').length===1,'Subtitle search finds Runebreaker');
const star=root.querySelector<HTMLButtonElement>('[data-favorite="astral-chainstorm"]')!,wasFavorite=star.getAttribute('aria-pressed')==='true';if(!wasFavorite)star.click();check(star.getAttribute('aria-pressed')==='true','Favorite state works');
click('[data-spell="astral-chainstorm"]');await frames();check(game.abilities.selectedIndex===27&&game.effects.activeCount===0,'Spellbook equips ability 28 without casting');
click('[data-open-wheel]');await frames();const wheel=root.querySelector<HTMLDialogElement>('.quick-wheel')!,button=wheel.querySelector<HTMLButtonElement>('[aria-label="Select ASTRAL CHAINSTORM"]');check(!!button,'Chainstorm appears in favorite wheel');button?.click();await frames();
check(game.abilities.selectedAbility?.id==='astral-chainstorm'&&!wheel.open,'Wheel selects through shared AbilityManager');
renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));await frames();renderer.domElement.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
check(game.effects.activeCount===1&&game.abilities.getCooldown(27)>0,'World left-click casts / 8s cooldown starts');
let rejected=0;for(let i=0;i<100;i++)if(!game.abilities.cast(context()))rejected++;check(rejected===100&&game.effects.activeCount===1,'100 cooldown attempts allocate no extra effects');
const matrix=new Matrix4();let peakLinks=0,peakParticles=0,peakCalls=0,valid=true,water=false;const phases=new Set<string>(),samples:number[]=[];let previous=performance.now();
for(let i=0;i<320&&game.effects.activeCount;i++){
  game.effects.update(.025,i*.025);await frame();const now=performance.now(),interval=now-previous;samples.push(interval);previous=now;if(interval>5000)throw new Error('Stop on severe GPU stall');
  const bundle=game.sceneManager.scene.getObjectByName('Astral Chainstorm · reusable bounded bundle');if(bundle)phases.add(String(bundle.userData.phase));
  game.sceneManager.scene.traverse(o=>{if(o instanceof InstancedMesh){valid&&=o.count<=o.instanceMatrix.count;for(let j=0;j<o.count;j++){o.getMatrixAt(j,matrix);valid&&=matrix.elements.every(Number.isFinite);}if(o.name.startsWith('Astral chains'))peakLinks=Math.max(peakLinks,o.count);}});
  peakParticles=Math.max(peakParticles,game.effects.particleCount);peakCalls=Math.max(peakCalls,renderer.info.render.calls);water||=game.world.water.interactions.emitted>0;
}
check(valid,'Instanced link/shard matrices finite and bounded');check(peakLinks<=({LOW:78,MEDIUM:136,MAX:200}[game.settings.preset]),`Peak links ${peakLinks} respect quality ceiling`);check(['charge','assembly','launch','wrap','constrict','slam','impact'].every(p=>phases.has(p)),'All seven choreography phases observed');check(water,'Final slam emitted owned ocean disturbances');check(game.effects.activeCount===0,'Natural visual completion');
await frames(240);clean();check(game.world.water.interactions.activeCount===0,'Water ripples and spray expire');check(renderer.getContext().getError()===0,'WebGL NO_ERROR');
if(query.has('stress')){
  // Warm and settle two deliberately bounded leases before comparing reusable caches.
  const ability=game.abilities.registry.get('astral-chainstorm')!;ability.cast(context());ability.cast(context());for(let i=0;i<220&&game.effects.activeCount;i++){if(i===15)game.settings.setPreset('LOW');if(i===30)game.settings.setPreset('MEDIUM');if(i===45)game.settings.setPreset('MAX');game.effects.update(.04,i*.04);game.renderer.render();await frame();}clean();await frames(8);
  check(game.settings.preset==='MAX'&&game.effects.activeCount===0,'Two leases survive live LOW / MEDIUM / MAX changes and complete');
  const baseline=counts();for(let cast=0;cast<20;cast++){game.abilities.update(120);check(game.abilities.cast(context()),`Controlled stress cast ${cast+1}`);for(let i=0;i<220&&game.effects.activeCount;i++){game.effects.update(.04,i*.04);game.renderer.render();await frame();}clean();}
  const after=counts();check(JSON.stringify(after)===JSON.stringify(baseline),'20 casts restore warmed scene/material/GPU/light/ripple/subscription baseline');lines.push('COUNTS '+JSON.stringify({baseline,after}));
}
key('KeyW');await frames(60);check(game.player.visual.animationState==='Walk','Walk remains functional');key('ShiftLeft');await frames(60);check(game.player.visual.animationState==='Run','Shift sprint remains functional');key('KeyW','keyup');key('ShiftLeft','keyup');await frames(180);check(game.player.visual.animationState==='Idle','Idle resumes');
const aim=game.targeting.aimDirection.clone();renderer.domElement.dispatchEvent(new MouseEvent('mousemove',{buttons:2,movementX:25,movementY:8,bubbles:true}));await frames(12);check(!game.targeting.aimDirection.equals(aim),'Camera and targeting remain controllable');
key('F3');await frames();key('F3','keyup');check(!root.querySelector<HTMLElement>('.ocean-editor')!.hidden,'F3 ocean editor preserved');key('F3');await frames();key('F3','keyup');
click('[data-open-book]');await frames();search.value='';search.dispatchEvent(new Event('input'));if(!wasFavorite)click('[data-favorite="astral-chainstorm"]');click('.spellbook .overlay-close');
samples.sort((a,b)=>a-b);lines.push('PROFILE '+JSON.stringify({quality:game.settings.preset,peakLinks,peakParticles,peakCalls,rafMedian:samples[Math.floor(samples.length*.5)],rafP95:samples[Math.floor(samples.length*.95)]}));
clean();game.dispose();check(renderer.info.memory.geometries===0&&renderer.info.memory.textures===0&&game.settings.subscriberCount===0,'Game teardown releases GPU resources and subscriptions');check(errors===0,'BROWSER CHECKS COMPLETE');report.dataset.complete='true';report.textContent=lines.join('\n');
}catch(e){check(false,String(e));report.dataset.complete='true';game.dispose();}
