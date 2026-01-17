import * as THREE from 'three';
import type { PlayerData, Vector3 } from '@kids-game/shared';

export class RemotePlayer {
  readonly id: string;
  name: string;
  color: string;
  mesh: THREE.Group;

  // Interpolation
  private targetPosition = new THREE.Vector3();
  private targetRotationY = 0;
  private readonly LERP_SPEED = 10;

  // Web line for when swinging
  private webMesh: THREE.Mesh | null = null;
  private webMaterial: THREE.MeshBasicMaterial;

  // Name label
  private nameSprite: THREE.Sprite | null = null;

  // Body material for color updates
  private bodyMaterial: THREE.MeshStandardMaterial;

  constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.8,
      roughness: 0.2,
    });
    this.mesh = this.createMesh();
    this.webMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.createNameLabel();
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group();

    // Simplified robot spider (similar to Player but lighter for performance)
    // === BODY (uses player's custom color) ===
    const abdomenGeometry = new THREE.SphereGeometry(0.45, 12, 10);
    abdomenGeometry.scale(1, 0.8, 1.2);
    const abdomen = new THREE.Mesh(abdomenGeometry, this.bodyMaterial);
    abdomen.position.set(0, 0.5, -0.15);
    abdomen.castShadow = true;
    group.add(abdomen);

    // Thorax
    const thoraxGeometry = new THREE.SphereGeometry(0.35, 10, 8);
    thoraxGeometry.scale(1, 0.9, 0.9);
    const thorax = new THREE.Mesh(thoraxGeometry, this.bodyMaterial);
    thorax.position.set(0, 0.55, 0.2);
    thorax.castShadow = true;
    group.add(thorax);

    // Glowing ring
    const ringGeometry = new THREE.TorusGeometry(0.38, 0.02, 8, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, 0.5, 0);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // === HEAD ===
    const headGeometry = new THREE.SphereGeometry(0.22, 10, 8);
    headGeometry.scale(1, 0.9, 1.1);
    const head = new THREE.Mesh(headGeometry, this.bodyMaterial);
    head.position.set(0, 0.7, 0.45);
    head.castShadow = true;
    group.add(head);

    // === EYES (8 eyes) ===
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
    });

    // Main eyes
    const mainEyeGeometry = new THREE.SphereGeometry(0.07, 6, 6);
    const leftMainEye = new THREE.Mesh(mainEyeGeometry, eyeMaterial);
    leftMainEye.position.set(-0.09, 0.75, 0.62);
    group.add(leftMainEye);

    const rightMainEye = new THREE.Mesh(mainEyeGeometry, eyeMaterial);
    rightMainEye.position.set(0.09, 0.75, 0.62);
    group.add(rightMainEye);

    // Secondary eyes
    const secEyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const leftSecEye = new THREE.Mesh(secEyeGeometry, eyeMaterial);
    leftSecEye.position.set(-0.16, 0.73, 0.56);
    group.add(leftSecEye);

    const rightSecEye = new THREE.Mesh(secEyeGeometry, eyeMaterial);
    rightSecEye.position.set(0.16, 0.73, 0.56);
    group.add(rightSecEye);

    // Small eyes
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

    // === SIMPLIFIED LEGS (just 8 static legs) ===
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.1,
    });

    const legConfigs = [
      { x: 0.35, z: 0.25, angle: Math.PI * 0.15 },
      { x: 0.4, z: 0.05, angle: Math.PI * 0.3 },
      { x: 0.38, z: -0.15, angle: Math.PI * 0.45 },
      { x: 0.3, z: -0.3, angle: Math.PI * 0.6 },
      { x: -0.35, z: 0.25, angle: -Math.PI * 0.15 },
      { x: -0.4, z: 0.05, angle: -Math.PI * 0.3 },
      { x: -0.38, z: -0.15, angle: -Math.PI * 0.45 },
      { x: -0.3, z: -0.3, angle: -Math.PI * 0.6 },
    ];

    legConfigs.forEach(config => {
      // Upper leg
      const upperGeometry = new THREE.CylinderGeometry(0.035, 0.045, 0.5, 6);
      const upper = new THREE.Mesh(upperGeometry, legMaterial);
      upper.position.set(
        config.x + Math.sin(config.angle) * 0.2,
        0.45,
        config.z
      );
      upper.rotation.z = config.angle;
      upper.rotation.x = 0.3;
      upper.castShadow = true;
      group.add(upper);

      // Lower leg
      const lowerGeometry = new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6);
      const lower = new THREE.Mesh(lowerGeometry, legMaterial);
      lower.position.set(
        config.x + Math.sin(config.angle) * 0.5,
        0.15,
        config.z
      );
      lower.rotation.z = config.angle * 0.5;
      lower.rotation.x = -0.4;
      lower.castShadow = true;
      group.add(lower);
    });

    return group;
  }

  private createNameLabel(): void {
    // Create a canvas for the name
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 256;
    canvas.height = 64;

    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.roundRect(0, 0, canvas.width, canvas.height, 8);
    context.fill();

    // Draw text
    context.font = 'bold 32px monospace';
    context.fillStyle = '#00ffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.name, canvas.width / 2, canvas.height / 2);

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    this.nameSprite = new THREE.Sprite(spriteMaterial);
    this.nameSprite.scale.set(2, 0.5, 1);
    this.nameSprite.position.y = 1.8;
    this.mesh.add(this.nameSprite);
  }

  // Update player color
  setColor(color: string): void {
    if (this.color !== color) {
      this.color = color;
      this.bodyMaterial.color.set(color);
    }
  }

  // Update from network data
  updateFromData(data: PlayerData): void {
    this.targetPosition.set(data.x, data.y, data.z);
    this.targetRotationY = data.rotationY;

    // Update color if changed
    if (data.color !== this.color) {
      this.setColor(data.color);
    }

    // Update web line if swinging
    if (data.state === 'swinging' && data.swingAttachPoint) {
      this.updateWebLine(data.swingAttachPoint);
    } else {
      this.removeWebLine();
    }
  }

  // Interpolate toward target position
  update(deltaTime: number): void {
    // Smooth position interpolation
    this.mesh.position.lerp(this.targetPosition, Math.min(1, this.LERP_SPEED * deltaTime));

    // Smooth rotation interpolation
    const currentY = this.mesh.rotation.y;
    let deltaY = this.targetRotationY - currentY;
    // Handle wrapping
    if (deltaY > Math.PI) deltaY -= Math.PI * 2;
    if (deltaY < -Math.PI) deltaY += Math.PI * 2;
    this.mesh.rotation.y += deltaY * Math.min(1, this.LERP_SPEED * deltaTime);

    // Update web line if exists
    if (this.webMesh) {
      this.updateWebMeshPosition();
    }
  }

  private updateWebLine(attachPoint: Vector3): void {
    if (!this.webMesh) {
      const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
      geometry.rotateX(Math.PI / 2);
      this.webMesh = new THREE.Mesh(geometry, this.webMaterial);
      this.mesh.parent?.add(this.webMesh);
    }

    // Store attach point for updates
    (this.webMesh.userData as { attachPoint?: Vector3 }).attachPoint = attachPoint;
    this.updateWebMeshPosition();
  }

  private updateWebMeshPosition(): void {
    if (!this.webMesh) return;

    const attachPoint = (this.webMesh.userData as { attachPoint?: Vector3 }).attachPoint;
    if (!attachPoint) return;

    const start = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 0.5,
      this.mesh.position.z
    );
    const end = new THREE.Vector3(attachPoint.x, attachPoint.y, attachPoint.z);

    // Position at midpoint
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    this.webMesh.position.copy(midpoint);

    // Scale to length
    const length = start.distanceTo(end);
    this.webMesh.scale.set(1, 1, length);

    // Orient toward attach point
    this.webMesh.lookAt(end);
  }

  private removeWebLine(): void {
    if (this.webMesh) {
      this.webMesh.parent?.remove(this.webMesh);
      this.webMesh.geometry.dispose();
      this.webMesh = null;
    }
  }

  dispose(): void {
    this.removeWebLine();
    this.webMaterial.dispose();

    // Dispose all geometries and materials in mesh
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    if (this.nameSprite) {
      const material = this.nameSprite.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
    }
  }
}
