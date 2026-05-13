import * as THREE from 'three/webgpu';
import { texture, textureStore, Fn, instanceIndex, uvec2, vec4 } from 'three/tsl';

import WebGPU from 'three/addons/capabilities/WebGPU.js';

let camera, scene, renderer;

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

  const width = 10, height = 10;
  const storageTexture = new THREE.StorageTexture(width, height);

  const computeTexture = Fn(({ storageTexture }) => {
      const posX = instanceIndex.mod(width);
      const posY = instanceIndex.div(width);
      const indexUV = uvec2(posX, posY);

      textureStore(storageTexture, indexUV, vec4(1, 0, 0, 1)).toWriteOnly();
  });

  const computeNode = computeTexture({ storageTexture }).compute(width * height);

  const material = new THREE.MeshBasicNodeMaterial({ color: 0x00ff00 });
  material.colorNode = texture(storageTexture);

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  scene.add(plane);

  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  // compute texture
  renderer.compute(computeNode);

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