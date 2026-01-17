import * as THREE from 'three';
import { Input } from './Input';

interface LegParts {
  upperLeg: THREE.Mesh;
  lowerLeg: THREE.Mesh;
  joint: THREE.Mesh;
  baseAngle: number;
  baseX: number;
  baseZ: number;
  phase: number;
}

export class Player {
  mesh: THREE.Group;
  velocity = new THREE.Vector3();
  private input: Input;

  // Movement settings
  private readonly MOVE_SPEED = 8;
  private readonly SPRINT_MULTIPLIER = 1.8;
  private readonly JUMP_FORCE = 12;
  private readonly GRAVITY = 30;
  private readonly GROUND_FRICTION = 10;
  private readonly AIR_CONTROL = 0.3;

  // State
  private isGrounded = true;
  private isSwinging = false;
  private cameraAngle = 0;

  // Animation
  private legs: LegParts[] = [];
  private animationTime = 0;
  private eyeGlowMaterial: THREE.MeshStandardMaterial | null = null;
  private bodyGlowRing: THREE.Mesh | null = null;

  constructor(input: Input) {
    this.input = input;
    this.mesh = this.createMesh();
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group();

    // === BODY ===
    // Main abdomen (larger back section)
    const abdomenGeometry = new THREE.SphereGeometry(0.45, 20, 16);
    abdomenGeometry.scale(1, 0.8, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xdd1111,
      metalness: 0.8,
      roughness: 0.2,
    });
    const abdomen = new THREE.Mesh(abdomenGeometry, bodyMaterial);
    abdomen.position.set(0, 0.5, -0.15);
    abdomen.castShadow = true;
    group.add(abdomen);

    // Thorax (middle section)
    const thoraxGeometry = new THREE.SphereGeometry(0.35, 16, 12);
    thoraxGeometry.scale(1, 0.9, 0.9);
    const thorax = new THREE.Mesh(thoraxGeometry, bodyMaterial);
    thorax.position.set(0, 0.55, 0.2);
    thorax.castShadow = true;
    group.add(thorax);

    // Glowing ring around body (tech spider detail)
    const ringGeometry = new THREE.TorusGeometry(0.38, 0.02, 8, 24);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, 0.5, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    this.bodyGlowRing = ring;

    // Tech patterns on abdomen (circuit lines)
    this.addCircuitPattern(group, abdomen.position, 0.45);

