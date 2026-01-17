import * as THREE from 'three';
import { Input } from './Input';

export class Player {
  mesh: THREE.Group;
  velocity = new THREE.Vector3(); // Public for web swing to modify
  private input: Input;

  // Movement settings
  private readonly MOVE_SPEED = 8;
  private readonly SPRINT_MULTIPLIER = 1.8;
  private readonly JUMP_FORCE = 12;
  private readonly GRAVITY = 30;
  private readonly GROUND_FRICTION = 10;
  private readonly AIR_CONTROL = 0.3; // Reduced control while in air

  // State
  private isGrounded = true;
  private isSwinging = false;
  private cameraAngle = 0; // Y rotation from camera

  constructor(input: Input) {
    this.input = input;
    this.mesh = this.createMesh();
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body - main sphere (robot spider body)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      metalness: 0.7,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    group.add(body);

    // Head - smaller sphere
    const headGeometry = new THREE.SphereGeometry(0.25, 12, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      metalness: 0.7,
      roughness: 0.3,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.85, 0.3);
    group.add(head);

    // Eyes - glowing blue
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.9, 0.5);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.9, 0.5);
    group.add(rightEye);

    // Legs - 8 spider legs using cylinders
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    });

    const legPositions = [
      { x: 0.3, z: 0.2, angle: Math.PI * 0.15 },
      { x: 0.35, z: 0, angle: Math.PI * 0.35 },
      { x: 0.3, z: -0.2, angle: Math.PI * 0.55 },
      { x: 0.2, z: -0.35, angle: Math.PI * 0.75 },
      { x: -0.3, z: 0.2, angle: -Math.PI * 0.15 },
      { x: -0.35, z: 0, angle: -Math.PI * 0.35 },
      { x: -0.3, z: -0.2, angle: -Math.PI * 0.55 },
      { x: -0.2, z: -0.35, angle: -Math.PI * 0.75 },
    ];

    legPositions.forEach((pos) => {
      // Upper leg
      const upperLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6),
        legMaterial
      );
      upperLeg.position.set(pos.x, 0.5, pos.z);
      upperLeg.rotation.z = pos.angle;
      group.add(upperLeg);

      // Lower leg
      const lowerLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6),
        legMaterial
      );
      const offsetX = Math.sin(pos.angle) * 0.5;
      const offsetY = -Math.cos(pos.angle) * 0.3;
      lowerLeg.position.set(pos.x + offsetX, 0.2 + offsetY, pos.z);
      lowerLeg.rotation.z = pos.angle * 0.5;
      group.add(lowerLeg);
    });

    return group;
  }

  setCameraAngle(angle: number) {
    this.cameraAngle = angle;
  }

  setSwinging(swinging: boolean) {
    this.isSwinging = swinging;
    if (swinging) {
      this.isGrounded = false;
    }
  }

  update(deltaTime: number) {
    // Calculate movement direction based on input and camera angle
    const moveDirection = new THREE.Vector3();

    if (this.input.forward) moveDirection.z -= 1;
    if (this.input.backward) moveDirection.z += 1;
    if (this.input.left) moveDirection.x -= 1;
    if (this.input.right) moveDirection.x += 1;

    // Rotate movement direction by camera angle
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngle);

      // When swinging, only apply air control (reduced influence)
      if (this.isSwinging) {
        // Add slight directional influence while swinging
        this.velocity.x += moveDirection.x * this.MOVE_SPEED * this.AIR_CONTROL * deltaTime;
        this.velocity.z += moveDirection.z * this.MOVE_SPEED * this.AIR_CONTROL * deltaTime;
      } else {
        // Normal ground movement
        let speed = this.MOVE_SPEED;
        if (this.input.sprint) speed *= this.SPRINT_MULTIPLIER;

        if (this.isGrounded) {
          this.velocity.x = moveDirection.x * speed;
          this.velocity.z = moveDirection.z * speed;
        } else {
          // Air control (less responsive than ground)
          this.velocity.x += moveDirection.x * speed * this.AIR_CONTROL * deltaTime * 10;
          this.velocity.z += moveDirection.z * speed * this.AIR_CONTROL * deltaTime * 10;
        }
      }

      // Rotate player to face movement direction (slower while swinging)
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      const rotationSpeed = this.isSwinging ? 0.05 : 0.15;
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y,
        targetRotation,
        rotationSpeed
      );
    } else if (!this.isSwinging) {
      // Apply friction when not moving (only when not swinging)
      if (this.isGrounded) {
        this.velocity.x *= Math.max(0, 1 - this.GROUND_FRICTION * deltaTime);
        this.velocity.z *= Math.max(0, 1 - this.GROUND_FRICTION * deltaTime);
      }
    }

    // Jumping - can't jump while swinging
    if (this.input.jump && this.isGrounded && !this.isSwinging) {
      this.velocity.y = this.JUMP_FORCE;
      this.isGrounded = false;
    }

    // Apply gravity (only when not swinging - WebSwing handles its own gravity)
    if (!this.isSwinging) {
      this.velocity.y -= this.GRAVITY * deltaTime;
    }

    // Update position
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.y += this.velocity.y * deltaTime;
    this.mesh.position.z += this.velocity.z * deltaTime;

    // Ground collision (simple floor at y=0)
    if (this.mesh.position.y < 0) {
      this.mesh.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.isSwinging = false; // Stop swinging when hitting ground
    }
  }

  get grounded(): boolean {
    return this.isGrounded;
  }

  get swinging(): boolean {
    return this.isSwinging;
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get rotation(): THREE.Euler {
    return this.mesh.rotation;
  }
}
