import { Vector3 } from "three";
export const LANCE_TIMES = Float32Array.from({ length: 28 }, (_, i) =>
  i < 8
    ? [6, 6.14, 6.65, 6.78, 6.91, 7.3, 7.75, 8.03][i]
    : 6.35 + ((i - 8) / 20) * 1.8,
);
export function lanceStart(i: number, t: number, result: Vector3): Vector3 {
  const a = i * 2.399963 + t * 0.075,
    r = 8.6 + Math.sin(i * 2.1) * 1.5;
  return result.set(
    Math.cos(a) * r,
    12.5 + Math.sin(i * 1.7) * 3.5,
    Math.sin(a) * r - 16,
  );
}
export function lanceDestination(i: number, result: Vector3): Vector3 {
  const a = i * 2.399963,
    r = 2 + Math.sin(i * 1.3) * 2.5;
  return result.set(Math.cos(a) * r, 0.03, Math.sin(a) * r);
}
export const LANCE_GLSL = `float launch(float id){if(id<.5)return 6.0;if(id<1.5)return 6.14;if(id<2.5)return 6.65;if(id<3.5)return 6.78;if(id<4.5)return 6.91;if(id<5.5)return 7.3;if(id<6.5)return 7.75;if(id<7.5)return 8.03;return 6.35+(id-8.0)/20.0*1.8;}
vec3 lanceOrigin(float id,float time){float a=id*2.399963+time*.075,r=8.6+sin(id*2.1)*1.5;return vec3(cos(a)*r,12.5+sin(id*1.7)*3.5,sin(a)*r-16.0);}
vec3 lanceEnd(float id){float a=id*2.399963,r=2.0+sin(id*1.3)*2.5;return vec3(cos(a)*r,.03,sin(a)*r);}`;
