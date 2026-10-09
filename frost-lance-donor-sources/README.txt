FROST LANCE — donor source reference pack

These source files were supplied by the user in a ChatGPT conversation.
They came in a Markdown/text copy-paste format, which escaped JavaScript punctuation
and used non-breaking spaces. The JavaScript files in this pack were normalized
by removing that Markdown escaping; each passed `node --check` (syntax only).
These are not a verified Git commit or byte-for-byte clone of the donor repository.

REFERENCE FILES:
IceAbility.js          original source behavior for glacial eruption
IceMaterial.js         original custom ice material and shader patch
ProceduralGeometry.js contains createCrystalGeometry() (plus unrelated functions)
settings.js            includes the donor's `ice` tuning and other unrelated config
Ability.js             donor lifecycle/base class for understanding behavior

IMPORTANT:
1. These are READ-ONLY DONOR REFERENCES, NOT DROP-IN REPLACEMENTS.
2. Do NOT overwrite your existing src files or import the donor code directly.
3. Port only required algorithms to new TypeScript modules for ability #26.
4. Preserve all 25 already registered abilities, especially Glacial Eruption.
5. Source references alone do not include particle/shadow/decal helpers.
   Reuse the existing sandbox's equivalents or inspect their donor sources.
6. noise.glsl.js was recreated from the GLSL snippet pasted by the user.
   It passed a JavaScript syntax check, but shader compilation still needs a browser test.
7. Verify the donor project's license and preserve applicable attribution.
8. Do not commit, push, or deploy unless explicitly requested.
