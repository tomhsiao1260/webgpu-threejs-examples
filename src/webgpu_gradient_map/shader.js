import * as THREE from 'three/webgpu';

import { textureStore, instanceIndex, textureLoad } from 'three/tsl';
import { Fn, hue, color, distance } from 'three/tsl';
import { float, vec2, vec3, vec4, uvec2, ivec2 } from 'three/tsl';

const width = 20, height = 20;

const posX = instanceIndex.mod(width);
const posY = instanceIndex.div(width);
const indexUV = uvec2(posX, posY);
const uv = vec2(float(posX).div(width), float(posY).div(height));

// F
const textureF = new THREE.StorageTexture(width, height);
textureF.minFilter = THREE.NearestFilter;
textureF.magFilter = THREE.NearestFilter;

const F = Fn(() => {
    const v = distance(uv, vec2(.5));
    const c = hue(color('#f00000'), v.mul(20));

    textureStore(textureF, indexUV, vec4(c, 1.0)).toWriteOnly();
});
const nodeF = F().compute(width * height);

// dF/dx
const textureFdx = new THREE.StorageTexture(width, height);
textureFdx.minFilter = THREE.NearestFilter;
textureFdx.magFilter = THREE.NearestFilter;

const Fdx = Fn(() => {
    const o = textureLoad(textureF, indexUV.add(ivec2(0, 0))).r;
    const p = textureLoad(textureF, indexUV.add(ivec2(1, 0))).r;

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
    const o = textureLoad(textureF, indexUV.add(ivec2(0, 0))).r;
    const p = textureLoad(textureF, indexUV.add(ivec2(0, 1))).r;

    const v = p.sub(o);
    const c = hue(color('#00f0f0'), v.mul(3));

    textureStore(textureFdy, indexUV, vec4(c, 1.0)).toWriteOnly();
});
const nodeFdy = Fdy().compute(width * height);

// dF/dx sum
const textureFdxs = new THREE.StorageTexture(width, height);
textureFdxs.minFilter = THREE.NearestFilter;
textureFdxs.magFilter = THREE.NearestFilter;

const Fdxs = Fn(() => {
    const o = textureLoad(textureFdx, indexUV).r;
    const c = vec3(o);

    textureStore(textureFdxs, indexUV, vec4(c, 1.0)).toWriteOnly();
});
const nodeFdxs = Fdxs().compute(width * height);

// dF/dy sum
const textureFdys = new THREE.StorageTexture(width, height);
textureFdys.minFilter = THREE.NearestFilter;
textureFdys.magFilter = THREE.NearestFilter;

const Fdys = Fn(() => {
    const o = textureLoad(textureFdy, indexUV).r;
    const c = vec3(o);

    textureStore(textureFdys, indexUV, vec4(c, 1.0)).toWriteOnly();
});
const nodeFdys = Fdys().compute(width * height);

// F sum
const Fs = Fn(() => {
    const dx = textureLoad(textureFdxs, indexUV).r;
    const dy = textureLoad(textureFdys, indexUV).r;
    const c = vec3(dx.add(dy));

    textureStore(textureF, indexUV, vec4(c, 1.0)).toWriteOnly();
});
const nodeFs = Fs().compute(width * height);

// export
export { nodeF, textureF };
export { nodeFdx, textureFdx };
export { nodeFdy, textureFdy };
export { nodeFs, nodeFdxs, nodeFdys };
