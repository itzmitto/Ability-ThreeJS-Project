import '../src/styles/game.css';
import { InstancedMesh, Mesh, PointLight, Vector3 } from 'three';
import { Game } from '../src/game/Game';
import type { AbilityCastContext } from '../src/abilities/Ability';
const root=document.querySelector<HTMLElement>('#app')!,game=new Game(root),renderer=game.renderer.renderer,query=new URLSearchParams(location.search);
const report=document.createElement('pre');report.id='king-report';report.style.cssText='position:fixed;left:24px;top:130px;background:#070918e8;color:#d1cbec;font:10px monospace;max-height:48vh;overflow:auto;z-index:40;pointer-events:none';root.append(report);
let errors=0,disposed=false;const lines:string[]=[];const check=(ok:boolean,label:string)=>{lines.push(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)errors++;report.textContent=lines.join('\n');};
window.addEventListener('error',e=>check(false,e.message));window.addEventListener('unhandledrejection',e=>check(false,String(e.reason)));
renderer.debug.onShaderError=(gl,_p,v,f)=>check(false,`GLSL ${gl.getShaderInfoLog(v)} ${gl.getShaderInfoLog(f)}`);
const frame=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));const frames=async(n=3)=>{for(let i=0;i<n;i++)await frame();};
const click=(s:string)=>root.querySelector<HTMLElement>(s)!.click();const key=(code:string,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
const counts=()=>{let objects=0,lights=0;const materials=new Set<unknown>();game.sceneManager.scene.traverse(o=>{objects++;if(o instanceof PointLight)lights++;if(o instanceof Mesh)materials.add(o.material);});return {objects,lights,materials:materials.size,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length,subscriptions:game.settings.subscriberCount,particles:game.effects.particleCount,effects:game.effects.activeCount,ripples:game.world.water.interactions.activeCount};};
const context=():AbilityCastContext=>{const target=new Vector3(0,0,-55);return {scene:game.sceneManager.scene,player:game.player,camera:game.camera.camera,origin:game.player.visual.getRightHandWorldPosition(),direction:new Vector3(0,0,-1),playerForward:game.player.getForward().clone(),cameraForward:game.targeting.aimDirection.clone(),groundTarget:target,targetPoint:target,targeting:game.targeting,effectManager:game.effects,quality:game.settings,time:0,water:game.world.water.interactions,cameraFeedback:game.camera.addFeedback,skyFraming:game.camera.requestSkyFraming};};
const finite=()=>{let valid=true;game.sceneManager.scene.traverse(o=>{valid&&=[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite);if(o instanceof InstancedMesh)valid&&=o.count<=o.instanceMatrix.count&&Array.from(o.instanceMatrix.array).every(Number.isFinite);});return valid;};
try {
  await game.player.visual.ready;game.settings.setPreset((query.get('quality')??'LOW') as 'LOW'|'MEDIUM'|'MAX');game.start();await frames(12);
  const oldSlots=game.abilities.slots.slice(0,29).map(s=>({key:s.key,code:s.code,number:s.number,shift:s.shift,abilityId:s.abilityId}));
  check(game.abilities.registry.all.length===32,'31 previous abilities plus Riftreaver');click('[data-open-book]');await frames();check(root.querySelectorAll('.spell-card').length===32,'Spellbook displays all 32 abilities');
  const search=root.querySelector<HTMLInputElement>('[aria-label="Search spells"]')!;
  for(const term of ['drowned','king','abyssal','knight','thronebreaker']){search.value=term;search.dispatchEvent(new Event('input'));check(!root.querySelector<HTMLElement>('[data-spell="drowned-king"]')!.closest<HTMLElement>('.spell-card')!.hidden,`Search ${term} finds Drowned King`);}
  const star=root.querySelector<HTMLButtonElement>('[data-favorite="drowned-king"]')!,saved=star.getAttribute('aria-pressed')==='true';if(!saved)star.click();
  click('[data-spell="drowned-king"]');await frames();check(game.abilities.selectedIndex===29&&game.effects.activeCount===0,'Spellbook equips #30 without casting or new shortcut');
  click('[data-open-wheel]');await frames();const wheel=root.querySelector<HTMLDialogElement>('.quick-wheel')!;
  const choose=wheel.querySelector<HTMLButtonElement>('[aria-label="Select THE DROWNED KING"]');check(!!choose,'Favorited Drowned King is selectable in Quick Wheel');choose?.click();await frames();
  check(!wheel.open&&game.abilities.selectedAbility?.id==='drowned-king','Wheel commits via shared selection manager');
  const emitted=game.world.water.interactions.emitted;renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));await frames();renderer.domElement.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
  check(game.effects.activeCount===1&&game.abilities.getCooldownById('drowned-king')>29,'Left click starts ultimate and 30s cooldown');
  let blocked=0;for(let i=0;i<100;i++)if(!game.abilities.cast(context()))blocked++;check(blocked===100&&game.effects.activeCount===1,'Cooldown blocks 100 rapid attempts');
  const phases=new Set<string>(),samples:number[]=[];let peakParticles=0,peakInstances=0,peakCalls=0,peakTriangles=0,valid=true,previous=performance.now();
  // First cast plays on the real Game RAF clock, with no accelerated stepping.
  for(let i=0;i<4000&&game.effects.activeCount;i++){
    await frame();const now=performance.now(),ms=now-previous;samples.push(ms);previous=now;if(ms>5000)throw new Error('Severe frame stall; halt before repeating');
    const bundle=game.sceneManager.scene.getObjectByName('Drowned King · reusable ultimate');if(bundle)phases.add(String(bundle.userData.phase));
    peakParticles=Math.max(peakParticles,game.effects.particleCount);peakInstances=Math.max(peakInstances,game.effects.instanceCount);peakCalls=Math.max(peakCalls,renderer.info.render.calls);peakTriangles=Math.max(peakTriangles,renderer.info.render.triangles);
    if(i%40===0)valid&&=finite();
  }
  check(valid,'Finite bounded geometry/instance transforms throughout all phases');check(['awakening','emergence','forging','windup','execution','sea-split','collapse','aftermath'].every(p=>phases.has(p)),'All eight major phases observed in real-time playback');
  check(game.effects.activeCount===0,'Real-time ultimate naturally expires');check(game.world.water.interactions.emitted-emitted>=7,'Impact submits bounded ocean disturbances');
  await frames(40);check(game.world.water.interactions.activeCount===0,'Owned water disturbances removed after completion');check(renderer.getContext().getError()===0,'WebGL NO_ERROR');
  samples.sort((a,b)=>a-b);lines.push('PROFILE '+JSON.stringify({preset:game.settings.preset,peakParticles,peakInstances,peakCalls,peakTriangles,rafMedian:samples[Math.floor(samples.length*.5)],rafP95:samples[Math.floor(samples.length*.95)],rafMax:samples[samples.length-1]}));
  if(query.has('stress')){
    const baseline=counts();
    for(let cast=0;cast<3;cast++){
      game.abilities.update(60);check(game.abilities.cast(context()),`Sequential controlled cast ${cast+1}`);
      for(let step=0;step<160&&game.effects.activeCount;step++){game.effects.update(.1,step*.1);game.renderer.render();await frame();}
      await frames(6);check(game.effects.activeCount===0,`Cast ${cast+1} finishes before next cast`);check(JSON.stringify(counts())===JSON.stringify(baseline),`Cast ${cast+1} restores warmed resource baseline`);
    }
    lines.push('COUNTS '+JSON.stringify({baseline,after:counts()}));
  }
  const start=game.player.position.clone();key('KeyW');await frames(60);check(game.player.visual.animationState==='Walk'&&game.player.position.distanceTo(start)>.1,'WASD / Walk still works');key('ShiftLeft');await frames(60);check(game.player.visual.animationState==='Run','Shift / Run still works');key('KeyW','keyup');key('ShiftLeft','keyup');await frames(180);check(game.player.visual.animationState==='Idle','Idle returns');
  const aim=game.targeting.aimDirection.clone();renderer.domElement.dispatchEvent(new MouseEvent('mousemove',{buttons:2,movementX:20,movementY:8,bubbles:true}));await frames(12);check(!aim.equals(game.targeting.aimDirection),'Mouse camera and targeting remain live after framing expires');
  key('F3');await frames();key('F3','keyup');check(!root.querySelector<HTMLElement>('.ocean-editor')!.hidden,'F3 Ocean Editor retained');key('F3');await frames();key('F3','keyup');
  for(const preset of ['LOW','MEDIUM','MAX'] as const){click(`[data-quality="${preset}"]`);await frames(3);check(game.settings.preset===preset&&renderer.getContext().getError()===0,`Graphics menu ${preset} works`);}
  check(JSON.stringify(oldSlots)===JSON.stringify(game.abilities.slots.slice(0,29).map(s=>({key:s.key,code:s.code,number:s.number,shift:s.shift,abilityId:s.abilityId}))),'Original 29 slots remain unchanged');
  click('[data-open-book]');await frames();if(!saved)click('[data-favorite="drowned-king"]');click('.spellbook .overlay-close');
  game.effects.dispose();game.dispose();disposed=true;check(renderer.info.memory.geometries===0&&renderer.info.memory.textures===0&&game.settings.subscriberCount===0,'Full game disposal releases GPU resources/subscriptions');check(errors===0,'DROWNED KING BROWSER COMPLETE');
}catch(e){check(false,String(e));if(!disposed){game.dispose();disposed=true;}}
report.dataset.complete='true';report.textContent=lines.join('\n');window.addEventListener('pagehide',()=>{if(!disposed)game.dispose();});
