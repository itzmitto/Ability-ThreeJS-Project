import '../src/styles/game.css';
import { Bone, Mesh, Vector3 } from 'three';
import { Game } from '../src/game/Game';
import { PlayerController } from '../src/player/PlayerController';
const query=new URLSearchParams(location.search), game=new Game(document.querySelector<HTMLElement>('#app')!);
await game.player.visual.ready;
const audit:object[]=[];game.player.visual.root.traverse(o=>{if(o instanceof Bone && /Head|Hand$|Foot$|Pelvis|Spine2|UpperArm|Forearm/.test(o.name)) audit.push({name:o.name,position:o.getWorldPosition(new Vector3()).toArray(),quaternion:o.quaternion.toArray()});if(o instanceof Mesh)audit.push({mesh:o.name,vertices:o.geometry.attributes.position.count,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3});});
audit.push({sourceSpeeds:game.player.visual.animation?.sourceSpeeds});
const report=document.createElement('pre');report.id='character-report';report.style.cssText='position:fixed;left:24px;top:140px;z-index:50;background:#090e16d9;padding:10px;color:#b7c9d7;font:11px monospace;max-height:45vh;overflow:auto';report.textContent=JSON.stringify(audit,null,2);document.body.append(report);
let state=query.get('state')??'idle';const controller=new PlayerController(game.player,{isHeld:c=>(state!=='idle'&&state!=='cast'&&c==='KeyW')||(state==='sprint'&&c==='ShiftLeft')});
const controls=document.createElement('div');controls.style.cssText='position:fixed;left:24px;bottom:40px;display:flex;gap:8px;z-index:50';for(const s of ['idle','walk','run','sprint','cast']){const b=document.createElement('button');b.textContent=s;b.onclick=()=>{state=s;if(s==='cast')game.player.visual.beginRightHandCast(1.3,.65);};controls.append(b);}document.body.append(controls);
if(query.has('capture')){game.hud.element.hidden=true;report.hidden=true;controls.hidden=true;}
if(query.get('quality'))game.settings.setPreset(query.get('quality') as 'LOW'|'MEDIUM'|'MAX');
let clock=0,last=performance.now(),raf=0;const angle=Number(query.get('angle')??180)*Math.PI/180,normal=query.has('normal');
const render=(now:number)=>{const delta=Math.min(.033,(now-last)/1000);last=now;clock+=delta;
 if(state==='walk'){game.player.velocity.set(0,0,-1.8);game.player.position.addScaledVector(game.player.velocity,delta);game.player.visual.update(clock,1.8,delta);}else controller.update(delta,0);
 game.world.update(clock,game.player.position,game.player);if(normal)game.camera.update(delta,game.player.position);else{game.camera.camera.position.set(game.player.position.x+Math.sin(angle)*3.1,1.55+game.player.position.y,game.player.position.z+Math.cos(angle)*3.1);game.camera.camera.lookAt(game.player.position.x,1.03+game.player.position.y,game.player.position.z);}
 game.renderer.render();raf=requestAnimationFrame(render);};raf=requestAnimationFrame(render);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);game.dispose();});
