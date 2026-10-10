import { createSandReaperGeometry } from '../sandReaper/SandReaperGeometry';
import { SAND_REAPER_DEFAULTS } from '../sandReaper/SandReaperConfig';
import { SKY_CONFIG as C,SKY_BUDGETS } from './SkybreakerConfig';
/** Reuse the established closed knife-section sweep, with clean air-pressure proportions, not sandstone perturbations. */
export function createPressureBlades(){return SKY_BUDGETS.map(q=>({
  body:createSandReaperGeometry({...SAND_REAPER_DEFAULTS,bladeLength:C.bladeLength,bladeWidth:C.bladeWidth,bladeThickness:.27,crescentCurvature:1.8,facetRoughness:.006},q.segments),
  edge:createSandReaperGeometry({...SAND_REAPER_DEFAULTS,bladeLength:C.bladeLength,bladeWidth:.052,bladeThickness:.028,crescentCurvature:1.8,facetRoughness:0},q.segments),
}));}
