import * as THREE from 'three/webgpu';

import { Fn, hue, color, distance } from 'three/tsl';
import { float, vec2, vec3, vec4, uvec2, ivec2 } from 'three/tsl';
import { storageTexture, textureStore, instanceIndex, textureLoad, NodeAccess } from 'three/tsl';

// uv
const width = 16, height = 16;

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
    const v = uv.x.add(uv.y);
    // const v = distance(uv, vec2(.5));
    const c = vec3(v).mul(.5);

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

// color
const textureFc = new THREE.StorageTexture(width, height);
textureFc.minFilter = THREE.NearestFilter;
textureFc.magFilter = THREE.NearestFilter;

const Fc = Fn(([ readTex, writeTex ]) => {
    const o = textureLoad(readTex, indexUV).r;
    const c = hue(color('#f00000'), o.mul(20));

    textureStore(writeTex, indexUV, vec4(c, 1.0)).toWriteOnly();
});

const nodeFc = { init: null, ping: null, pong: null };
nodeFc.ping = Fc(readPingF, textureFc).compute(width * height);
nodeFc.pong = Fc(readPongF, textureFc).compute(width * height);
nodeFc.init = nodeFc.ping;

// export
export { nodeF, textureF };
export { nodeFc, textureFc };
