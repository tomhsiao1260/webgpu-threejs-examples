import * as THREE from 'three/webgpu';

import { int, float, vec2, vec3, vec4, uvec2, ivec2 } from 'three/tsl';
import { Fn, If, uniform, mod, pow, hue, color, distance } from 'three/tsl';
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

const mode = { n: 0, state: 0 };
// x-mode (0,2,4,6,...) / y-mode (1,3,5,7,...)
mode.n = uniform(Math.floor(width / 2) - 1);
// split 0 / merge 1
mode.state = 0;

const F = Fn(([ readTex, writeTex ]) => {
    const length = pow(2, mode.n.div(2).floor().add(1));
    const vo = textureLoad(readTex, indexUV).r;
    const value = float(vo).toVar();

    // x-mode (0,2,4,6,...)
    const coords = indexUV.x.toVar();
    const windows = uvec2(length.div(2), length.div(2)).toVar();
    const neighbor = ivec2(-1, 0).toVar();

    // y-mode (1,3,5,7,...)
    If(mod(mode.n, 2).equal(1), () => {
        coords.assign(indexUV.y);
        windows.assign(ivec2(length, length.div(2)));
        neighbor.assign(ivec2(0, -1));
    })

    If(mod(coords, length).greaterThanEqual(length.div(2)), () => {
        const xp = indexUV.x.sub(mod(indexUV.x, windows.x));
        const yp = indexUV.y.sub(mod(indexUV.y, windows.y));

        const p = ivec2(xp, yp);
        const vp = textureLoad(readTex, p).r;
        const vn = textureLoad(readTex, p.sub(neighbor)).r;

        If(indexUV.equal(p), () => {
            value.assign(vp.sub(vn));
        }).Else(() => {
            value.assign(vo.sub(vp.sub(vn)));
        })
    })
    textureStore(writeTex, indexUV, vec4(vec3(value), 1.0)).toWriteOnly();
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
export { textureF, nodeF, nodeFc, mode };
