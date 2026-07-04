import * as THREE from 'three/webgpu';
import WebGPU from 'three/addons/capabilities/WebGPU.js';

import { textureF, nodeF, nodeFc, mode } from './shader.js';

let camera, scene, renderer;

let phase = true;
const material = {};

init().then(render);

async function init() {
  if (WebGPU.isAvailable() === false) {
    document.body.appendChild( WebGPU.getErrorMessage() );
    throw new Error( 'No WebGPU support' );
  }

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-aspect*.8, aspect*.8, .8, -.8, 0, 2);
  camera.position.z = 1;

  scene = new THREE.Scene();

  const geometry = new THREE.PlaneGeometry(1, 1);
  material.mF = new THREE.MeshBasicNodeMaterial({ map: textureF.color });

  const cardF = new THREE.Mesh(geometry, material.mF);
  cardF.position.x = 0;

  scene.add(cardF);

  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  renderer.compute(nodeF.init);
  renderer.compute(nodeFc.init);

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

    if (mode.n.value < 0) return;
    console.log(mode.n.value);

    renderer.compute(phase ? nodeF.pong : nodeF.ping);
    renderer.compute(phase ? nodeFc.pong : nodeFc.ping);

    mode.n.value -= 1;
    phase = !phase;

    renderer.render(scene, camera);
  }
})
