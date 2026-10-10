import { Vector3 } from 'three';
import { SceneManager } from './SceneManager';
import { RendererManager } from './RendererManager';
import { CameraController } from './CameraController';
import { InputManager } from './InputManager';
import { PerformanceManager } from './PerformanceManager';
import { GraphicsSettings } from '../quality/GraphicsSettings';
import { World } from '../world/World';
import { Player } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { TargetingSystem } from '../targeting/TargetingSystem';
import { AbilityManager } from '../abilities/AbilityManager';
import type { AbilityCastContext } from '../abilities/Ability';
import { EffectManager } from '../effects/EffectManager';
import { HUD } from '../ui/HUD';
import { GlacialEruption } from '../abilities/ice/GlacialEruption';
import { FrostLance } from '../abilities/frostLance/FrostLance';
import { SandReaper } from '../abilities/sandReaper/SandReaper';
import { AstralChainstorm } from '../abilities/astralChainstorm/AstralChainstorm';
import { AbyssalMoonfall } from '../abilities/abyssalMoonfall/AbyssalMoonfall';
import { DrownedKing } from '../abilities/drownedKing/DrownedKing';
import { Riftreaver } from '../abilities/riftreaver/Riftreaver';
import { TidalSerpent } from '../abilities/tidalSerpent/TidalSerpent';
import { TitanFist } from '../abilities/titanFist/TitanFist';
import { Skybreaker } from '../abilities/skybreaker/Skybreaker';
import { EmberComet } from '../abilities/emberComet/EmberComet';
import { TempestBreak } from '../abilities/wind/TempestBreak';
import { HeavensVerdict } from '../abilities/lightning/HeavensVerdict';
import { Megiddo } from '../abilities/light/Megiddo';
import { AbyssalFlame } from '../abilities/fire/AbyssalFlame';
import { Worldrend } from '../abilities/void/Worldrend';
import { TempestCataclysm } from '../abilities/stormDragon/TempestCataclysm';
import { SpectralBreak } from '../abilities/spectral/SpectralBreak';
import { Dragonfire } from '../abilities/dragonfire/Dragonfire';
import { PrismRavenstorm } from '../abilities/prismRavenstorm/PrismRavenstorm';
import { KrakenCrown } from '../abilities/kraken/KrakenCrown';
import { ChronoFracture } from '../abilities/chrono/ChronoFracture';
import { ShadowColossus } from '../abilities/shadowColossus/ShadowColossus';
import { SeraphicDeluge } from '../abilities/seraphicDeluge/SeraphicDeluge';
import { PrismaticCathedral } from '../abilities/prismaticCathedral/PrismaticCathedral';
import { HeavenlyArsenal } from '../abilities/heavenlyArsenal/HeavenlyArsenal';
import { CryoCollapse } from '../abilities/cryo/CryoCollapse';
import { Thunderlance } from '../abilities/thunderlance/Thunderlance';
import { SolarNova } from '../abilities/solar/SolarNova';
import { GlassTempest } from '../abilities/glass/GlassTempest';
import { GravityCrush } from '../abilities/gravity/GravityCrush';
import { Worldroot } from '../abilities/nature/Worldroot';
import { Earthbreaker } from '../abilities/earth/Earthbreaker';
import { TidalSovereign } from '../abilities/water/TidalSovereign';
import { SanguineEclipse } from '../abilities/blood/SanguineEclipse';

