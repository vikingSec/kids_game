import * as THREE from 'three';

export class WebSwing {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Web line visual (cylinder for thickness)
  private webMesh: THREE.Mesh | null = null;
  private webMaterial: THREE.MeshBasicMaterial;

  // Aim indicator
  private aimIndicator: THREE.Mesh | null = null;
  private aimIndicatorMaterial: THREE.MeshBasicMaterial;

  // Swing state
  private isSwinging = false;
  private attachPoint = new THREE.Vector3();
  private ropeLength = 0;

  // Raycaster for finding attach points
  private raycaster = new THREE.Raycaster();

  // Swing settings
  private readonly MAX_ROPE_LENGTH = 35;
  private readonly MIN_ROPE_LENGTH = 3;
  private readonly SWING_TENSION = 40; // Force pulling toward attach point
  private readonly SWING_GRAVITY = 20;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    // White web material
    this.webMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // Aim indicator material (glowing green)
    this.aimIndicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
    });

    // Create aim indicator (small sphere)
    const indicatorGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    this.aimIndicator = new THREE.Mesh(indicatorGeometry, this.aimIndicatorMaterial);
    this.aimIndicator.visible = false;
    this.scene.add(this.aimIndicator);
  }

  // Update aim indicator to show where web will attach
  updateAimIndicator(playerPosition: THREE.Vector3, swingableObjects: THREE.Object3D[]): THREE.Vector3 | null {
    if (this.isSwinging) {
      if (this.aimIndicator) this.aimIndicator.visible = false;
      return null;
    }

    // Cast ray from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(swingableObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const distance = hit.point.distanceTo(playerPosition);

      if (distance <= this.MAX_ROPE_LENGTH && distance >= this.MIN_ROPE_LENGTH) {
        // Show indicator at hit point
        if (this.aimIndicator) {
          this.aimIndicator.position.copy(hit.point);
          this.aimIndicator.visible = true;
          this.aimIndicatorMaterial.color.setHex(0x00ff00); // Green = valid
        }
        return hit.point.clone();
      } else {
        // Too far or too close
        if (this.aimIndicator) {
          this.aimIndicator.position.copy(hit.point);
          this.aimIndicator.visible = true;
          this.aimIndicatorMaterial.color.setHex(0xff0000); // Red = invalid
        }
        return null;
      }
    }

    // No hit - hide indicator
    if (this.aimIndicator) this.aimIndicator.visible = false;
    return null;
  }

  // Try to attach web to the aim point
  tryAttach(playerPosition: THREE.Vector3, swingableObjects: THREE.Object3D[]): boolean {
    // Cast ray from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(swingableObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const distance = hit.point.distanceTo(playerPosition);

      if (distance <= this.MAX_ROPE_LENGTH && distance >= this.MIN_ROPE_LENGTH) {
        this.attachPoint.copy(hit.point);
        this.ropeLength = distance;
        this.isSwinging = true;
        this.createWebMesh(playerPosition);

        // Hide aim indicator while swinging
        if (this.aimIndicator) this.aimIndicator.visible = false;
        return true;
      }
    }

    return false;
  }

  private createWebMesh(playerPosition: THREE.Vector3) {
    this.removeWebMesh();

    // Create a cylinder for the web (thicker than a line)
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
    // Rotate so it points along Y by default, we'll orient it each frame
    geometry.rotateX(Math.PI / 2);

    this.webMesh = new THREE.Mesh(geometry, this.webMaterial);
    this.updateWebMesh(playerPosition);
    this.scene.add(this.webMesh);
  }

  private updateWebMesh(playerPosition: THREE.Vector3) {
    if (!this.webMesh) return;

    const start = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y + 0.5,
      playerPosition.z
    );
    const end = this.attachPoint;

    // Position at midpoint
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    this.webMesh.position.copy(midpoint);

    // Scale to length
    const length = start.distanceTo(end);
    this.webMesh.scale.set(1, 1, length);

    // Orient toward attach point
    this.webMesh.lookAt(end);
  }

  private removeWebMesh() {
    if (this.webMesh) {
      this.scene.remove(this.webMesh);
      this.webMesh.geometry.dispose();
      this.webMesh = null;
    }
  }

  detach() {
    this.isSwinging = false;
    this.removeWebMesh();
  }

  // Apply swing physics - this is the key fix for pulling the player up
  update(
    playerPosition: THREE.Vector3,
    velocity: THREE.Vector3,
    deltaTime: number
  ): THREE.Vector3 {
    if (!this.isSwinging) {
      return velocity;
    }

    // Update web visual
    this.updateWebMesh(playerPosition);

    // Vector from player to attach point (direction we should be pulled)
    const toAttach = new THREE.Vector3().subVectors(this.attachPoint, playerPosition);
    const currentDistance = toAttach.length();
    const ropeDirection = toAttach.clone().normalize();

    // Apply gravity (but less than normal - the web supports some weight)
    velocity.y -= this.SWING_GRAVITY * deltaTime;

    // KEY FIX: If we're beyond the rope length, pull back toward attach point
    if (currentDistance > this.ropeLength) {
      // Calculate how much we've overextended
      const overExtension = currentDistance - this.ropeLength;

      // Apply strong tension force toward attach point
      const tensionForce = ropeDirection.clone().multiplyScalar(this.SWING_TENSION * deltaTime);
      velocity.add(tensionForce);

      // Also add an immediate correction to prevent going further
      const correctionStrength = Math.min(overExtension, 0.5);
      const correction = ropeDirection.clone().multiplyScalar(correctionStrength);
      playerPosition.add(correction);

      // Remove velocity component that's moving away from attach point
      const awayVelocity = ropeDirection.dot(velocity);
      if (awayVelocity < 0) {
        velocity.sub(ropeDirection.clone().multiplyScalar(awayVelocity * 0.8));
      }
    }

    // Add slight centripetal acceleration for smoother swinging
    // This gives a nice arc feeling
    const tangent = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), ropeDirection)
      .normalize();

    if (tangent.length() > 0.1) {
      // Add a small force in the swing direction based on current velocity
      const swingSpeed = tangent.dot(velocity);
      const centripetalBoost = (swingSpeed * swingSpeed) / Math.max(currentDistance, 1) * deltaTime;
      velocity.add(ropeDirection.clone().multiplyScalar(centripetalBoost * 0.5));
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
    this.removeWebMesh();
    this.webMaterial.dispose();
    if (this.aimIndicator) {
      this.scene.remove(this.aimIndicator);
      this.aimIndicator.geometry.dispose();
    }
    this.aimIndicatorMaterial.dispose();
  }
}
