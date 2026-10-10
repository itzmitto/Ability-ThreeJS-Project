export const TITAN_CONFIG={cooldown:5,range:25,charge:.58,speed:25,aftermath:1.8,scale:1.05,mineralGlow:.13,fragmentSpeed:10} as const;
export const TITAN_BUDGETS=[{fragments:24,particles:160},{fragments:45,particles:380},{fragments:75,particles:780}] as const;
export interface FistPlate {position:readonly[number,number,number];scale:readonly[number,number,number];bank:number;part:string;}
export const FIST_PLATES:readonly FistPlate[]=[
  {position:[0,0,0],scale:[2.35,1.45,1.25],bank:0,part:'palm'},
  ...[-.92,-.31,.31,.92].flatMap((x,i):FistPlate[]=>[
    {position:[x,.54,-.62],scale:[.59,.71,.76],bank:(i-1.5)*.035,part:'knuckle'},
    {position:[x,-.05,-.99],scale:[.57,.62,.49],bank:0,part:'finger'},
    {position:[x,-.51,-.58],scale:[.53,.47,.66],bank:.05,part:'folded finger'},
  ]),
  {position:[-1.39,-.03,.06],scale:[.65,1.02,.8],bank:-.53,part:'thumb base'},
  {position:[-1.18,-.58,-.42],scale:[.65,.55,.69],bank:-.6,part:'thumb tip'},
  {position:[-.59,-.12,.88],scale:[.79,1.09,.69],bank:-.13,part:'wrist'},
  {position:[.58,-.12,.88],scale:[.79,1.09,.69],bank:.13,part:'wrist'},
  {position:[0,.37,.87],scale:[.69,.57,.66],bank:0,part:'wrist bridge'},
];
