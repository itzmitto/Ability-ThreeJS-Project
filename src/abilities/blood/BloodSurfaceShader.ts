/** Glossy absorptive blood shader in linear space, with analytic environment/specular response. */
export const BLOOD_SURFACE = `
uniform float uTime;uniform float uOpacity;uniform float uDetail;uniform float uGlow;uniform float uDissolve;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 float flow=noise(vLocal*.72+vec3(uTime*.13,-uTime*.19,uTime*.07));
 if(uDissolve>0.0&&flow<uDissolve)discard;
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 if(uDetail>0.0)n=normalize(n+vec3(sin(vLocal.z*5.7+uTime*.8),cos(vLocal.x*4.1-uTime*.63),sin(vLocal.y*6.3-uTime*.91))*.025);
 vec3 v=normalize(cameraPosition-vWorld);float nv=abs(dot(n,v));float rim=pow(1.0-nv,4.0);
 vec3 light=normalize(vec3(-.4,.7,.9));vec3 h=normalize(light+v);float spec=pow(max(0.0,dot(n,h)),uDetail>1.5?110.0:65.0);
 float second=pow(max(0.0,dot(n,normalize(vec3(.5,.8,-.4)+v))),48.0);
 float diffuse=.35+.65*max(0.0,dot(n,light));
 vec3 col=mix(vec3(.018,.0007,.002),vec3(.24,.0045,.018),flow)*diffuse;
 col+=vec3(.035,.003,.008)*rim+vec3(.38,.19,.18)*spec+vec3(.12,.035,.04)*second;
 col+=vec3(.08,.001,.016)*uGlow*(.2+flow*.8);
 gl_FragColor=vec4(col,uOpacity);
}`;
