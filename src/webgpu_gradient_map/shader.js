import * as THREE from 'three/webgpu';

import { textureStore, instanceIndex } from 'three/tsl';
import { Fn, hue, color, distance } from 'three/tsl';
import { float, uvec2, vec2, vec3, vec4 } from 'three/tsl';

const width = 20, height = 20;

const textureF = new THREE.StorageTexture(width, height);
textureF.minFilter = THREE.NearestFilter;
textureF.magFilter = THREE.NearestFilter;
textureF.generateMipmaps = false;

const computeInit = Fn(() => {
    const posX = instanceIndex.mod(width);
    const posY = instanceIndex.div(width);
    const indexUV = uvec2(posX, posY);
    const uv = vec2(float(posX).div(width), float(posY).div(height));

    const v = distance(uv, vec2(.5));
    const c = hue(color('#f00000'), v.mul(20.28));

    textureStore(textureF, indexUV, vec4(c, 1.0)).toWriteOnly();
});

const computeInitNode = computeInit().compute(width * height);

export { computeInitNode, textureF };