    // === HEAD ===
    const headGeometry = new THREE.SphereGeometry(0.22, 14, 10);
    headGeometry.scale(1, 0.9, 1.1);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xdd1111,
      metalness: 0.8,
      roughness: 0.2,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.7, 0.45);
    head.castShadow = true;
    group.add(head);

    // === EYES (8 eyes like a spider!) ===
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
    });
    this.eyeGlowMaterial = eyeMaterial;

    // Main front eyes (larger)
    const mainEyeGeometry = new THREE.SphereGeometry(0.07, 8, 8);
    const leftMainEye = new THREE.Mesh(mainEyeGeometry, eyeMaterial);
    leftMainEye.position.set(-0.09, 0.75, 0.62);
    group.add(leftMainEye);

    const rightMainEye = new THREE.Mesh(mainEyeGeometry, eyeMaterial);
    rightMainEye.position.set(0.09, 0.75, 0.62);
    group.add(rightMainEye);

    // Secondary eyes (medium)
    const secEyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const leftSecEye = new THREE.Mesh(secEyeGeometry, eyeMaterial);
    leftSecEye.position.set(-0.16, 0.73, 0.56);
    group.add(leftSecEye);

    const rightSecEye = new THREE.Mesh(secEyeGeometry, eyeMaterial);
    rightSecEye.position.set(0.16, 0.73, 0.56);
    group.add(rightSecEye);

    // Small side eyes
    const smallEyeGeometry = new THREE.SphereGeometry(0.035, 6, 6);
    const positions = [
      { x: -0.18, y: 0.68, z: 0.48 },
      { x: 0.18, y: 0.68, z: 0.48 },
      { x: -0.1, y: 0.82, z: 0.58 },
      { x: 0.1, y: 0.82, z: 0.58 },
    ];
    positions.forEach(pos => {
      const eye = new THREE.Mesh(smallEyeGeometry, eyeMaterial);
      eye.position.set(pos.x, pos.y, pos.z);
      group.add(eye);
    });

    // === MANDIBLES ===
    const mandibleGeometry = new THREE.ConeGeometry(0.03, 0.12, 6);
    const mandibleMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.1,
    });

    const leftMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
    leftMandible.position.set(-0.06, 0.62, 0.6);
    leftMandible.rotation.x = Math.PI * 0.7;
    leftMandible.rotation.z = 0.2;
    group.add(leftMandible);

    const rightMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial);
    rightMandible.position.set(0.06, 0.62, 0.6);
    rightMandible.rotation.x = Math.PI * 0.7;
    rightMandible.rotation.z = -0.2;
    group.add(rightMandible);

    // === LEGS (8 articulated legs) ===
    this.createLegs(group);

    // Point light for eye glow effect
    const eyeLight = new THREE.PointLight(0x00ffff, 0.3, 3);
    eyeLight.position.set(0, 0.75, 0.6);
    group.add(eyeLight);

    return group;
  }

  private addCircuitPattern(group: THREE.Group, center: THREE.Vector3, radius: number) {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
    });

    // Horizontal circuit lines
    for (let i = 0; i < 3; i++) {
      const y = center.y - 0.15 + i * 0.15;
      const points = [];
      for (let j = 0; j <= 12; j++) {
        const angle = (j / 12) * Math.PI - Math.PI / 2;
        const r = radius * Math.cos(angle) * 0.9;
        points.push(new THREE.Vector3(
          Math.sin(angle) * r * 0.8,
          y,
          center.z + Math.cos(angle) * r * 0.3
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      group.add(line);
    }
  }

  private createLegs(group: THREE.Group) {
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.1,
    });

    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.4,
    });

    // Leg attachment points and angles
    const legConfigs = [
      // Right side (front to back)
      { x: 0.28, z: 0.25, angle: Math.PI * 0.1, phase: 0 },
      { x: 0.32, z: 0.08, angle: Math.PI * 0.25, phase: 0.5 },
      { x: 0.30, z: -0.1, angle: Math.PI * 0.4, phase: 1 },
      { x: 0.25, z: -0.25, angle: Math.PI * 0.55, phase: 0.5 },
      // Left side (front to back)
      { x: -0.28, z: 0.25, angle: -Math.PI * 0.1, phase: 0.5 },
      { x: -0.32, z: 0.08, angle: -Math.PI * 0.25, phase: 0 },
      { x: -0.30, z: -0.1, angle: -Math.PI * 0.4, phase: 0.5 },
      { x: -0.25, z: -0.25, angle: -Math.PI * 0.55, phase: 1 },
    ];

    legConfigs.forEach((config) => {
      const legParts = this.createSingleLeg(
        group,
        config.x,
        config.z,
        config.angle,
        config.phase,
        legMaterial,
        jointMaterial
      );
      this.legs.push(legParts);
    });
  }

  private createSingleLeg(
    group: THREE.Group,
    baseX: number,
    baseZ: number,
    baseAngle: number,
    phase: number,
    legMaterial: THREE.MeshStandardMaterial,
    jointMaterial: THREE.MeshStandardMaterial
  ): LegParts {
    // Upper leg (coxa + femur)
    const upperLegGeometry = new THREE.CylinderGeometry(0.035, 0.045, 0.5, 8);
    const upperLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
    upperLeg.castShadow = true;
    group.add(upperLeg);

    // Glowing joint
    const jointGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const joint = new THREE.Mesh(jointGeometry, jointMaterial);
    group.add(joint);

    // Lower leg (tibia + tarsus)
    const lowerLegGeometry = new THREE.CylinderGeometry(0.025, 0.035, 0.6, 8);
    const lowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
    lowerLeg.castShadow = true;
    group.add(lowerLeg);

    // Foot tip (glowing)
    const footGeometry = new THREE.SphereGeometry(0.03, 6, 6);
    const foot = new THREE.Mesh(footGeometry, jointMaterial);
    lowerLeg.add(foot);
    foot.position.y = -0.3;

    return {
      upperLeg,
      lowerLeg,
      joint,
      baseAngle,
      baseX,
      baseZ,
      phase,
    };
  }

  private updateLegPositions(speed: number) {
    const walkCycle = this.animationTime * 8;

    this.legs.forEach((leg) => {
      const isRightSide = leg.baseX > 0;
      const sideMultiplier = isRightSide ? 1 : -1;

      // Walking animation offset based on phase and speed
      const phaseOffset = Math.sin(walkCycle + leg.phase * Math.PI * 2) * speed * 0.15;
      const liftOffset = Math.max(0, Math.sin(walkCycle + leg.phase * Math.PI * 2)) * speed * 0.1;

      // Upper leg positioning
      const upperAngle = leg.baseAngle + phaseOffset;
      const upperLength = 0.25;

      // Position upper leg
      leg.upperLeg.position.set(
        leg.baseX + Math.sin(upperAngle) * upperLength * 0.5,
        0.5 + liftOffset * 0.5,
        leg.baseZ + Math.cos(Math.abs(upperAngle)) * upperLength * 0.3 * sideMultiplier * -1
      );
      leg.upperLeg.rotation.z = upperAngle;
      leg.upperLeg.rotation.x = 0.3 - liftOffset;

      // Joint at end of upper leg
      const jointX = leg.baseX + Math.sin(upperAngle) * 0.45;
      const jointY = 0.35 + liftOffset;
      const jointZ = leg.baseZ + Math.cos(Math.abs(upperAngle)) * 0.15 * sideMultiplier * -1;
      leg.joint.position.set(jointX, jointY, jointZ);

      // Lower leg extends down and out from joint
      const lowerAngle = upperAngle * 0.3;
      leg.lowerLeg.position.set(
        jointX + Math.sin(upperAngle) * 0.25,
        jointY - 0.25 + liftOffset * 0.3,
        jointZ
      );
      leg.lowerLeg.rotation.z = lowerAngle;
      leg.lowerLeg.rotation.x = -0.5 - phaseOffset * 0.5;
    });
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
    this.animationTime += deltaTime;

    // Calculate movement direction based on input and camera angle
    const moveDirection = new THREE.Vector3();

    if (this.input.forward) moveDirection.z -= 1;
    if (this.input.backward) moveDirection.z += 1;
    if (this.input.left) moveDirection.x -= 1;
    if (this.input.right) moveDirection.x += 1;

    // Calculate movement speed for animation
    const horizontalSpeed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z
    );
    const normalizedSpeed = Math.min(horizontalSpeed / this.MOVE_SPEED, 1);

    // Update leg animation
    this.updateLegPositions(this.isGrounded ? normalizedSpeed : 0.2);

    // Pulse eye glow when moving fast or swinging
    if (this.eyeGlowMaterial) {
      const intensity = this.isSwinging
        ? 1.2 + Math.sin(this.animationTime * 10) * 0.3
        : 0.6 + normalizedSpeed * 0.4;
      this.eyeGlowMaterial.emissiveIntensity = intensity;
    }

    // Pulse body ring
    if (this.bodyGlowRing) {
      const ringMat = this.bodyGlowRing.material as THREE.MeshStandardMaterial;
      ringMat.emissiveIntensity = 0.3 + Math.sin(this.animationTime * 4) * 0.2;
    }

    // Rotate movement direction by camera angle
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngle);

      // When swinging, only apply air control (reduced influence)
      if (this.isSwinging) {
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
      this.isSwinging = false;
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
