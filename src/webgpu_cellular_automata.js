import * as THREE from 'three/webgpu';
import WebGPU from 'three/addons/capabilities/WebGPU.js';

import { storageTexture, textureStore, instanceIndex, NodeAccess } from 'three/tsl';
import { float, vec2, vec3, vec4, uvec2, ivec2, uniform } from 'three/tsl';
import { Fn, If, step, select } from 'three/tsl';

let camera, scene, renderer;
let computeToPing, computeToPong;
let sketchToPing, sketchToPong;
let pingTexture, pongTexture;
let material;

const sketch = uniform(new THREE.Vector2());
const meshes = [];
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

  const computeInitNode = computeInit().compute(width * height);

  const computePingPong = Fn(([ readTex, writeTex ]) => {
    const posX = instanceIndex.mod(width);
    const posY = instanceIndex.div(width);
    const uv = uvec2(posX, posY);

    const k = readTex.load(uv.add(ivec2(-1, -1))).r;
    const l = readTex.load(uv.add(ivec2( 0, -1))).r;
    const m = readTex.load(uv.add(ivec2(+1, -1))).r;
    const n = readTex.load(uv.add(ivec2(-1,  0))).r;
    const o = readTex.load(uv.add(ivec2( 0,  0))).r;
    const p = readTex.load(uv.add(ivec2(+1,  0))).r;
    const q = readTex.load(uv.add(ivec2(-1, +1))).r;
    const r = readTex.load(uv.add(ivec2( 0, +1))).r;
    const s = readTex.load(uv.add(ivec2(+1, +1))).r;

    const neighbors = k.add(l).add(m).add(n).add(p).add(q).add(r).add(s);
    const survive = float(0).toVar();
    const alive = o;

    If(alive, () => {
      If(neighbors.greaterThan(1.5).and(neighbors.lessThan(3.5)), () => {
        survive.assign(1);
      });
    }).Else(() => {
      If(neighbors.greaterThan(2.5).and(neighbors.lessThan(3.5)), () => {
        survive.assign(1);
      });
    });

    const color = select(survive, vec3(1.0), vec3(0));
    textureStore(writeTex, uv, vec4(color, 1.0));
  });

  computeToPong = computePingPong(readPing, writePong).compute(width * height);
  computeToPing = computePingPong(readPong, writePing).compute(width * height);

  const computeSketch = Fn(([ writeTex ]) => {
    const posX = instanceIndex.mod(width);
    const posY = instanceIndex.div(width);
    const uv = uvec2(posX, posY);

    textureStore(writeTex, uv, vec4(sketch, 1.0, 1.0));
  });

  sketchToPong = computeSketch(writePong).compute(width * height);
  sketchToPing = computeSketch(writePing).compute(width * height);

  material = new THREE.MeshBasicNodeMaterial({ color: 0xffffff });
  material.map = pingTexture;

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  scene.add(plane);
  meshes.push(plane);

  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  await renderer.init();

  // compute texture
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

document.addEventListener('keypress', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();

    phase = !phase;
    renderer.compute(phase ? computeToPing : computeToPong);
    material.map = phase ? pingTexture : pongTexture;

    renderer.render(scene, camera);
  }
})

// mouse event handling
document.addEventListener('mousedown', (e) => {
  if (e.target.tagName.toLowerCase() !== 'canvas') return
  document.addEventListener('mousemove', update)
  update(e)
})
document.addEventListener('mouseup', (e) => {
  if (e.target.tagName.toLowerCase() !== 'canvas') return
  document.removeEventListener('mousemove', update)
})

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

function update(e) {
  mouse.x = event.clientX / window.innerWidth * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length) {
    const { uv } = intersects[0];
    sketch.value.set(uv.x, uv.y);

    renderer.compute(phase ? sketchToPing : sketchToPong);
    renderer.render(scene, camera);
  }
}