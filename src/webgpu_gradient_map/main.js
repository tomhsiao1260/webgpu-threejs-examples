import * as THREE from 'three/webgpu';
import WebGPU from 'three/addons/capabilities/WebGPU.js';

import { nodeF, textureF } from './shader.js';
import { nodeFdx, textureFdx } from './shader.js';
import { nodeFdy, textureFdy } from './shader.js';

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

  const geometry = new THREE.PlaneGeometry(1, 1);

  const mF = new THREE.MeshBasicNodeMaterial({ map: textureF });
  const mFdx = new THREE.MeshBasicNodeMaterial({ map: textureFdx });
  const mFdy = new THREE.MeshBasicNodeMaterial({ map: textureFdy });

  const cardF = new THREE.Mesh(geometry, mF);
  const cardFdx = new THREE.Mesh(geometry, mFdx);
  const cardFdy = new THREE.Mesh(geometry, mFdy);

  cardF.position.x = -1.2;
  cardFdx.position.x = 0;
  cardFdy.position.x = 1.2;

  scene.add(cardF, cardFdx, cardFdy);

  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  renderer.compute(nodeF);
  renderer.compute(nodeFdx);
  renderer.compute(nodeFdy);

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

