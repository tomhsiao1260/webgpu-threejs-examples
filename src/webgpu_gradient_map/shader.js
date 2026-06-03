import * as THREE from 'three/webgpu';

import { Fn, hue, color, distance } from 'three/tsl';
import { float, vec2, vec3, vec4, uvec2, ivec2 } from 'three/tsl';
import { storageTexture, textureStore, instanceIndex, textureLoad, NodeAccess } from 'three/tsl';

// uv
const width = 20, height = 20;

const posX = instanceIndex.mod(width);
const posY = instanceIndex.div(width);
const indexUV = uvec2(posX, posY);
const uv = vec2(float(posX).div(width), float(posY).div(height));

// F
const textureF = { init: null, ping: null, pong: null };

textureF.ping = new THREE.StorageTexture(width, height);
textureF.ping.minFilter = THREE.NearestFilter;
textureF.ping.magFilter = THREE.NearestFilter;
textureF.init = textureF.ping;

textureF.pong = new THREE.StorageTexture(width, height);
textureF.pong.minFilter = THREE.NearestFilter;
textureF.pong.magFilter = THREE.NearestFilter;

const readPingF = storageTexture(textureF.ping).setAccess(NodeAccess.READ_ONLY);
const readPongF = storageTexture(textureF.pong).setAccess(NodeAccess.READ_ONLY);
const writePingF = storageTexture(textureF.ping).setAccess(NodeAccess.WRITE_ONLY);
const writePongF = storageTexture(textureF.pong).setAccess(NodeAccess.WRITE_ONLY);

const Fi = Fn(([ writeTex ]) => {
    const v = distance(uv, vec2(.5));
    const c = hue(color('#f00000'), v.mul(20));

    textureStore(writeTex, indexUV, vec4(c, 1.0)).toWriteOnly();
});

const F = Fn(([ readTex, writeTex ]) => {
    const o = textureLoad(readTex, indexUV).r;
    const c = vec3(o.sub(0.1));

    textureStore(writeTex, indexUV, vec4(c, 1.0)).toWriteOnly();
});

const nodeF = { init: null, ping: null, pong: null };
nodeF.init = Fi(writePingF).compute(width * height);
nodeF.ping = F(readPongF, writePingF).compute(width * height);
nodeF.pong = F(readPingF, writePongF).compute(width * height);

// dF/dx
const textureFdx = new THREE.StorageTexture(width, height);
textureFdx.minFilter = THREE.NearestFilter;
textureFdx.magFilter = THREE.NearestFilter;

const Fdx = Fn(() => {
    const o = textureLoad(textureF.init, indexUV.add(ivec2(0, 0))).r;
    const p = textureLoad(textureF.init, indexUV.add(ivec2(1, 0))).r;

    const v = p.sub(o);
    const c = hue(color('#0000f0'), v.mul(2.5));

    textureStore(textureFdx, indexUV, vec4(c, 1.0)).toWriteOnly();
});
const nodeFdx = Fdx().compute(width * height);

// dF/dy
const textureFdy = new THREE.StorageTexture(width, height);
textureFdy.minFilter = THREE.NearestFilter;
textureFdy.magFilter = THREE.NearestFilter;

const Fdy = Fn(() => {
    const o = textureLoad(textureF.init, indexUV.add(ivec2(0, 0))).r;
    const p = textureLoad(textureF.init, indexUV.add(ivec2(0, 1))).r;

    const v = p.sub(o);
    const c = hue(color('#00f0f0'), v.mul(3));

    textureStore(textureFdy, indexUV, vec4(c, 1.0)).toWriteOnly();
});
const nodeFdy = Fdy().compute(width * height);

// export
export { nodeF, textureF };
export { nodeFdx, textureFdx };
export { nodeFdy, textureFdy };
