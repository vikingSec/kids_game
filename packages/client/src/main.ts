import * as THREE from 'three';
import { Input } from './player/Input';
import { Player } from './player/Player';
import { RemotePlayer } from './player/RemotePlayer';
import { ThirdPersonCamera } from './game/Camera';
import { WebSwing } from './abilities/WebSwing';
import { TechnoJungle } from './world/TechnoJungle';
import { Connection, ConnectionStatus } from './network/Connection';
import type { PlayerData } from '@kids-game/shared';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2a3a);

// Lighter fog for atmosphere without making it too dark
scene.fog = new THREE.FogExp2(0x1a2a3a, 0.008);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
document.getElementById('app')!.appendChild(renderer.domElement);

// === LIGHTING (brighter for better visibility) ===
// Ambient light - brighter
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

// Hemisphere light - sky to ground color gradient
const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2d5a27, 0.5);
scene.add(hemisphereLight);

// Main directional light (sun/moon)
const sunLight = new THREE.DirectionalLight(0xffffee, 1.0);
sunLight.position.set(30, 50, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 120;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
scene.add(sunLight);

// Just a couple accent point lights near spawn (not many for performance)
const accentLight1 = new THREE.PointLight(0x00ff88, 0.6, 25);
accentLight1.position.set(8, 4, 8);
scene.add(accentLight1);

const accentLight2 = new THREE.PointLight(0xff00ff, 0.4, 20);
accentLight2.position.set(-8, 4, -8);
scene.add(accentLight2);

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

// === NETWORKING ===
const remotePlayers: Map<string, RemotePlayer> = new Map();

// Generate a random player name
let playerName = `Spider-${Math.floor(Math.random() * 1000)}`;

// Network connection
const SERVER_URL = `ws://${window.location.hostname}:3002`; // Sprint branch uses different port

const connection = new Connection(SERVER_URL, {
  onStatusChange: (status: ConnectionStatus) => {
    updateNetworkStatus(status);
  },
  onWelcome: (yourId: string, existingPlayers: Array<{ id: string; name: string; color: string }>) => {
    console.log(`[Network] Welcome! Your ID: ${yourId}`);
    // Add existing players
    existingPlayers.forEach(p => {
      addRemotePlayer(p.id, p.name, p.color);
    });
  },
  onPlayerJoined: (id: string, name: string, color: string) => {
    console.log(`[Network] ${name} joined!`);
    addRemotePlayer(id, name, color);
  },
  onPlayerLeft: (id: string) => {
    const remote = remotePlayers.get(id);
    if (remote) {
      console.log(`[Network] ${remote.name} left`);
      removeRemotePlayer(id);
    }
  },
  onGameState: (players: PlayerData[]) => {
    // Update remote player positions
    players.forEach(data => {
      const remote = remotePlayers.get(data.id);
      if (remote) {
        remote.updateFromData(data);
      }
    });
  },
});

function addRemotePlayer(id: string, name: string, color: string): void {
  if (remotePlayers.has(id)) return;
  const remote = new RemotePlayer(id, name, color);
  remotePlayers.set(id, remote);
  scene.add(remote.mesh);
}

function removeRemotePlayer(id: string): void {
  const remote = remotePlayers.get(id);
  if (remote) {
    scene.remove(remote.mesh);
    remote.dispose();
    remotePlayers.delete(id);
  }
}

// Connect to server
connection.connect(playerName);

// Network position update rate (10Hz to reduce bandwidth)
const NETWORK_UPDATE_INTERVAL = 100; // ms
let lastNetworkUpdate = 0;
let wasSwinging = false;

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
    <div id="network-status" style="font-size: 12px; margin-bottom: 8px; color: #ffaa00;">Connecting...</div>
    <div id="instructions">Click to start!</div>
    <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
      WASD - Move<br>
      SHIFT - Sprint<br>
      SPACE - Jump (releases web!)<br>
      MOUSE - Look around<br>
      <span style="color: #00ffff;">LEFT CLICK (hold) - Web Swing!</span><br>
      <span style="color: #00ff00;">Green dot = aim point</span><br>
      <span style="color: #ffaa00;">ESC - Settings (color, name)</span>
    </div>
  </div>
`;
document.body.appendChild(overlay);

// === SETTINGS MENU ===
let settingsOpen = false;
let currentPlayerColor = '#ff4444'; // Default red

const settingsOverlay = document.createElement('div');
settingsOverlay.id = 'settings-overlay';
settingsOverlay.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;
settingsOverlay.innerHTML = `
  <div style="
    background: rgba(20, 30, 40, 0.95);
    padding: 30px;
    border-radius: 12px;
    border: 2px solid #00ffff;
    min-width: 300px;
    font-family: monospace;
    color: white;
  ">
    <h2 style="margin: 0 0 20px 0; color: #00ffff; text-align: center;">Settings</h2>

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; color: #aaa;">Player Name:</label>
      <input type="text" id="settings-name" maxlength="20" value="${playerName}" style="
        width: 100%;
        padding: 10px;
        background: #1a1a1a;
        border: 1px solid #00ffff;
        border-radius: 4px;
        color: white;
        font-family: monospace;
        font-size: 14px;
        box-sizing: border-box;
      ">
    </div>

    <div style="margin-bottom: 25px;">
      <label style="display: block; margin-bottom: 8px; color: #aaa;">Spider Color:</label>
      <input type="color" id="settings-color" value="${currentPlayerColor}" style="
        width: 100%;
        height: 50px;
        border: 1px solid #00ffff;
        border-radius: 4px;
        cursor: pointer;
        background: #1a1a1a;
      ">
    </div>

    <div style="display: flex; gap: 10px;">
      <button id="settings-save" style="
        flex: 1;
        padding: 12px;
        background: #00ffff;
        border: none;
        border-radius: 4px;
        color: #000;
        font-family: monospace;
        font-weight: bold;
        cursor: pointer;
      ">Save</button>
      <button id="settings-cancel" style="
        flex: 1;
        padding: 12px;
        background: #333;
        border: 1px solid #666;
        border-radius: 4px;
        color: white;
        font-family: monospace;
        cursor: pointer;
      ">Cancel</button>
    </div>

    <div style="margin-top: 15px; text-align: center; font-size: 12px; color: #666;">
      Press ESC to close
    </div>
  </div>
`;
document.body.appendChild(settingsOverlay);

function openSettings(): void {
  settingsOpen = true;
  settingsOverlay.style.display = 'flex';
  document.exitPointerLock();
}

function closeSettings(): void {
  settingsOpen = false;
  settingsOverlay.style.display = 'none';
}

// ESC key to toggle settings
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (settingsOpen) {
      closeSettings();
    } else {
      openSettings();
    }
  }
});

// Settings button handlers
document.getElementById('settings-save')?.addEventListener('click', () => {
  const nameInput = document.getElementById('settings-name') as HTMLInputElement;
  const colorInput = document.getElementById('settings-color') as HTMLInputElement;

  const newName = nameInput.value.trim();
  const newColor = colorInput.value;

  if (newName && newName !== playerName) {
    playerName = newName;
    const statusEl = document.getElementById('network-status');
    if (statusEl) {
      statusEl.textContent = `Connected as ${playerName}`;
    }
  }

  if (newColor !== currentPlayerColor) {
    currentPlayerColor = newColor;
    player.setColor(newColor); // Update local player color
  }

  // Send settings to server
  connection.sendSettings(newName || undefined, newColor);
  closeSettings();
});

document.getElementById('settings-cancel')?.addEventListener('click', closeSettings);

function updateNetworkStatus(status: ConnectionStatus): void {
  const statusEl = document.getElementById('network-status');
  if (!statusEl) return;

  switch (status) {
    case 'connecting':
      statusEl.textContent = 'Connecting...';
      statusEl.style.color = '#ffaa00';
      break;
    case 'connected':
      statusEl.textContent = `Connected as ${playerName}`;
      statusEl.style.color = '#00ff00';
      break;
    case 'disconnected':
      statusEl.textContent = 'Disconnected - Reconnecting...';
      statusEl.style.color = '#ff4444';
      break;
    case 'full':
      statusEl.textContent = 'Server full (max 5 players)';
      statusEl.style.color = '#ff4444';
      break;
  }
}

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

  // Update remote players (interpolation)
  remotePlayers.forEach(remote => {
    remote.update(deltaTime);
  });

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
        // Send swing start to server
        const attachPoint = webSwing.webAttachPoint;
        if (attachPoint) {
          connection.sendSwing(true, {
            x: attachPoint.x,
            y: attachPoint.y,
            z: attachPoint.z,
          });
        }
      }
    }

    // Release web on mouse release
    if (input.webShootJustReleased && webSwing.swinging) {
      webSwing.detach();
      player.setSwinging(false);
      // Send swing end to server
      connection.sendSwing(false);
    }

    // Jump while swinging = release and boost upward!
    if (input.jumpJustPressed && webSwing.swinging) {
      webSwing.detach();
      player.setSwinging(false);
      // Give a nice upward boost when jumping off web
      player.velocity.y += 10;
      // Send swing end to server
      connection.sendSwing(false);
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

  // Check terrain collision
  const terrainHeight = technoJungle.getHeightAt(player.position.x, player.position.z);
  player.checkGroundCollision(terrainHeight);

  // Update camera to follow player
  thirdPersonCamera.update(player.position, deltaTime);

  // Send position update to server (throttled)
  if (currentTime - lastNetworkUpdate > NETWORK_UPDATE_INTERVAL) {
    lastNetworkUpdate = currentTime;
    const networkState = player.getNetworkState();
    connection.sendPosition(
      player.position.x,
      player.position.y,
      player.position.z,
      player.rotation.y,
      networkState.state
    );
  }

  // Track swing state changes for immediate updates
  if (player.swinging !== wasSwinging) {
    wasSwinging = player.swinging;
  }

  // Clear input frame state
  input.endFrame();

  // Render
  renderer.render(scene, thirdPersonCamera.camera);
}

animate();

console.log('Robot Spiderman: Techno-Jungle Adventure loaded!');
console.log(`Playing as: ${playerName}`);
console.log('Explore the bioluminescent forest and swing between the trees!');
