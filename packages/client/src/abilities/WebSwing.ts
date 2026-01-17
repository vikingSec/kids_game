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
  private initialRopeLength = 0;

  // Raycaster for finding attach points
  private raycaster = new THREE.Raycaster();

  // Swing settings
  private readonly MAX_ROPE_LENGTH = 40;
  private readonly MIN_ROPE_LENGTH = 3;
  private readonly SWING_TENSION = 50; // Force pulling toward attach point
  private readonly SWING_GRAVITY = 12; // Much lower gravity while swinging
  private readonly ROPE_RETRACT_SPEED = 3; // How fast rope shortens to pull you up
  private readonly MIN_ROPE_RATIO = 0.5; // Don't retract past 50% of original length

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
      opacity: 0.8,
    });

    // Create aim indicator (small sphere)
    const indicatorGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    this.aimIndicator = new THREE.Mesh(indicatorGeometry, this.aimIndicatorMaterial);
    this.aimIndicator.visible = false;
    this.scene.add(this.aimIndicator);
  }

  // Find a high attach point on the tree (near the glowing top)
  private findHighAttachPoint(hit: THREE.Intersection, playerPosition: THREE.Vector3): THREE.Vector3 | null {
    // Get the tree group (parent of the mesh we hit)
    let treeGroup = hit.object.parent;
    while (treeGroup && !(treeGroup instanceof THREE.Group && treeGroup.parent === this.scene)) {
      treeGroup = treeGroup.parent;
    }

    if (treeGroup) {
      // Find the highest point in this tree (the glowing top)
      let highestY = hit.point.y;
      let highPoint = hit.point.clone();

      treeGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const worldPos = new THREE.Vector3();
          child.getWorldPosition(worldPos);
          if (worldPos.y > highestY) {
            highestY = worldPos.y;
            highPoint = worldPos.clone();
          }
        }
      });

      // Aim for a point near the top but not at the very top
      // Blend between where player aimed and the high point (favor high point)
      const targetY = Math.max(hit.point.y, highestY - 2);
      const finalPoint = new THREE.Vector3(
        hit.point.x * 0.3 + highPoint.x * 0.7,
        targetY,
        hit.point.z * 0.3 + highPoint.z * 0.7
      );

      const distance = finalPoint.distanceTo(playerPosition);
      if (distance <= this.MAX_ROPE_LENGTH && distance >= this.MIN_ROPE_LENGTH) {
        return finalPoint;
      }
    }

    // Fallback to original hit point
    return hit.point.clone();
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

      // Find high attach point on this tree
      const attachPoint = this.findHighAttachPoint(hit, playerPosition);

      if (attachPoint) {
        const distance = attachPoint.distanceTo(playerPosition);

        if (distance <= this.MAX_ROPE_LENGTH && distance >= this.MIN_ROPE_LENGTH) {
          // Show indicator at the HIGH attach point
          if (this.aimIndicator) {
            this.aimIndicator.position.copy(attachPoint);
            this.aimIndicator.visible = true;
            this.aimIndicatorMaterial.color.setHex(0x00ff00); // Green = valid
          }
          return attachPoint;
        } else {
          // Too far or too close
          if (this.aimIndicator) {
            this.aimIndicator.position.copy(attachPoint);
            this.aimIndicator.visible = true;
            this.aimIndicatorMaterial.color.setHex(0xff0000); // Red = invalid
          }
          return null;
        }
      }
    }

    // No hit - hide indicator
    if (this.aimIndicator) this.aimIndicator.visible = false;
    return null;
  }

  // Try to attach web - returns initial upward boost if successful
  tryAttach(playerPosition: THREE.Vector3, velocity: THREE.Vector3, swingableObjects: THREE.Object3D[]): boolean {
    // Cast ray from camera center
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(swingableObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];

      // Find high attach point
      const attachPoint = this.findHighAttachPoint(hit, playerPosition);

      if (attachPoint) {
        const distance = attachPoint.distanceTo(playerPosition);

        if (distance <= this.MAX_ROPE_LENGTH && distance >= this.MIN_ROPE_LENGTH) {
          this.attachPoint.copy(attachPoint);
          this.ropeLength = distance;
          this.initialRopeLength = distance;
          this.isSwinging = true;
          this.createWebMesh(playerPosition);

          // Hide aim indicator while swinging
          if (this.aimIndicator) this.aimIndicator.visible = false;

          // Give initial boost toward/up to the attach point!
          const toAttach = new THREE.Vector3().subVectors(attachPoint, playerPosition).normalize();
          // Add upward and forward momentum
          velocity.x += toAttach.x * 5;
          velocity.y += Math.max(5, toAttach.y * 8); // Always boost up at least a bit
          velocity.z += toAttach.z * 5;

          return true;
        }
      }
    }

    return false;
  }

  private createWebMesh(playerPosition: THREE.Vector3) {
    this.removeWebMesh();

    // Create a cylinder for the web (thicker than a line)
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
    // Rotate so it points along Z by default, we'll orient it each frame
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

  // Apply swing physics
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

    // Retract rope over time to pull player up (but not too short)
    const minRopeLength = this.initialRopeLength * this.MIN_ROPE_RATIO;
    if (this.ropeLength > minRopeLength) {
      this.ropeLength -= this.ROPE_RETRACT_SPEED * deltaTime;
      this.ropeLength = Math.max(this.ropeLength, minRopeLength);
    }

    // Apply reduced gravity while swinging
    velocity.y -= this.SWING_GRAVITY * deltaTime;

    // Pendulum constraint: if we're beyond the rope length, pull back
    if (currentDistance > this.ropeLength) {
      // Calculate how much we've overextended
      const overExtension = currentDistance - this.ropeLength;

      // Apply strong tension force toward attach point
      const tensionForce = ropeDirection.clone().multiplyScalar(this.SWING_TENSION * deltaTime);
      velocity.add(tensionForce);

      // Immediate position correction
      const correctionStrength = Math.min(overExtension, 1.0);
      const correction = ropeDirection.clone().multiplyScalar(correctionStrength);
      playerPosition.add(correction);

      // Remove velocity component moving away from attach point
      const awayVelocity = ropeDirection.dot(velocity);
      if (awayVelocity < 0) {
        velocity.sub(ropeDirection.clone().multiplyScalar(awayVelocity * 0.9));
      }
    }

    // Add swing momentum - accelerate in the swing direction
    const tangent = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), ropeDirection)
      .normalize();

    if (tangent.lengthSq() > 0.01) {
      // Add momentum in swing direction (makes swinging feel powerful)
      const swingSpeed = tangent.dot(velocity);
      const swingBoost = 8 * deltaTime; // Constant swing acceleration
      velocity.add(tangent.clone().multiplyScalar(swingBoost * Math.sign(swingSpeed || 1)));

      // Centripetal force for smooth arc
      const centripetalForce = (swingSpeed * swingSpeed) / Math.max(currentDistance, 1) * 0.3;
      velocity.add(ropeDirection.clone().multiplyScalar(centripetalForce * deltaTime));
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
