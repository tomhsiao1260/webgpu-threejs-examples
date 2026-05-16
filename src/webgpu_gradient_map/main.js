import * as THREE from 'three/webgpu';
import WebGPU from 'three/addons/capabilities/WebGPU.js';

import { texture, textureStore, instanceIndex } from 'three/tsl';
import { Fn, hue, color, distance } from 'three/tsl';
import { float, uvec2, vec2, vec3, vec4 } from 'three/tsl';

let camera, scene, renderer;
let textureF;

const width = 20, height = 20;

init().then(render);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild( WebGPU.getErrorMessage() );
    throw new Error( 'No WebGPU support' );
  }

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-aspect, aspect, 1, - 1, 0, 2);
  camera.position.z = 1;

  scene = new THREE.Scene();

  textureF = new THREE.StorageTexture(width, height);
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

  const material = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
  material.map = textureF;

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  scene.add(plane);

  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  renderer.compute(computeInitNode);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  const aspect = window.innerWidth / window.innerHeight;
  const frustumHeight = camera.top - camera.bottom;

  camera.left = -frustumHeight * aspect / 2;
  camera.right = frustumHeight * aspect / 2;

  camera.updateProjectionMatrix();
  render();
}

function render() {
  renderer.render(scene, camera);
}

