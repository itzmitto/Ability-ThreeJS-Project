// Adapted from KrakenAbility.js, Copyright (c) 2026 mohamedachrefelouafi, MIT.
// License: public/licenses/LinearAbilityExtThreeJS.txt
import { clamp01, ease } from '../elemental/ElementalVisuals';
import { KRAKEN } from './KrakenConfig';
export interface KrakenPose { lean: number; curl: number; wave: number; twist: number; flash: number; squash: number; }
export interface StrikeBeat { time: number; finale: boolean; wind: number; fit: number; }
const rear = .5, strike = .39, hold = .17, peel = .55;
const out = (t:number) => 1 - Math.pow(1-clamp01(t),3);
const mix = (a:number,b:number,t:number) => a+(b-a)*t;
/** Donor's last-completed-cycle handover: no interrupted peel or teleported finale pose. */
export function strikeBeat(t:number,birth:number,whip:boolean,phase:number,beat:StrikeBeat):void {
  const period = whip ? 1.18 : 1.88;
  const fit = Math.min(1,period/(rear+strike+hold+peel));
  const windup=(rear+strike)*fit, tail=(hold+peel)*fit;
  const first=birth+.84+windup+phase*period*.45;
  const n=Math.floor((KRAKEN.finale-tail-windup-first)/period);
  const handover=n>=0?first+n*period+tail:birth+.84;
  beat.fit=fit;
  if(t>=handover){beat.time=KRAKEN.finale;beat.finale=true;beat.wind=clamp01((KRAKEN.finale-handover)/windup);return;}
  const current=first+Math.max(0,Math.floor((t-first)/period))*period;
  beat.time=t<current+tail?current:current+period;beat.finale=false;beat.wind=1;
}
/** Same continuous COIL → IDLE → REAR → WHIP → PRESS → PEEL curvature poses as donor. */
export function solveKrakenPose(t:number,birth:number,seed:number,beat:StrikeBeat,p:KrakenPose):void {
  const emerge=clamp01((t-birth)/.84), wave=.13+seed*.085;
  const idleLean=.35, idleCurl=1.55, rearLean=-.92, rearCurl=.45;
  p.twist=(seed-.5)*.62;p.squash=1;p.flash=0;
  if(emerge<1){const x=out(emerge);p.lean=mix(.25,idleLean,x);p.curl=mix(5.15,idleCurl,x);p.wave=mix(.04,wave,x);p.twist*=mix(1.6,1,x);p.squash=mix(1.35,1,x);return;}
  const d=t-beat.time, budget=(rear+strike)*beat.fit*beat.wind;
  const strikeDur=Math.max(.02,Math.min(strike*beat.fit,budget*.6));
  const rearDur=Math.max(.02,budget-strikeDur), holdDur=hold*beat.fit;
  if(d<-(rearDur+strikeDur)){p.lean=idleLean;p.curl=idleCurl;p.wave=wave;}
  else if(d<-strikeDur){const x=out((d+rearDur+strikeDur)/rearDur);p.lean=mix(idleLean,rearLean,x);p.curl=mix(idleCurl,rearCurl,x);p.wave=mix(wave,.035,x);}
  else if(d<0){const x=clamp01(1+d/strikeDur)**2;p.lean=mix(rearLean,Math.PI,x);p.curl=mix(rearCurl,0,x);p.wave=mix(.035,0,x);p.squash=1+x*.12;}
  else if(d<holdDur){const x=clamp01(d/holdDur);p.lean=Math.PI;p.curl=Math.exp(-x*5)*Math.sin(d*28)*.025;p.wave=0;p.flash=(1-x)**2;p.squash=1+.072*(1-x);}
  else {const x=ease((d-holdDur)/(peel*beat.fit));p.lean=mix(Math.PI,idleLean,x);p.curl=mix(0,idleCurl,x);p.wave=mix(0,wave,x);}
  // After the last peel completes, uncoil into a drawn-back curl before sinking.
  const withdraw=ease((t-8.65)/1.25);
  p.lean=mix(p.lean,.1,withdraw);p.curl=mix(p.curl,3.7,withdraw);p.wave*=1-withdraw;
}
/** Exactly the shader's 12 trapezoid samples, used for strike VFX alignment. */
export function tentacleTip(length:number,lean:number,curl:number,wave:number,phase:number,freq:number,out:{x:number;y:number}):void {
  let x=0,y=0,px=0,py=1;
  for(let i=1;i<=12;i++){const s=i/12,a=lean*s+curl*s*s+wave*Math.sin(s*freq*Math.PI*2+phase)*s;
    const cx=Math.sin(a),cy=Math.cos(a);x+=(px+cx)/24;y+=(py+cy)/24;px=cx;py=cy;}
  out.x=x*length;out.y=y*length;
}
