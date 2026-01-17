import * as THREE from 'three';
import { Input } from './player/Input';
import { Player } from './player/Player';
import { ThirdPersonCamera } from './game/Camera';
import { WebSwing } from './abilities/WebSwing';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Fog for atmosphere
scene.fog = new THREE.Fog(0x1a1a2e, 20, 100);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.getElementById('app')!.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffee, 1);
directionalLight.position.set(20, 40, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -30;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = -30;
scene.add(directionalLight);

// Add some colored point lights for techno-jungle feel
const pointLight1 = new THREE.PointLight(0x00ff88, 0.5, 20);
pointLight1.position.set(10, 3, 10);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x8800ff, 0.5, 20);
pointLight2.position.set(-10, 3, -10);
scene.add(pointLight2);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x2d5a27,
  roughness: 0.8,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Swingable objects (trees/pillars that web can attach to)
const swingableObjects: THREE.Object3D[] = [];

// Add tall trees/pillars for swinging
const addSwingableTree = (x: number, z: number, height: number) => {
  const group = new THREE.Group();

  // Trunk
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, height, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9,
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Glowing top (like a techno-jungle canopy)
  const topGeometry = new THREE.SphereGeometry(1.5, 8, 6);
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff66,
    emissive: 0x00ff66,
    emissiveIntensity: 0.2,
    roughness: 0.5,
  });
  const top = new THREE.Mesh(topGeometry, topMaterial);
  top.position.y = height + 0.5;
  top.castShadow = true;
  group.add(top);

  group.position.set(x, 0, z);
  scene.add(group);
  swingableObjects.push(group);

  return group;
};

// Create a forest of swingable trees - taller and more spread out
for (let i = 0; i < 40; i++) {
  const angle = (i / 40) * Math.PI * 2;
  const radius = 15 + Math.random() * 50;
  const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 20;
  const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 20;

  // Don't place too close to spawn
  if (Math.abs(x) > 8 || Math.abs(z) > 8) {
    const height = 12 + Math.random() * 10; // Taller trees for better swinging
    addSwingableTree(x, z, height);
  }
}

// Add some shorter obstacles too
const addObstacle = (x: number, z: number, height: number, color: number) => {
  const geometry = new THREE.CylinderGeometry(0.3, 0.5, height, 8);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
};

// Scatter some smaller obstacles
for (let i = 0; i < 15; i++) {
  const x = (Math.random() - 0.5) * 40;
  const z = (Math.random() - 0.5) * 40;
  if (Math.abs(x) > 5 || Math.abs(z) > 5) {
    const height = 2 + Math.random() * 3;
    addObstacle(x, z, height, 0x335533);
  }
}

// Input and Player
const input = new Input();
const player = new Player(input);
scene.add(player.mesh);

// Camera
const thirdPersonCamera = new ThirdPersonCamera(input);

// Web Swing ability
const webSwing = new WebSwing(scene, thirdPersonCamera.camera, input);

// UI overlay for instructions
const overlay = document.createElement('div');
overlay.id = 'overlay';
overlay.innerHTML = `
  <div style="
    position: fixed;
    top: 20px;
    left: 20px;
    color: white;
    font-family: monospace;
    font-size: 14px;
    background: rgba(0,0,0,0.5);
    padding: 15px;
    border-radius: 8px;
    pointer-events: none;
  ">
    <div style="font-size: 18px; margin-bottom: 10px; color: #00ffff;">🕷️ Robot Spiderman</div>
    <div id="instructions">Click to start!</div>
    <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
      WASD - Move<br>
      SHIFT - Sprint<br>
      SPACE - Jump<br>
      MOUSE - Look around<br>
      <span style="color: #00ffff;">LEFT CLICK (hold) - Web Swing!</span>
    </div>
  </div>
`;
document.body.appendChild(overlay);

// Crosshair for aiming
const crosshair = document.createElement('div');
crosshair.id = 'crosshair';
crosshair.innerHTML = `
  <div style="
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    pointer-events: none;
  ">
    <div style="
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(0, 255, 255, 0.5);
      transform: translateY(-50%);
    "></div>
    <div style="
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 2px;
      background: rgba(0, 255, 255, 0.5);
      transform: translateX(-50%);
    "></div>
  </div>
`;
document.body.appendChild(crosshair);

// Click to lock pointer (but not when already locked - that's for web swing)
renderer.domElement.addEventListener('mousedown', (e) => {
  if (!input.pointerLocked) {
    e.preventDefault();
    input.requestPointerLock(renderer.domElement);
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game loop
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
  lastTime = currentTime;

  // Update instructions based on state
  const instructions = document.getElementById('instructions');
  if (instructions) {
    if (!input.pointerLocked) {
      instructions.textContent = 'Click to start!';
    } else if (webSwing.swinging) {
      instructions.textContent = 'Swinging! Release to let go!';
      instructions.style.color = '#00ffff';
    } else {
      instructions.textContent = 'Look at trees and hold LEFT CLICK to swing!';
      instructions.style.color = 'white';
    }
  }

  // Show/hide crosshair based on pointer lock
  crosshair.style.display = input.pointerLocked ? 'block' : 'none';

  // Handle web swing input
  if (input.pointerLocked) {
    if (input.webShootJustPressed && !webSwing.swinging) {
      // Try to attach web
      const attached = webSwing.tryAttach(player.position, swingableObjects);
      if (attached) {
        player.setSwinging(true);
      }
    }

    if (input.webShootJustReleased && webSwing.swinging) {
      // Release web - player keeps momentum
      webSwing.detach();
      player.setSwinging(false);
    }
  }

  // Update web swing physics (modifies player velocity)
  if (webSwing.swinging) {
    webSwing.update(player.position, player.velocity, deltaTime);
  }

  // Update player movement with camera direction
  player.setCameraAngle(thirdPersonCamera.getYRotation());
  player.update(deltaTime);

  // Update camera to follow player
  thirdPersonCamera.update(player.position, deltaTime);

  // Clear input frame state
  input.endFrame();

  // Render
  renderer.render(scene, thirdPersonCamera.camera);
}

animate();

console.log('Robot Spiderman: Techno-Jungle Adventure loaded!');
console.log('Click the game, use WASD to move, and hold LEFT CLICK to web swing!');
