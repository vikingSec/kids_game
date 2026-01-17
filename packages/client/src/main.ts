import * as THREE from 'three';
import { Input } from './player/Input';
import { Player } from './player/Player';
import { ThirdPersonCamera } from './game/Camera';
import { WebSwing } from './abilities/WebSwing';
import { TechnoJungle } from './world/TechnoJungle';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

// Fog for mysterious atmosphere
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('app')!.appendChild(renderer.domElement);

// === LIGHTING ===
// Ambient - slightly blue for night feel
const ambientLight = new THREE.AmbientLight(0x202040, 0.3);
scene.add(ambientLight);

// Hemisphere light - sky to ground color gradient
const hemisphereLight = new THREE.HemisphereLight(0x0044aa, 0x002211, 0.4);
scene.add(hemisphereLight);

// Main directional light (moonlight)
const moonLight = new THREE.DirectionalLight(0xaaccff, 0.6);
moonLight.position.set(30, 50, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 120;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
scene.add(moonLight);

// Accent point lights for techno-jungle atmosphere
const accentLight1 = new THREE.PointLight(0x00ff88, 0.8, 30);
accentLight1.position.set(15, 5, 15);
scene.add(accentLight1);

const accentLight2 = new THREE.PointLight(0xff00ff, 0.6, 25);
accentLight2.position.set(-15, 5, -15);
scene.add(accentLight2);

const accentLight3 = new THREE.PointLight(0x00ffff, 0.5, 20);
accentLight3.position.set(-10, 4, 20);
scene.add(accentLight3);

// === WORLD ===
const technoJungle = new TechnoJungle(scene);

// Input and Player
const input = new Input();
const player = new Player(input);
scene.add(player.mesh);

// Camera
const thirdPersonCamera = new ThirdPersonCamera(input);

// Web Swing ability
const webSwing = new WebSwing(scene, thirdPersonCamera.camera);

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
    background: rgba(0,0,0,0.6);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid rgba(0, 255, 136, 0.3);
    pointer-events: none;
    backdrop-filter: blur(4px);
  ">
    <div style="font-size: 18px; margin-bottom: 10px; color: #00ffff; text-shadow: 0 0 10px #00ffff;">Robot Spiderman</div>
    <div id="instructions">Click to start!</div>
    <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
      WASD - Move<br>
      SHIFT - Sprint<br>
      SPACE - Jump (releases web!)<br>
      MOUSE - Look around<br>
      <span style="color: #00ffff;">LEFT CLICK (hold) - Web Swing!</span><br>
      <span style="color: #00ff00;">Green dot = aim point</span>
    </div>
  </div>
`;
document.body.appendChild(overlay);

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

// Simple cylinder collision check
function checkTreeCollision(position: THREE.Vector3, velocity: THREE.Vector3): void {
  const playerRadius = 0.5;

  for (const tree of technoJungle.treeColliders) {
    const dx = position.x - tree.x;
    const dz = position.z - tree.z;
    const distSq = dx * dx + dz * dz;
    const minDist = tree.radius + playerRadius;

    if (distSq < minDist * minDist) {
      // Collision! Push player out
      const dist = Math.sqrt(distSq);
      if (dist > 0.01) {
        const pushX = (dx / dist) * (minDist - dist);
        const pushZ = (dz / dist) * (minDist - dist);
        position.x += pushX;
        position.z += pushZ;

        // Also dampen velocity toward tree
        const normalX = dx / dist;
        const normalZ = dz / dist;
        const velDot = velocity.x * normalX + velocity.z * normalZ;
        if (velDot < 0) {
          velocity.x -= normalX * velDot;
          velocity.z -= normalZ * velDot;
        }
      }
    }
  }
}

// Game loop
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  // Update world animations (glowing plants, circuit pulses, etc.)
  technoJungle.update(deltaTime);

  // Update aim indicator (shows where web will attach)
  if (input.pointerLocked && !webSwing.swinging) {
    webSwing.updateAimIndicator(player.position, technoJungle.swingableObjects);
  }

  // Update instructions based on state
  const instructions = document.getElementById('instructions');
  if (instructions) {
    if (!input.pointerLocked) {
      instructions.textContent = 'Click to start!';
      instructions.style.color = 'white';
    } else if (webSwing.swinging) {
      instructions.textContent = 'Swinging! SPACE to jump off!';
      instructions.style.color = '#00ffff';
    } else {
      instructions.textContent = 'Aim at trees (green dot) and LEFT CLICK!';
      instructions.style.color = 'white';
    }
  }

  // Handle web swing input
  if (input.pointerLocked) {
    // Start swinging
    if (input.webShootJustPressed && !webSwing.swinging) {
      const attached = webSwing.tryAttach(
        player.position,
        player.velocity,
        technoJungle.swingableObjects
      );
      if (attached) {
        player.setSwinging(true);
      }
    }

    // Release web on mouse release
    if (input.webShootJustReleased && webSwing.swinging) {
      webSwing.detach();
      player.setSwinging(false);
    }

    // Jump while swinging = release and boost upward!
    if (input.jumpJustPressed && webSwing.swinging) {
      webSwing.detach();
      player.setSwinging(false);
      // Give a nice upward boost when jumping off web
      player.velocity.y += 10;
    }
  }

  // Update web swing physics (modifies player velocity)
  if (webSwing.swinging) {
    webSwing.update(player.position, player.velocity, deltaTime);
  }

  // Update player movement with camera direction
  player.setCameraAngle(thirdPersonCamera.getYRotation());
  player.update(deltaTime);

  // Check tree collisions
  checkTreeCollision(player.position, player.velocity);

  // Update camera to follow player
  thirdPersonCamera.update(player.position, deltaTime);

  // Clear input frame state
  input.endFrame();

  // Render
  renderer.render(scene, thirdPersonCamera.camera);
}

animate();

console.log('Robot Spiderman: Techno-Jungle Adventure loaded!');
console.log('Explore the bioluminescent forest and swing between the trees!');
