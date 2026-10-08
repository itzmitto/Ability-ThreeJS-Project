import { BloodEclipseSurface } from "./BloodEclipseSurface";
import { BloodSplashSheets } from "./BloodSplashSheets";
import { Group } from "three";
import { ObjectPool } from "../../effects/ObjectPool";
import { BloodCastingAura } from "./BloodCastingAura";
import { CrimsonTargetField } from "./CrimsonTargetField";
import { BloodRibbonSystem } from "./BloodRibbonSystem";
import { BloodEclipseCore } from "./BloodEclipseCore";
import { BloodLanceBarrage } from "./BloodLanceBarrage";
import { BloodLanceTrails } from "./BloodLanceTrails";
import { BloodLanceImpact } from "./BloodLanceImpact";
import { CrimsonExecution } from "./CrimsonExecution";
import { CrimsonImpact } from "./CrimsonImpact";
import { BloodTidalWave } from "./BloodTidalWave";
import { BloodDropletSystem } from "./BloodDropletSystem";
import { BloodMistSystem } from "./BloodMistSystem";
import { BloodAftermath } from "./BloodAftermath";
import { BloodLightController } from "./BloodLightController";
export class BloodVisuals {
  readonly surface = new BloodEclipseSurface();
  readonly sheets = new BloodSplashSheets();
  readonly root = new Group();
  readonly aura = new BloodCastingAura();
  readonly field = new CrimsonTargetField();
  readonly ascension = new BloodRibbonSystem(0);
  readonly eclipse = new BloodEclipseCore();
  readonly orbit = new BloodRibbonSystem(1);
  readonly lance = new BloodLanceBarrage();
  readonly trails = new BloodLanceTrails();
  readonly lanceImpact = new BloodLanceImpact();
  readonly execution = new CrimsonExecution();
  readonly executionStreams = new BloodRibbonSystem(2);
  readonly impact = new CrimsonImpact();
  readonly splash = new BloodRibbonSystem(3);
  readonly tide = new BloodTidalWave();
  readonly droplets = new BloodDropletSystem();
  readonly mist = new BloodMistSystem();
  readonly aftermath = new BloodAftermath();
  readonly lights = new BloodLightController();
  constructor() {
    this.root.name = "SANGUINE ECLIPSE";
    this.root.add(
      this.surface.mesh,
      this.sheets.mesh,
      this.aura.root,
      this.field.mesh,
      this.ascension.mesh,
      this.eclipse.mesh,
      this.orbit.mesh,
      this.lance.mesh,
      this.trails.mesh,
      this.lanceImpact.mesh,
      this.execution.mesh,
      this.executionStreams.mesh,
      this.impact.mesh,
      this.splash.mesh,
      this.tide.mesh,
      this.droplets.mesh,
      this.mist.mesh,
      this.aftermath.mesh,
    );
  }
  reset(): void {
    this.root.removeFromParent();
    this.root.visible = false;
    this.lights.reset();
    this.lance.reset();
  }
  dispose(): void {
    this.reset();
    for (const system of [
      this.surface,
      this.sheets,
      this.aura,
      this.field,
      this.ascension,
      this.eclipse,
      this.orbit,
      this.lance,
      this.trails,
      this.lanceImpact,
      this.execution,
      this.executionStreams,
      this.impact,
      this.splash,
      this.tide,
      this.droplets,
      this.mist,
      this.aftermath,
      this.lights,
    ])
      system.dispose();
    this.root.clear();
  }
}
export class BloodResourceManager {
  readonly pool = new ObjectPool(
    () => new BloodVisuals(),
    (v) => v.reset(),
    (v) => v.dispose(),
    2,
  );
  dispose(): void {
    this.pool.dispose();
  }
}
