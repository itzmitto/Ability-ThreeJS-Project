// Reuse the already attributed donor/Ashima simplex implementation, preserving its original notice.
import { frostNoise } from '../frostLance/FrostLanceNoise';
export const bendingNoise = `${frostNoise}
float bendFbm(vec3 p,float detail){float n=.55*snoise(p);if(detail>0.5)n+=.25*snoise(p*2.07+vec3(13.1));if(detail>1.5)n+=.12*snoise(p*4.19+vec3(3.7));return n;}
float bendRidged(vec3 p,float detail){return clamp(1.-abs(bendFbm(p,detail)),0.,1.);}
`;