/** Composition root only: systems own their logic, resources, and subscriptions. */
export class Game {
  readonly settings = new GraphicsSettings();
  readonly sceneManager = new SceneManager();
  readonly player = new Player(this.sceneManager.scene);
  readonly abilities = new AbilityManager();
  readonly effects = new EffectManager();
  readonly performance = new PerformanceManager();
  readonly renderer: RendererManager;
  readonly input: InputManager;
  readonly camera: CameraController;
  readonly world: World;
  readonly targeting: TargetingSystem;
  readonly hud: HUD;
  private readonly playerController: PlayerController;
  private elapsed = 0;
  private previousTime = 0;
  private raf = 0;
  private running = false;
  private uiElapsed = 0;
  private readonly characterAim=new Vector3();
  constructor(root: HTMLElement) {
    const canvas = document.createElement('canvas');
    this.input = new InputManager(canvas);
    this.camera = new CameraController(this.input, this.settings, this.player.position);
    this.renderer = new RendererManager(root, this.sceneManager.scene, this.camera.camera, this.settings, canvas);
    this.playerController = new PlayerController(this.player, this.input);
    this.world = new World(this.sceneManager.scene, this.settings);
    this.player.visual.configureEnvironment(this.settings,(x,z)=>this.world.water.interactions.getSurfaceHeight(x,z));
    this.renderer.beforeRender=()=>this.world.water.prepareReflection(this.renderer.renderer,this.camera.camera);
    this.targeting = new TargetingSystem(this.sceneManager.scene);
    const glacial = new GlacialEruption();
    this.abilities.registry.register(glacial);
    this.abilities.assignSlot(0, glacial.id);
    const tempest = new TempestBreak();
    this.abilities.registry.register(tempest);
    this.abilities.assignSlot(1, tempest.id);
    const verdict = new HeavensVerdict();
    this.abilities.registry.register(verdict);
    this.abilities.assignSlot(2, verdict.id);
    const megiddo = new Megiddo();
    this.abilities.registry.register(megiddo);
    this.abilities.assignSlot(3, megiddo.id);
    const abyssal = new AbyssalFlame();
    this.abilities.registry.register(abyssal);
    this.abilities.assignSlot(4, abyssal.id);
    const worldrend = new Worldrend();
    this.abilities.registry.register(worldrend);
    this.abilities.assignSlot(5, worldrend.id);
    const cataclysm = new TempestCataclysm();
    this.abilities.registry.register(cataclysm);
    this.abilities.assignSlot(6, cataclysm.id);
    const sanguine = new SanguineEclipse();
    this.abilities.registry.register(sanguine);
    this.abilities.assignSlot(7, sanguine.id);
    const spectral = new SpectralBreak();
    this.abilities.registry.register(spectral);
    this.abilities.assignSlot(8, spectral.id);
    const earthbreaker = new Earthbreaker();
    this.abilities.registry.register(earthbreaker);
    this.abilities.assignSlot(9, earthbreaker.id);
    const tidal = new TidalSovereign();
    this.abilities.registry.register(tidal);
    this.abilities.assignSlot(10, tidal.id);
    const glass = new GlassTempest();
    this.abilities.registry.register(glass);
    this.abilities.assignSlot(11, glass.id);
    const gravity = new GravityCrush();
    this.abilities.registry.register(gravity);
    this.abilities.assignSlot(12, gravity.id);
    const rootSpell = new Worldroot();
    this.abilities.registry.register(rootSpell);
    this.abilities.assignSlot(13, rootSpell.id);
    const cryo = new CryoCollapse();
    this.abilities.registry.register(cryo);
    this.abilities.assignSlot(14, cryo.id);
    const thunderlance = new Thunderlance();
    this.abilities.registry.register(thunderlance);
    this.abilities.assignSlot(15, thunderlance.id);
    const solar = new SolarNova();
    this.abilities.registry.register(solar);
    this.abilities.assignSlot(16, solar.id);
    const heavenlyArsenal = new HeavenlyArsenal();
    this.abilities.registry.register(heavenlyArsenal);
    this.abilities.assignSlot(17, heavenlyArsenal.id);
    const prismaticCathedral = new PrismaticCathedral();
    this.abilities.registry.register(prismaticCathedral);
    this.abilities.assignSlot(18, prismaticCathedral.id);
    const seraphicDeluge = new SeraphicDeluge();
    this.abilities.registry.register(seraphicDeluge);
    this.abilities.assignSlot(19, seraphicDeluge.id);
    const shadowColossus = new ShadowColossus();
    this.abilities.registry.register(shadowColossus);
    this.abilities.assignSlot(20, shadowColossus.id);
    const chronoFracture = new ChronoFracture();
    this.abilities.registry.register(chronoFracture);
    this.abilities.assignSlot(21, chronoFracture.id);
    const krakenCrown = new KrakenCrown();
    this.abilities.registry.register(krakenCrown);
    this.abilities.assignSlot(22, krakenCrown.id);
    const prismRavenstorm = new PrismRavenstorm();
    this.abilities.registry.register(prismRavenstorm);
    this.abilities.assignSlot(23, prismRavenstorm.id);
    const dragonfire = new Dragonfire();
    this.abilities.registry.register(dragonfire);
    this.abilities.assignSlot(24, dragonfire.id);
    const frostLance = new FrostLance();
    this.abilities.registry.register(frostLance);
    this.abilities.assignSlot(25, frostLance.id);
    const sandReaper = new SandReaper();
    this.abilities.registry.register(sandReaper);
    this.abilities.assignSlot(26, sandReaper.id);
    const chainstorm = new AstralChainstorm();
    this.abilities.registry.register(chainstorm);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:chainstorm.id});
    const moonfall = new AbyssalMoonfall();
    this.abilities.registry.register(moonfall);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:moonfall.id});
    const drownedKing=new DrownedKing();
    this.abilities.registry.register(drownedKing);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:drownedKing.id});
    const emberComet = new EmberComet();
    this.abilities.registry.register(emberComet);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:emberComet.id});
    const riftreaver = new Riftreaver();
    this.abilities.registry.register(riftreaver);
    riftreaver.prepare(this.renderer.renderer,this.camera.camera,this.sceneManager.scene,this.settings);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:riftreaver.id});
    const tidalSerpent=new TidalSerpent();
    this.abilities.registry.register(tidalSerpent);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:tidalSerpent.id});
    const titanFist=new TitanFist();this.abilities.registry.register(titanFist);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:titanFist.id});
    const skybreaker=new Skybreaker();this.abilities.registry.register(skybreaker);
    this.abilities.slots.push({key:'',code:'',number:null,abilityId:skybreaker.id});
    this.hud = new HUD(root, this.abilities, this.settings, this.targeting, this.input, this.world.water);
    canvas.tabIndex = 0;
    document.addEventListener('visibilitychange', this.visibilityChanged);
  }
  start(): void { if (this.running) return; this.running = true; this.previousTime = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  private frame = (now: number): void => {
    if (!this.running) return;
    const rawDelta = (now - this.previousTime) / 1000;
    const delta = Math.min(rawDelta, 0.05);
    this.previousTime = now; this.elapsed += delta;
    this.player.visual.setAimDirection(this.camera.camera.getWorldDirection(this.characterAim));
    this.playerController.update(delta, this.camera.yaw);
    this.camera.update(delta, this.player.position);
    this.targeting.update(this.camera.camera, this.player.position);
    this.abilities.update(delta);
    this.abilities.handleInput(this.input, this.makeCastContext);
    this.effects.update(delta, this.elapsed);
    this.world.update(this.elapsed, this.player.position, this.player);
    if (this.input.wasPressed('F3')) this.hud.toggleDebug();
    if (this.input.wasPressed('KeyP')) { this.hud.performance.toggle(); this.hud.graphics.syncPerformance(this.hud.performance.visible); }
    if (this.input.wasPressed('KeyT')) { this.targeting.markerEnabled = !this.targeting.markerEnabled; this.hud.graphics.syncGroundMarker(this.targeting.markerEnabled); }
    this.uiElapsed += delta;
    if (this.uiElapsed >= 0.1) {
      this.hud.update(this.input.pointerLocked);
      this.hud.updateDebug(this.player, this.camera, this.targeting);
      this.uiElapsed = 0;
    }
    this.renderer.render();
    if (this.performance.sample(rawDelta, this.renderer.renderer, this.world.atmosphere.count + this.world.water.spray.count + this.effects.particleCount, this.effects.instanceCount)) this.hud.performance.update(this.performance.stats);
    this.input.endFrame();
    this.raf = requestAnimationFrame(this.frame);
  };
  private makeCastContext = (): AbilityCastContext => ({
    player: this.player, scene: this.sceneManager.scene, camera: this.camera.camera,
    origin: this.player.visual.getRightHandWorldPosition(),
    direction: this.targeting.aimDirection.clone(), playerForward: this.player.getForward().clone(),
    cameraForward: this.camera.camera.getWorldDirection(new Vector3()), targetPoint: this.targeting.targetPoint.clone(),
    groundTarget: this.targeting.getGroundTarget()?.clone() ?? null,
    targeting: this.targeting, effectManager: this.effects, quality: this.settings, time: this.elapsed,
    cameraFeedback: this.camera.addFeedback,
    skyFraming: this.camera.requestSkyFraming,
    water: this.world.water.interactions,
  });
  private visibilityChanged = (): void => {
    cancelAnimationFrame(this.raf);
    if (!document.hidden && this.running) { this.previousTime = performance.now(); this.performance.reset(); this.raf = requestAnimationFrame(this.frame); }
  };
  dispose(): void {
    this.running = false; cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.visibilityChanged);
    this.hud.dispose(); this.effects.dispose(); this.abilities.dispose(); this.targeting.dispose();
    this.player.dispose(); this.world.dispose(); this.camera.dispose(); this.input.dispose();
    this.renderer.dispose(); this.settings.dispose(); this.sceneManager.dispose();
  }
}
