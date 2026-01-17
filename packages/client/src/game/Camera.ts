import * as THREE from 'three';
import { Input } from '../player/Input';

export class ThirdPersonCamera {
  camera: THREE.PerspectiveCamera;
  private input: Input;

  // Camera settings
  private distance = 8;
  private height = 4;
  private rotationX = 0; // Vertical angle (pitch)
  private rotationY = 0; // Horizontal angle (yaw)
  private readonly MOUSE_SENSITIVITY = 0.002;
  private readonly MIN_PITCH = -Math.PI / 3; // Don't look too far down
  private readonly MAX_PITCH = Math.PI / 3; // Don't look too far up

  // Smooth following
  private targetPosition = new THREE.Vector3();
  private currentPosition = new THREE.Vector3();

  constructor(input: Input) {
    this.input = input;
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Handle window resize
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  update(playerPosition: THREE.Vector3, _deltaTime: number) {
    // Update rotation from mouse input
    if (this.input.pointerLocked) {
      const mouseDelta = this.input.getMouseDelta();
      this.rotationY -= mouseDelta.x * this.MOUSE_SENSITIVITY;
      this.rotationX -= mouseDelta.y * this.MOUSE_SENSITIVITY;

      // Clamp vertical rotation
      this.rotationX = THREE.MathUtils.clamp(
        this.rotationX,
        this.MIN_PITCH,
        this.MAX_PITCH
      );
    }

    // Calculate camera position based on spherical coordinates
    const offsetX = Math.sin(this.rotationY) * Math.cos(this.rotationX) * this.distance;
    const offsetY = Math.sin(this.rotationX) * this.distance + this.height;
    const offsetZ = Math.cos(this.rotationY) * Math.cos(this.rotationX) * this.distance;

    this.targetPosition.set(
      playerPosition.x + offsetX,
      playerPosition.y + offsetY,
      playerPosition.z + offsetZ
    );

    // Prevent camera from going below ground
    const minCameraHeight = 1.0;
    if (this.targetPosition.y < minCameraHeight) {
      this.targetPosition.y = minCameraHeight;
    }

    // Smooth camera movement
    this.currentPosition.lerp(this.targetPosition, 0.1);

    // Also clamp the smoothed position to prevent lerping through ground
    if (this.currentPosition.y < minCameraHeight) {
      this.currentPosition.y = minCameraHeight;
    }

    this.camera.position.copy(this.currentPosition);

    // Look at player (slightly above center)
    this.camera.lookAt(
      playerPosition.x,
      playerPosition.y + 1,
      playerPosition.z
    );
  }

  // Get the horizontal rotation for player movement direction
  getYRotation(): number {
    return this.rotationY;
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
  }
}
