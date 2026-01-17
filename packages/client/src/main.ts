import * as THREE from 'three';
import { Input } from './player/Input';
import { Player } from './player/Player';
import { ThirdPersonCamera } from './game/Camera';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Fog for atmosphere
scene.fog = new THREE.Fog(0x1a1a2e, 20, 80);

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

// Add some simple obstacles (placeholder trees/rocks)
const addObstacle = (x: number, z: number, height: number, color: number) => {
  const geometry = new THREE.CylinderGeometry(0.5, 0.7, height, 8);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
};

// Scatter some placeholder trees
for (let i = 0; i < 20; i++) {
  const x = (Math.random() - 0.5) * 60;
  const z = (Math.random() - 0.5) * 60;
  // Don't place too close to spawn
  if (Math.abs(x) > 5 || Math.abs(z) > 5) {
    const height = 4 + Math.random() * 4;
    addObstacle(x, z, height, 0x335533);
  }
}

// Input and Player
const input = new Input();
const player = new Player(input);
scene.add(player.mesh);

// Camera
const thirdPersonCamera = new ThirdPersonCamera(input);

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
      MOUSE - Look around
    </div>
  </div>
`;
document.body.appendChild(overlay);

// Click to lock pointer
renderer.domElement.addEventListener('click', () => {
  input.requestPointerLock(renderer.domElement);
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

  // Update instructions based on pointer lock state
  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.textContent = input.pointerLocked
      ? 'Go explore!'
      : 'Click to start!';
  }

  // Update player movement with camera direction
  player.setCameraAngle(thirdPersonCamera.getYRotation());
  player.update(deltaTime);

  // Update camera to follow player
  thirdPersonCamera.update(player.position, deltaTime);

  // Render
  renderer.render(scene, thirdPersonCamera.camera);
}

animate();

console.log('Robot Spiderman: Techno-Jungle Adventure loaded!');
console.log('Click the game window, then use WASD to move and mouse to look around!');
