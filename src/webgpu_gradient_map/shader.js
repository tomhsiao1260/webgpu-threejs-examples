import * as THREE from 'three/webgpu';

import { Fn, If, hue, color, distance } from 'three/tsl';
import { int, float, vec2, vec3, vec4, uvec2, ivec2 } from 'three/tsl';
import { storageTexture, textureStore, instanceIndex, textureLoad, NodeAccess } from 'three/tsl';

// uv
const width = 16, height = 16;

const posX = instanceIndex.mod(width);
const posY = instanceIndex.div(width);
const indexUV = uvec2(posX, posY);
const uv = vec2(float(posX).div(width), float(posY).div(height));

// F
const textureF = { init: null, ping: null, pong: null, color: null };
textureF.ping = new THREE.StorageTexture(width, height);
textureF.ping.minFilter = THREE.NearestFilter;
textureF.ping.magFilter = THREE.NearestFilter;
textureF.init = textureF.ping;

textureF.pong = new THREE.StorageTexture(width, height);
textureF.pong.minFilter = THREE.NearestFilter;
textureF.pong.magFilter = THREE.NearestFilter;

textureF.color = new THREE.StorageTexture(width, height);
textureF.color.minFilter = THREE.NearestFilter;
textureF.color.magFilter = THREE.NearestFilter;

const readPingF = storageTexture(textureF.ping).setAccess(NodeAccess.READ_ONLY);
const readPongF = storageTexture(textureF.pong).setAccess(NodeAccess.READ_ONLY);
const writePingF = storageTexture(textureF.ping).setAccess(NodeAccess.WRITE_ONLY);
const writePongF = storageTexture(textureF.pong).setAccess(NodeAccess.WRITE_ONLY);

const Fi = Fn(([ writeTex ]) => {
    // const v = distance(uv, vec2(.5));
    const v = uv.x.add(uv.y);
    const c = vec3(v).mul(.5);

    textureStore(writeTex, indexUV, vec4(c, 1.0)).toWriteOnly();
});

const F = Fn(([ readTex, writeTex ]) => {
    const o = textureLoad(readTex, indexUV).r;

    If(indexUV.y.greaterThan(7), () => {
        const p = textureLoad(readTex, ivec2(0, 8)).r;
        const q = textureLoad(readTex, ivec2(0, 7)).r;
        const r = p.sub(q);
        const s = o.sub(r);

        If(indexUV.x.equal(0).and(indexUV.y.equal(8)), () => {
            textureStore(writeTex, indexUV, vec4(vec3(r), 1.0)).toWriteOnly();
        }).Else(() => {
            textureStore(writeTex, indexUV, vec4(vec3(s), 1.0)).toWriteOnly();
        })
    }).Else(() => {
        textureStore(writeTex, indexUV, vec4(vec3(o), 1.0)).toWriteOnly();
    })
});

const nodeF = { init: null, ping: null, pong: null };
nodeF.init = Fi(writePingF).compute(width * height);
nodeF.ping = F(readPongF, writePingF).compute(width * height);
nodeF.pong = F(readPingF, writePongF).compute(width * height);

// color
const Fc = Fn(([ readTex, writeTex ]) => {
    const o = textureLoad(readTex, indexUV).r;
    const c = hue(color('#f00000'), o.mul(20));

    textureStore(writeTex, indexUV, vec4(c, 1.0)).toWriteOnly();
});

const nodeFc = { init: null, ping: null, pong: null };
nodeFc.ping = Fc(readPingF, textureF.color).compute(width * height);
nodeFc.pong = Fc(readPongF, textureF.color).compute(width * height);
nodeFc.init = nodeFc.ping;

// export
export { textureF, nodeF, nodeFc };
