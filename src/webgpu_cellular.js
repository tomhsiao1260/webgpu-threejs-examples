import * as THREE from 'three/webgpu';
import { storageTexture, textureStore, Fn, instanceIndex, float, uvec2, vec2, vec4, step, NodeAccess } from 'three/tsl';

import WebGPU from 'three/addons/capabilities/WebGPU.js';

let camera, scene, renderer;
let pingTexture, pongTexture;
let material;
let phase = true;

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

  pingTexture = new THREE.StorageTexture(width, height);
  pingTexture.minFilter = THREE.NearestFilter;
  pingTexture.magFilter = THREE.NearestFilter;
  pingTexture.generateMipmaps = false;

  pongTexture = new THREE.StorageTexture(width, height);
  pongTexture.minFilter = THREE.NearestFilter;
  pongTexture.magFilter = THREE.NearestFilter;
  pongTexture.generateMipmaps = false;

  const rand2 = Fn(([ n ]) => {
    return n.dot(vec2(12.9898, 4.1414)).sin().mul(43758.5453).fract();
  });

  // Create storage texture nodes with proper access
  const writePing = storageTexture(pingTexture).setAccess(NodeAccess.WRITE_ONLY);
  const readPing = storageTexture(pingTexture).setAccess(NodeAccess.READ_ONLY);
  const writePong = storageTexture(pongTexture).setAccess(NodeAccess.WRITE_ONLY);
  const readPong = storageTexture(pongTexture).setAccess(NodeAccess.READ_ONLY);

  const computeInit = Fn(() => {
    const posX = instanceIndex.mod(width);
    const posY = instanceIndex.div(width);
    const indexUV = uvec2(posX, posY);
    const uv = vec2(float(posX).div(width), float(posY).div(height));

    const v = step(0.5, rand2(uv));

    textureStore(writePing, indexUV, vec4(v, v, v, 1)).toWriteOnly();
  });

  const computeNode = computeInit().compute(width * height);

  material = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
  material.map = pingTexture;

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

document.addEventListener('keypress', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();

    phase = !phase;
    material.map = phase ? pingTexture : pongTexture;

    renderer.render(scene, camera);
  }
})