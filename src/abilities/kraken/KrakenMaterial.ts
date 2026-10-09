// Adapted from achrefelouafi/LinearAbilityExtThreeJS.
// Copyright (c) 2026 mohamedachrefelouafi — MIT; see public/licenses/LinearAbilityExtThreeJS.txt.
import {ShaderMaterial,Color,Vector3,DoubleSide,NormalBlending,UniformsLib,UniformsUtils} from 'three';
import {krakenNoise} from './KrakenNoise';
const KRAKEN_VERTEX = /* glsl */ `
  attribute vec4 aShape;  // x length (m), y base radius (m), z lean A, w curl C
  attribute vec4 aWave;   // x amplitude, y phase, z twist, w frequency
  attribute vec4 aLife;   // x emerged 0..1, y strike flash, z seed, w sink (m)

  uniform float uTime;
  #include <fog_pars_vertex>

  varying vec2  vUv;
  varying vec3  vWorld;
  varying vec3  vNormalW;
  varying vec3  vView;
  varying float vT;
  varying float vGirth;
  varying float vSeed;
  varying float vEmerge;
  varying float vFlash;

  float angleAt(float s) {
    return aShape.z * s +
           aShape.w * s * s +
           aWave.x * sin(s * aWave.w * 6.28318530718 + aWave.y) * s;
  }

  // Centreline offset at t, for a unit-length arm: x along the bend, y up.
  vec2 centreAt(float t) {
    float dt = t / float(12);
    float th = angleAt(0.0);
    vec2 prev = vec2(sin(th), cos(th));
    vec2 acc = vec2(0.0);
    for (int i = 1; i <= 12; i++) {
      float s = dt * float(i);
      float a = angleAt(s);
      vec2 cur = vec2(sin(a), cos(a));
      acc += (prev + cur) * 0.5 * dt;
      prev = cur;
    }
    return acc;
  }

  void main() {
    vUv = uv;
    vT = position.y;
    vGirth = length(position.xz);
    vSeed = aLife.z;
    vEmerge = aLife.x;
    vFlash = aLife.y;

    float t = position.y;
    float th = angleAt(t);

    // The frame the cross-section is carried on. It is exact for a planar bend:
    // the tangent is the direction the integral was accumulating, the in-plane
    // normal is that tangent turned a quarter turn, and the binormal never
    // moves — which is why this needs no rotation-minimising pass.
    vec3 T = vec3(sin(th), cos(th), 0.0);
    vec3 N = vec3(cos(th), -sin(th), 0.0);
    vec3 B = vec3(0.0, 0.0, 1.0);

    // Roll the section around the tangent as it climbs, so the sucker face
    // turns with the arm instead of facing one fixed way up a curling limb.
    float roll = aWave.z * t;
    float cr = cos(roll);
    float sr = sin(roll);
    vec2 off = position.xz * aShape.y;
    vec2 rolled = vec2(off.x * cr - off.y * sr, off.x * sr + off.y * cr);
    vec2 nrm = vec2(normal.x * cr - normal.z * sr, normal.x * sr + normal.z * cr);

    vec2 spine = centreAt(t) * aShape.x;
    vec3 local = vec3(spine.x, spine.y - aLife.w, 0.0) + N * rolled.x + B * rolled.y;
    vec3 localN = normalize(N * nrm.x + T * (normal.y * aShape.y / max(.01,aShape.x)) + B * nrm.y);

    vec4 world;
    #ifdef USE_INSTANCING
      // The instance matrix is a translation and a yaw only — the length and the
      // thickness are attributes, not scales, precisely so the bend is not
      // squashed by an anisotropic transform on the way out. That also means it
      // is rigid, and the normal needs no inverse transpose.
      world = modelMatrix * instanceMatrix * vec4(local, 1.0);
      localN = mat3(instanceMatrix) * localN;
    #else
      world = modelMatrix * vec4(local, 1.0);
    #endif

    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * localN);
    vView = cameraPosition - world.xyz;

    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const KRAKEN_FRAGMENT = /* glsl */ `
  uniform float uTime;
  #include <fog_pars_fragment>
  uniform float uNoiseOctaves;
  uniform vec3  uSunDir;

  uniform vec3  uColorSkin;
  uniform vec3  uColorDeep;
  uniform vec3  uColorBelly;
  uniform vec3  uColorFlush;
  uniform vec3  uColorBiolume;
  uniform vec3  uColorSucker;
  uniform vec3  uColorRim;

  uniform float uMottle;
  uniform float uMottleScale;
  uniform float uMottleWarp;
  uniform float uBellyBlend;
  uniform float uDepthShade;

  uniform float uChroma;
  uniform float uChromaScale;
  uniform float uChromaSpeed;
  uniform float uChromaSharp;
  uniform float uChromaWarp;

  uniform float uSuckers;
  uniform float uSuckerDensity;
  uniform float uSuckerSize;
  uniform float uSuckerSpan;
  uniform float uRowSpacing;
  uniform float uSuckerRelief;
  uniform float uSuckerGlow;
  uniform float uSuckerStart;

  uniform float uBiolume;
  uniform float uBiolumeScale;
  uniform float uBiolumeSpeed;
  uniform float uBiolumePulse;

  uniform float uSpecular;
  uniform float uGloss;
  uniform float uEnvIntensity;
  uniform float uRim;
  uniform float uRimPower;
  uniform float uTranslucency;

  uniform float uFrontRough;
  uniform float uFrontWidth;
  uniform float uFrontGlow;
  uniform float uFlashGain;

  uniform float uGlow;
  uniform float uOpacity;
  uniform float uGlobalGlow;

  varying vec2  vUv;
  varying vec3  vWorld;
  varying vec3  vNormalW;
  varying vec3  vView;
  varying float vT;
  varying float vGirth;
  varying float vSeed;
  varying float vEmerge;
  varying float vFlash;

  ${krakenNoise}
  

  #define TAU 6.28318530718
  #define PI 3.14159265359

  vec2 equirectUv(vec3 dir) {
    return vec2(atan(dir.z, dir.x) * 0.15915494 + 0.5,
                asin(clamp(dir.y, -1.0, 1.0)) * 0.31830989 + 0.5);
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vView);
    if (dot(N, V) < 0.0) N = -N;
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    /* ---- how far out of the rift this arm has come ---- */
    // Identical construction to the Pyre Crown's combustion front, and for the
    // same reason: an arm that is *revealed* along its own length climbs out of
    // the ground, where an arm that is translated up slides out of a hole.
    // Fully hidden arms need no skin evaluation. At full emergence the noisy
    // front is always >= 1, so its simplex sample has no visible contribution.
    if (vEmerge <= 0.0 || uOpacity < 0.004) discard;
    float breaching = 0.0;
    if (vEmerge < 1.0) {
      float ragged = snoise01(vec3(vUv.x * 3.0, vT * 6.0, vSeed * 7.0)) * uFrontRough;
      float front = vEmerge * (1.0 + uFrontRough) - ragged;
      if (vT > front) discard;
      breaching = smoothstep(front - uFrontWidth, front, vT) *
                  (1.0 - smoothstep(0.985, 1.0, vEmerge));
    }

    /* ---- where we are on the arm ---- */
    float aw = vUv.x * TAU;
    if (aw > PI) aw -= TAU;              // -π..π, 0 on the sucker face
    vec2 dir = vec2(cos(aw), sin(aw));   // seam-free coordinate around the arm
    float ventral = 0.5 + 0.5 * cos(aw); // 1 underneath, 0 over the back

    /* ---- mottled skin ---- */
    vec3 mp = vec3(dir * 1.6, vT * uMottleScale + vSeed * 4.0);
    float warp = fbm3(mp * 0.7) * uMottleWarp;
    float mottle = mix(0.5, fbm4(mp + warp) * 0.5 + 0.5, uMottle);

    vec3 skin = mix(uColorDeep, uColorSkin, mottle);
    // Pale underneath, and paler still right on the sucker face.
    skin = mix(skin, uColorBelly, pow(ventral, 1.6) * uBellyBlend);
    // Dark where it leaves the rift: the base of the arm is still in the hole.
    skin *= mix(1.0 - uDepthShade, 1.0, smoothstep(0.0, 0.22, vT));

    /* ---- chromatophore waves running the length of it ---- */
    // Sped up by the strike flash, so an arm that has just hit the ground
    // visibly floods before it settles back.
    float speed = uChromaSpeed * (1.0 + vFlash * 2.5);
    float band = sin((vT * uChromaScale - uTime * speed + mottle * uChromaWarp) * TAU);
    float flush = pow(max(0.0, band), uChromaSharp) * uChroma * (0.35 + 0.65 * vFlash + 0.3);
    skin = mix(skin, uColorFlush, clamp(flush, 0.0, 1.0));

    /* ---- two staggered rows of suckers down the ventral face ---- */
    float cup = 0.0;
    float rim = 0.0;
    if (uSuckers > 0.001) {
      float across = aw / max(0.05, uRowSpacing);
      float rowIdx = floor(across) + 0.5;          // rows sit at ±0.5
      float fr = across - rowIdx;
      // Packed tighter toward the point, and staggered row against row — which
      // is what makes it read as an arm rather than as a strip of polka dots.
      float along = pow(vT, 0.8) * uSuckerDensity + rowIdx;
      float fs = fract(along) - 0.5;

      float dd = length(vec2(fs, fr)) * 2.0;
      // Wider where the arm is thick, so the rows shrink with the limb they
      // are sitting on instead of crawling to the point at full size.
      float size = uSuckerSize * clamp(0.55 + vGirth * 0.6, 0.35, 1.0);
      float mask = step(abs(rowIdx), 0.9) *                    // the two inner rows only
                   (1.0 - smoothstep(uSuckerSpan * 0.4, uSuckerSpan, abs(aw))) *
                   smoothstep(uSuckerStart, uSuckerStart + 0.06, vT) *
                   (1.0 - smoothstep(0.86, 1.0, vT)) * uSuckers;

      cup = (1.0 - smoothstep(size - 0.22, size, dd)) * mask;
      rim = ((1.0 - smoothstep(size - 0.14, size, dd)) - (1.0 - smoothstep(size * 0.6 - 0.18, size * 0.6, dd))) * mask;
    }

    /* ---- shading ---- */
    vec3 L = -uSunDir;
    // The cups are relief, not paint: they take light out of the bowl and put a
    // lit lip around it. Cheaper than perturbing the normal and, on something
    // this curved, indistinguishable.
    float relief = 1.0 - cup * uSuckerRelief + rim * uSuckerRelief * 0.8;
    float lambert = clamp(dot(N, L), 0.0, 1.0);
    float wrap = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0); // soft terminator — flesh scatters
    float diffuse = (0.22 + 0.78 * mix(lambert, wrap * wrap, 0.6)) * relief;

    vec3 refl = reflect(-V, N);
    // Analytic cold sky / black ocean fallback; no donor HDR texture dependency.
    vec3 env = mix(vec3(.006,.013,.025), vec3(.11,.19,.27), smoothstep(-.1,.65,refl.y));
    env += vec3(.25,.36,.44)*pow(max(0.,dot(refl,L)),64.);
    env *= uEnvIntensity;
    vec3 H = normalize(L + V);
    float spec = pow(clamp(dot(N, H), 0.0, 1.0), uGloss) * uSpecular * relief;
    float fres = pow(1.0 - ndv, uRimPower);

    // Light coming through the thin end of the arm.
    float thin = smoothstep(0.45, 1.0, vT) * pow(clamp(dot(-N, L) * 0.5 + 0.5, 0.0, 1.0), 2.0);

    vec3 color = skin * diffuse;
    color += env * (0.25 + 0.75 * fres) * skin;
    color += vec3(spec);
    color += uColorRim * fres * uRim;
    color += uColorFlush * thin * uTranslucency;

    /* ---- what light it makes itself ---- */
    // Bioluminescence: veins crawling up the arm, and the sucker rims, which is
    // where a curling limb reads brightest — the inside of the curl is the side
    // that faces you across the ring.
    float veins = pow(max(0.0, snoise(vec3(dir * 2.2, vT * uBiolumeScale - uTime * uBiolumeSpeed + vSeed))), 3.0);
    float pulse = 1.0 + uBiolumePulse * sin(uTime * 2.1 + vSeed * 9.0 + vT * 3.0);
    float lume = (veins * 0.7 + rim * uSuckerGlow) * uBiolume * pulse;
    color += uColorBiolume * (lume + vFlash * uFlashGain * (0.35 + rim));
    color += uColorSucker * rim * 0.35;

    // The wet lip where the arm is still coming out of the ground.
    color += uColorBiolume * breaching * uFrontGlow;

    color *= uGlow;
    // Host ACES tone mapping handles the ceiling; no donor double-tonemapping.


    float alpha = clamp(uOpacity, 0.0, 1.0);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(color * uGlobalGlow, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createKrakenMaterial() {
  const material = new ShaderMaterial({
    transparent: true,
    // Closed, depth-writing flesh needs one double-sided pass, not two blended passes.
    forceSinglePass: true,
    // Opaque flesh: it must occlude itself, and the arms cross heavily over the
    // middle when they land on top of each other.
    depthWrite: true,
    depthTest: true,
    blending: NormalBlending,
    side: DoubleSide,
    toneMapped: true,
    fog: true,
    uniforms: {
      // Three.js refreshFogUniforms requires these when scene.fog and material.fog are enabled.
      // Clone per cast: renderer updates them without mutating global/shared uniform objects.
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: { value: 0 },
      uNoiseOctaves: { value: 4 },
      uGlobalGlow: { value: 1 },
      uSunDir: { value: new Vector3(5, -9, 6).normalize() },

      uColorSkin: { value: new Color('#182737') },
      uColorDeep: { value: new Color('#060b19') },
      uColorBelly: { value: new Color('#8792a8') },
      uColorFlush: { value: new Color('#314e68') },
      uColorBiolume: { value: new Color('#44ccb5') },
      uColorSucker: { value: new Color('#7abebd') },
      uColorRim: { value: new Color('#84b9da') },

      uMottle: { value: 0.6 },
      uMottleScale: { value: 3.4 },
      uMottleWarp: { value: 0.5 },
      uBellyBlend: { value: 0.75 },
      uDepthShade: { value: 0.55 },

      uChroma: { value: 0.55 },
      uChromaScale: { value: 2.2 },
      uChromaSpeed: { value: 0.5 },
      uChromaSharp: { value: 3.0 },
      uChromaWarp: { value: 0.6 },

      uSuckers: { value: 1.0 },
      uSuckerDensity: { value: 26 },
      uSuckerSize: { value: 0.66 },
      uSuckerSpan: { value: 0.8 },
      uRowSpacing: { value: 0.44 },
      uSuckerRelief: { value: 0.6 },
      uSuckerGlow: { value: 1.1 },
      uSuckerStart: { value: 0.05 },

      uBiolume: { value: 0.4 },
      uBiolumeScale: { value: 2.4 },
      uBiolumeSpeed: { value: 0.8 },
      uBiolumePulse: { value: 0.35 },

      uSpecular: { value: 1.6 },
      uGloss: { value: 48 },
      uEnvIntensity: { value: 0.5 },
      uRim: { value: 0.28 },
      uRimPower: { value: 3.0 },
      uTranslucency: { value: 0.45 },

      uFrontRough: { value: 0.3 },
      uFrontWidth: { value: 0.1 },
      uFrontGlow: { value: 0.75 },
      uFlashGain: { value: 0.85 },

      uGlow: { value: 1.0 },
      uOpacity: { value: 1.0 }
    },
    vertexShader: KRAKEN_VERTEX,
    fragmentShader: KRAKEN_FRAGMENT
  });

  return material;
}
