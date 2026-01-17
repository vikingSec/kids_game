import * as THREE from 'three';
import { Input } from '../player/Input';

export class WebSwing {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private input: Input;

  // Web line visual
  private webLine: THREE.Line | null = null;
  private webMaterial: THREE.LineBasicMaterial;

  // Swing state
  private isSwinging = false;
  private attachPoint = new THREE.Vector3();
  private ropeLength = 0;

  // Raycaster for finding attach points
  private raycaster = new THREE.Raycaster();

  // Swing settings
  private readonly MAX_ROPE_LENGTH = 30;
  private readonly MIN_ROPE_LENGTH = 3;
  private readonly SWING_GRAVITY = 25;
  private readonly AIR_RESISTANCE = 0.02;

  constructor(scene: THREE.Scene, camera: THREE.Camera, input: Input) {
    this.scene = scene;
    this.camera = camera;
    this.input = input;

    // Glowing cyan web material
    this.webMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2,
    });
  }

  // Try to attach web to something in front of the camera
  tryAttach(
    playerPosition: THREE.Vector3,
    swingableObjects: THREE.Object3D[]
  ): boolean {
    // Cast ray from camera center (where player is aiming)
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const intersects = this.raycaster.intersectObjects(swingableObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];

      // Check if it's within range
      const distance = hit.point.distanceTo(playerPosition);
      if (distance <= this.MAX_ROPE_LENGTH && distance >= this.MIN_ROPE_LENGTH) {
        this.attachPoint.copy(hit.point);
        this.ropeLength = distance;
        this.isSwinging = true;
        this.createWebLine(playerPosition);
        return true;
      }
    }

    // If no object hit, try to attach to a point in the air ahead
    // This makes it easier for kids to swing even without perfect aim
    const fallbackDistance = 15;
    const direction = new THREE.Vector3();
    this.raycaster.ray.direction.normalize();
    direction.copy(this.raycaster.ray.direction);

    // Only attach if aiming somewhat upward
    if (direction.y > -0.3) {
      const fallbackPoint = new THREE.Vector3()
        .copy(playerPosition)
        .add(direction.multiplyScalar(fallbackDistance));

      // Make sure the attach point is above the player
      if (fallbackPoint.y > playerPosition.y + 2) {
        this.attachPoint.copy(fallbackPoint);
        this.ropeLength = fallbackDistance;
        this.isSwinging = true;
        this.createWebLine(playerPosition);
        return true;
      }
    }

    return false;
  }

  private createWebLine(playerPosition: THREE.Vector3) {
    // Remove old web line if exists
    this.removeWebLine();

    // Create new web line
    const points = [playerPosition.clone(), this.attachPoint.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.webLine = new THREE.Line(geometry, this.webMaterial);
    this.scene.add(this.webLine);
  }

  private updateWebLine(playerPosition: THREE.Vector3) {
    if (this.webLine) {
      const positions = this.webLine.geometry.attributes.position;
      positions.setXYZ(0, playerPosition.x, playerPosition.y + 0.5, playerPosition.z);
      positions.setXYZ(1, this.attachPoint.x, this.attachPoint.y, this.attachPoint.z);
      positions.needsUpdate = true;
    }
  }

  private removeWebLine() {
    if (this.webLine) {
      this.scene.remove(this.webLine);
      this.webLine.geometry.dispose();
      this.webLine = null;
    }
  }

  detach() {
    this.isSwinging = false;
    this.removeWebLine();
  }

  // Apply swing physics and return the new velocity
  update(
    playerPosition: THREE.Vector3,
    velocity: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    if (!this.isSwinging) {
      return velocity;
    }

    // Update web line visual
    this.updateWebLine(playerPosition);

    // Vector from attach point to player
    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.attachPoint);
    const currentDistance = toPlayer.length();

    // Normalize for direction
    const ropeDirection = toPlayer.clone().normalize();

    // Apply gravity
    velocity.y -= this.SWING_GRAVITY * deltaTime;

    // Apply air resistance
    velocity.multiplyScalar(1 - this.AIR_RESISTANCE);

    // Pendulum constraint: if we're past the rope length, pull back
    if (currentDistance > this.ropeLength) {
      // Project velocity onto the rope direction and remove the component
      // that would take us further from the attach point
      const velocityAlongRope = ropeDirection.dot(velocity);

      if (velocityAlongRope > 0) {
        // Moving away from attach point, constrain
        velocity.sub(ropeDirection.clone().multiplyScalar(velocityAlongRope));
      }

      // Snap position back to rope length
      const correction = ropeDirection.clone().multiplyScalar(currentDistance - this.ropeLength);
      playerPosition.sub(correction);
    }

    // Add a slight pull toward the swing arc (makes it feel more dynamic)
    const tangent = new THREE.Vector3()
      .crossVectors(ropeDirection, new THREE.Vector3(0, 1, 0))
      .normalize();

    // Determine swing direction based on current velocity
    const swingDirection = tangent.dot(velocity) > 0 ? 1 : -1;

    // Add centripetal boost when at bottom of swing
    if (ropeDirection.y < 0.3) {
      const boost = Math.abs(ropeDirection.y) * 2 * deltaTime;
      velocity.add(tangent.clone().multiplyScalar(boost * swingDirection));
    }

    return velocity;
  }

  get swinging(): boolean {
    return this.isSwinging;
  }

  get webAttachPoint(): THREE.Vector3 | null {
    return this.isSwinging ? this.attachPoint.clone() : null;
  }

  dispose() {
    this.removeWebLine();
    this.webMaterial.dispose();
  }
}
