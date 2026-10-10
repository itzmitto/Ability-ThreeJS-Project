import '../src/styles/game.css';
import { InstancedMesh, Mesh, PointLight, Vector3 } from 'three';
import { Game } from '../src/game/Game';
import type { AbilityCastContext } from '../src/abilities/Ability';
const root=document.querySelector<HTMLElement>('#app')!,game=new Game(root),renderer=game.renderer.renderer,query=new URLSearchParams(location.search);
const report=document.createElement('pre');report.id='comet-report';report.style.cssText='position:fixed;left:24px;top:130px;background:#180d07eb;color:#ffdbb0;font:10px monospace;max-height:48vh;overflow:auto;z-index:40;pointer-events:none';root.append(report);
let errors=0,disposed=false;const lines:string[]=[];const check=(ok:boolean,label:string)=>{lines.push(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)errors++;report.textContent=lines.join('\n');};
window.addEventListener('error',e=>check(false,e.message));window.addEventListener('unhandledrejection',e=>check(false,String(e.reason)));
renderer.debug.onShaderError=(gl,_p,v,f)=>check(false,`GLSL ${gl.getShaderInfoLog(v)} ${gl.getShaderInfoLog(f)}`);
const frame=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));const frames=async(n=3)=>{for(let i=0;i<n;i++)await frame();};
const click=(s:string)=>root.querySelector<HTMLElement>(s)!.click();const key=(code:string,type='keydown')=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
const counts=()=>{let objects=0,lights=0;game.sceneManager.scene.traverse(o=>{objects++;if(o instanceof PointLight)lights++;});return {objects,lights,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length,subscriptions:game.settings.subscriberCount,particles:game.effects.particleCount,effects:game.effects.activeCount,ripples:game.world.water.interactions.activeCount};};
const context=(range=28):AbilityCastContext=>{const target=new Vector3(0,0,-range);return {scene:game.sceneManager.scene,player:game.player,camera:game.camera.camera,origin:game.player.visual.getRightHandWorldPosition(),direction:new Vector3(0,0,-1),playerForward:game.player.getForward().clone(),cameraForward:game.targeting.aimDirection.clone(),groundTarget:target,targetPoint:target,targeting:game.targeting,effectManager:game.effects,quality:game.settings,time:0,water:game.world.water.interactions,cameraFeedback:game.camera.addFeedback};};
const finite=()=>{let valid=true;game.sceneManager.scene.traverse(o=>{valid&&=[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()].every(Number.isFinite);if(o instanceof InstancedMesh)valid&&=o.count<=o.instanceMatrix.count&&Array.from(o.instanceMatrix.array).every(Number.isFinite);if(o instanceof Mesh)valid&&=Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite);});return valid;};
let savedFavorite=false;
try{
  await game.player.visual.ready;game.settings.setPreset((query.get('quality')??'LOW') as 'LOW'|'MEDIUM'|'MAX');game.start();await frames(12);
  const oldSlots=game.abilities.slots.slice(0,30).map(s=>({...s}));check(game.abilities.registry.all.length===31,'30 originals plus ability #31');
  click('[data-open-book]');await frames();check(root.querySelectorAll('.spell-card').length===31,'Spellbook displays 31 abilities');
  const search=root.querySelector<HTMLInputElement>('[aria-label="Search spells"]')!;
  for(const term of ['ember','comet','fire','infernal']){search.value=term;search.dispatchEvent(new Event('input'));check(!root.querySelector<HTMLElement>('[data-spell="ember-comet"]')!.closest<HTMLElement>('.spell-card')!.hidden,`Search ${term} finds Ember Comet`);}
  click('[data-category="FIRE"]');check(!root.querySelector<HTMLElement>('[data-spell="ember-comet"]')!.closest<HTMLElement>('.spell-card')!.hidden,'FIRE category finds Ember Comet');
  const card=root.querySelector<HTMLElement>('[data-spell="ember-comet"]')!.closest<HTMLElement>('.spell-card')!;check(card.textContent!.includes('48m')&&card.textContent!.includes('4s'),'Actual range and cooldown metadata visible');
  const star=root.querySelector<HTMLButtonElement>('[data-favorite="ember-comet"]')!;savedFavorite=star.getAttribute('aria-pressed')==='true';if(!savedFavorite)star.click();
  click('[data-spell="ember-comet"]');await frames();check(game.abilities.selectedIndex===30&&game.effects.activeCount===0,'Spellbook equips unbound #31 without casting');
  click('[data-open-wheel]');await frames();const choose=root.querySelector<HTMLButtonElement>('[aria-label="Select EMBER COMET"]');check(!!choose,'Favorited Comet appears in Quick Wheel');choose?.click();await frames();check(game.abilities.selectedAbility?.id==='ember-comet','Wheel selects through existing manager');
  const emitted=game.world.water.interactions.emitted;
  renderer.domElement.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));await frames();renderer.domElement.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
  check(game.effects.activeCount===1&&game.abilities.getCooldownById('ember-comet')>3.8,'World left click casts and begins four-second cooldown');
  let blocked=0;for(let i=0;i<100;i++)if(!game.abilities.cast(context()))blocked++;check(blocked===100&&game.effects.activeCount===1,'100 rapid attempts are rejected during cooldown');
  const phases=new Set<string>(),samples:number[]=[];let peakParticles=0,peakInstances=0,peakCalls=0,peakTriangles=0,previous=performance.now(),valid=true,handDistance=Infinity;
  for(let i=0;i<1200&&game.effects.activeCount;i++){
    await frame();const now=performance.now();samples.push(now-previous);previous=now;
    const bundle=game.sceneManager.scene.getObjectByName('Ember Comet · pooled projectile');if(bundle){phases.add(String(bundle.userData.phase));if(bundle.userData.phase==='charge'){const p=bundle.getObjectByName('Comet projectile');if(p)handDistance=Math.min(handDistance,p.position.distanceTo(game.player.visual.getRightHandWorldPosition()));}}
    peakParticles=Math.max(peakParticles,game.effects.particleCount);peakInstances=Math.max(peakInstances,game.effects.instanceCount);peakCalls=Math.max(peakCalls,renderer.info.render.calls);peakTriangles=Math.max(peakTriangles,renderer.info.render.triangles);if(i%20===0)valid&&=finite();
  }
  check(valid,'Finite meshes and bounded instance transforms');check(handDistance<.05,'Charge follows animated right hand');check(['charge','formation','flight','impact','aftermath'].every(p=>phases.has(p)),'All five visible stages observed in real-time playback');
  check(game.effects.activeCount===0,'Real-time projectile naturally expires');check(game.world.water.interactions.emitted-emitted===3,'Impact submits exactly three owned ocean disturbances');await frames(30);
  check(game.world.water.interactions.activeCount===0,'Water disturbances fully removed');check(renderer.getContext().getError()===0,'WebGL NO_ERROR');
  samples.sort((a,b)=>a-b);lines.push('PROFILE '+JSON.stringify({preset:game.settings.preset,peakParticles,peakInstances,peakCalls,peakTriangles,rafMedian:samples[Math.floor(samples.length*.5)],rafP95:samples[Math.floor(samples.length*.95)],rafMax:samples[samples.length-1]}));
  // Near, medium and clamped maximum range use the actual same effect implementation.
  for(const range of [8,28,100]){
    game.abilities.update(10);check(game.abilities.cast(context(range)),`${range}m input: safe cast`);
    let hit=false;
    for(let step=0;step<180&&game.effects.activeCount;step++){
      game.effects.update(.025,step*.025);game.renderer.render();
      const bundle=game.sceneManager.scene.getObjectByName('Ember Comet · pooled projectile');
      if(bundle?.userData.phase==='impact'){hit=true;check(finite(),`${range}m input: impact buffers finite`);break;}
    }
    check(hit,`${range}m input: projectile reaches actual water impact`);game.effects.update(120,120);await frames(3);
  }
  if(query.has('stress')){
    const baseline=counts();
    for(let cast=0;cast<20;cast++){
      game.abilities.update(10);check(game.abilities.cast(context()),`Sequential cast ${cast+1}`);
      for(let step=0;step<100&&game.effects.activeCount;step++){game.effects.update(.05,step*.05);game.renderer.render();await frame();}
      await frames(3);check(JSON.stringify(counts())===JSON.stringify(baseline),`Cast ${cast+1} restores warmed scene/GPU/subscription baseline`);
    }
    lines.push('COUNTS '+JSON.stringify({baseline,after:counts()}));
  }
  // Regression inputs use real Game frames and the existing player/camera architecture.
  const start=game.player.position.clone();key('KeyW');await frames(60);check(game.player.visual.animationState==='Walk'&&game.player.position.distanceTo(start)>.1,'WASD / Walk works');key('ShiftLeft');await frames(60);check(game.player.visual.animationState==='Run','Shift / Run works');key('KeyW','keyup');key('ShiftLeft','keyup');await frames(180);check(game.player.visual.animationState==='Idle','Idle returns');
  const aim=game.targeting.aimDirection.clone();renderer.domElement.dispatchEvent(new MouseEvent('mousemove',{buttons:2,movementX:20,movementY:8,bubbles:true}));await frames(12);check(!aim.equals(game.targeting.aimDirection),'Mouse camera and targeting remain live');
  key('F3');await frames();key('F3','keyup');check(!root.querySelector<HTMLElement>('.ocean-editor')!.hidden,'F3 Ocean Editor remains available');key('F3');await frames();key('F3','keyup');
  for(const preset of ['LOW','MEDIUM','MAX'] as const){click(`[data-quality="${preset}"]`);await frames(3);check(game.settings.preset===preset&&renderer.getContext().getError()===0,`Live ${preset} quality works`);}
  check(JSON.stringify(oldSlots)===JSON.stringify(game.abilities.slots.slice(0,30)),'All 30 original slots and shortcuts remain unchanged');
  click('[data-open-book]');await frames();if(!savedFavorite)click('[data-favorite="ember-comet"]');click('.spellbook .overlay-close');
  game.effects.dispose();game.dispose();disposed=true;check(renderer.info.memory.geometries===0&&renderer.info.memory.textures===0&&game.settings.subscriberCount===0,'Full teardown releases GPU resources/subscriptions');check(errors===0,'EMBER COMET BROWSER COMPLETE');
}catch(e){check(false,String(e));if(!disposed){game.dispose();disposed=true;}}
report.dataset.complete='true';report.textContent=lines.join('\n');window.addEventListener('pagehide',()=>{if(!disposed)game.dispose();});
