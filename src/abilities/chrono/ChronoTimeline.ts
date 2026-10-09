import {ease} from '../elemental/ElementalVisuals';
const forward=(t:number):number=>t+3*Math.pow(Math.max(0,t-1.5),3);
export const FROZEN_CLOCK_TIME=forward(2.4);
/** Effect-local visual time; never supplied to Game, cooldowns, player, or persistent water. */
export function chronoVisualTime(age:number):number{
  if(age<2.4)return forward(age);
  if(age<3.1)return FROZEN_CLOCK_TIME;
  if(age<4.2)return FROZEN_CLOCK_TIME-(FROZEN_CLOCK_TIME-1.15)*ease((age-3.1)/1.1);
  if(age>=5.8)return 1.15+1.6*1.2+1.3*1.3*3+(age-5.8)*.22;
  return 1.15+(age-4.2)*1.2+Math.pow(Math.max(0,age-4.5),2)*3;
}
export function chronoTimeline(age:number){
  return {time:chronoVisualTime(age),build:ease((age-.7)/1),freeze:age>=2.4&&age<3.1?1:0,blue:ease((age-3.1)/1.1),fracture:ease((age-4.15)/.85),collapse:ease((age-5)/.65),fade:1-ease((age-7.3)/.7)};
}
export type ChronoState=ReturnType<typeof chronoTimeline>;
