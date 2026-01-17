import * as THREE from 'three';

export interface TreeData {
  group: THREE.Group;
  x: number;
  z: number;
  trunkRadius: number;
}

export class TechnoJungle {
  private scene: THREE.Scene;

  // Swingable objects for web attachment
  swingableObjects: THREE.Object3D[] = [];

  // Tree collision data (also includes building walls)
  treeColliders: Array<{ x: number; z: number; radius: number }> = [];

  // Building colliders (rectangular)
  buildingColliders: Array<{ x: number; z: number; width: number; depth: number }> = [];

  // Terrain for raycasting
  private groundMesh: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private downVector = new THREE.Vector3(0, -1, 0);

  // Animated elements
  private glowingPlants: THREE.Mesh[] = [];
  private mushrooms: THREE.Mesh[] = [];
  private circuitLines: THREE.Line[] = [];
  private torches: THREE.Mesh[] = []; // Flame meshes for animation
  private torchPositions: THREE.Vector3[] = []; // For baking lighting
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createSky();
    this.createTerrain();
    this.createTrees();
    this.createRuins();
    this.createBuildings();
    this.createGlowingPlants();
    this.createMushrooms();
    this.createTorches();
    this.bakeTorchLighting(); // Bake torch light into ground vertex colors
    this.createTallGrass();
    this.createFerns();
    this.createFlowers();
    this.createTechDebris();
    this.createFloatingParticles();
  }

  private createSky() {
    // === STARS ===
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Distribute stars on a dome above the world
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // Only upper hemisphere
      const radius = 300 + Math.random() * 100;

      starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      starPositions[i * 3 + 1] = Math.cos(phi) * radius + 50; // Offset upward
      starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);

    // === TWO MOONS ===
    // Moon 1 - larger, white
    const moon1Geometry = new THREE.SphereGeometry(15, 32, 32);
    const moon1Material = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      roughness: 0.8,
    });
    const moon1 = new THREE.Mesh(moon1Geometry, moon1Material);
    moon1.position.set(100, 80, -100);
    this.scene.add(moon1);

    // Moon 2 - smaller, slightly blue tint
    const moon2Geometry = new THREE.SphereGeometry(8, 24, 24);
    const moon2Material = new THREE.MeshStandardMaterial({
      color: 0xddddff,
      emissive: 0xaaaaff,
      emissiveIntensity: 0.2,
      roughness: 0.8,
    });
    const moon2 = new THREE.Mesh(moon2Geometry, moon2Material);
    moon2.position.set(-80, 60, 50);
    this.scene.add(moon2);

    // === MOONLIGHT (subtle ambient) ===
    const moonLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(moonLight);
  }

  // Get terrain height at any x,z position using raycast (accurate to visual mesh)
  getHeightAt(x: number, z: number): number {
    if (!this.groundMesh) return 0;

    // Ensure the ground mesh has up-to-date world matrix for accurate raycasting
    this.groundMesh.updateMatrixWorld(true);

    // Cast ray from high above straight down
    const origin = new THREE.Vector3(x, 100, z);
    this.raycaster.set(origin, this.downVector);

    const intersects = this.raycaster.intersectObject(this.groundMesh);
    if (intersects.length > 0) {
      return intersects[0].point.y;
    }

    return 0; // Fallback if no hit
  }

  private createTerrain() {
    // Main ground with height variation (4x larger world)
    const groundSize = 400;
    const segments = 120; // More segments for larger world
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);

    // Add rolling hills - can be more dramatic now that we use raycasting
    const positions = groundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const gz = positions.getY(i); // geometry Y = -worldZ after rotation

      // More interesting terrain with multiple frequencies
      const height =
        Math.sin(x * 0.04) * Math.cos(gz * 0.04) * 2.5 +
        Math.sin(x * 0.02 + gz * 0.025) * 1.5 +
        Math.sin(x * 0.08) * Math.cos(gz * 0.06) * 0.5;

      // Keep area near spawn flat
      const worldZ = -gz;
      const distFromCenter = Math.sqrt(x * x + worldZ * worldZ);
      const flattenFactor = Math.min(1, distFromCenter / 15);

      positions.setZ(i, height * flattenFactor);
    }
    groundGeometry.computeVertexNormals();

    // Ground material - darker green with tech tint, vertex colors for baked lighting
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3a1a,
      roughness: 0.9,
      metalness: 0.1,
      vertexColors: true,
    });

    // Initialize vertex colors to base color (will be modified by torch baking)
    const vertexCount = groundGeometry.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = 1;     // R
      colors[i * 3 + 1] = 1; // G
      colors[i * 3 + 2] = 1; // B
    }
    groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Ensure world matrix is computed for accurate raycasting
    ground.updateMatrixWorld(true);

    // Store reference for raycasting
    this.groundMesh = ground;

    // IMPORTANT: Update world matrix so raycasting works correctly
    ground.updateMatrixWorld(true);

    // Add glowing grid lines on ground (tech feel)
    this.createGroundGrid();
  }

  private createGroundGrid() {
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.15,
    });

    const gridSize = 400;
    const gridSpacing = 20; // Larger spacing for bigger world

    for (let i = -gridSize / 2; i <= gridSize / 2; i += gridSpacing) {
      // X lines
      const xPoints = [
        new THREE.Vector3(i, 0.02, -gridSize / 2),
        new THREE.Vector3(i, 0.02, gridSize / 2),
      ];
      const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
      const xLine = new THREE.Line(xGeometry, gridMaterial);
      this.scene.add(xLine);

      // Z lines
      const zPoints = [
        new THREE.Vector3(-gridSize / 2, 0.02, i),
        new THREE.Vector3(gridSize / 2, 0.02, i),
      ];
      const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
      const zLine = new THREE.Line(zGeometry, gridMaterial);
      this.scene.add(zLine);
    }
  }

  private createTrees() {
    // Create varied techno-trees throughout the larger world
    // More trees for 4x larger area (roughly 2x more since density can be lower)
    for (let i = 0; i < 120; i++) {
      const angle = (i / 120) * Math.PI * 2;
      const radius = 15 + Math.random() * 170; // Extended for 400x400 world
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 40;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 40;

      // Don't place too close to spawn
      if (Math.abs(x) > 10 || Math.abs(z) > 10) {
        const height = 14 + Math.random() * 12;
        const treeType = Math.floor(Math.random() * 3);
        this.addTechnoTree(x, z, height, treeType);
      }
    }
  }

  private addTechnoTree(x: number, z: number, height: number, type: number) {
    const group = new THREE.Group();
    const trunkRadius = 0.6 + Math.random() * 0.3;

    // Trunk with circuit patterns
    const trunkGeometry = new THREE.CylinderGeometry(
      trunkRadius * 0.7,
      trunkRadius,
      height,
      12
    );

    // Dark metallic bark
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.7,
      metalness: 0.3,
    });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Add glowing circuit lines on trunk
    this.addCircuitLines(trunk, trunkRadius, height, group);

    // Canopy based on tree type
    switch (type) {
      case 0:
        this.addGlowingCanopy(group, height, 0x00ff66); // Green glow
        break;
      case 1:
        this.addGlowingCanopy(group, height, 0x00ffff); // Cyan glow
        break;
      case 2:
        this.addCrystalCanopy(group, height); // Crystal formation
        break;
    }

    // Add some branches with lights
    this.addTechBranches(group, height, trunkRadius);

    group.position.set(x, this.getHeightAt(x, z), z);
    this.scene.add(group);
    this.swingableObjects.push(group);
    this.treeColliders.push({ x, z, radius: trunkRadius + 0.5 });
  }

  private addCircuitLines(
    trunk: THREE.Mesh,
    radius: number,
    height: number,
    group: THREE.Group
  ) {
    const circuitMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8,
    });

    // Create vertical circuit lines
    const numLines = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const points: THREE.Vector3[] = [];

      let y = 0;
      while (y < height - 1) {
        const r = radius * 0.72 + Math.sin(y * 2) * 0.02;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * r,
            y + height * 0.1,
            Math.sin(angle) * r
          )
        );

        // Occasionally branch sideways
        if (Math.random() > 0.7 && points.length > 1) {
          const branchAngle = angle + (Math.random() - 0.5) * 0.5;
          points.push(
            new THREE.Vector3(
              Math.cos(branchAngle) * r,
              y + height * 0.1,
              Math.sin(branchAngle) * r
            )
          );
        }

        y += 0.5 + Math.random() * 0.5;
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, circuitMaterial);
      group.add(line);
      this.circuitLines.push(line);
    }
  }

  private addGlowingCanopy(group: THREE.Group, height: number, color: number) {
    // Multiple overlapping spheres for organic look
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      roughness: 0.6,
      transparent: true,
      opacity: 0.9,
    });

    // Main canopy
    const mainSize = 2.5 + Math.random();
    const mainGeometry = new THREE.SphereGeometry(mainSize, 12, 10);
    const mainCanopy = new THREE.Mesh(mainGeometry, canopyMaterial);
    mainCanopy.position.y = height + mainSize * 0.3;
    mainCanopy.castShadow = true;
    group.add(mainCanopy);

    // Smaller accent spheres
    for (let i = 0; i < 3; i++) {
      const size = 1 + Math.random() * 0.8;
      const geometry = new THREE.SphereGeometry(size, 8, 6);
      const sphere = new THREE.Mesh(geometry, canopyMaterial);
      sphere.position.set(
        (Math.random() - 0.5) * 2,
        height + Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      group.add(sphere);
    }

    // Emissive material provides glow without expensive point lights
  }

  private addCrystalCanopy(group: THREE.Group, height: number) {
    // Crystal formations on top
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });

    const numCrystals = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numCrystals; i++) {
      const crystalHeight = 1 + Math.random() * 2;
      const geometry = new THREE.ConeGeometry(0.3, crystalHeight, 5);
      const crystal = new THREE.Mesh(geometry, crystalMaterial);

      const angle = (i / numCrystals) * Math.PI * 2;
      const radius = Math.random() * 1.2;
      crystal.position.set(
        Math.cos(angle) * radius,
        height + crystalHeight / 2,
        Math.sin(angle) * radius
      );
      crystal.rotation.x = (Math.random() - 0.5) * 0.4;
      crystal.rotation.z = (Math.random() - 0.5) * 0.4;
      group.add(crystal);
    }

    // Central larger crystal
    const mainCrystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 3, 6),
      crystalMaterial
    );
    mainCrystal.position.y = height + 1.5;
    group.add(mainCrystal);
  }

  private addTechBranches(group: THREE.Group, height: number, trunkRadius: number) {
    const branchMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.8,
      metalness: 0.2,
    });

    const numBranches = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numBranches; i++) {
      const branchHeight = height * (0.4 + Math.random() * 0.4);
      const angle = (i / numBranches) * Math.PI * 2 + Math.random() * 0.5;
      const length = 1.5 + Math.random() * 2;

      const geometry = new THREE.CylinderGeometry(0.08, 0.12, length, 6);
      geometry.rotateZ(Math.PI / 2 - 0.3);

      const branch = new THREE.Mesh(geometry, branchMaterial);
      branch.position.set(
        Math.cos(angle) * (trunkRadius + length / 2),
        branchHeight,
        Math.sin(angle) * (trunkRadius + length / 2)
      );
      branch.rotation.y = -angle;
      group.add(branch);

      // Small light at end of some branches
      if (Math.random() > 0.5) {
        const lightColor = Math.random() > 0.5 ? 0x00ffff : 0x00ff88;
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 6, 6),
          new THREE.MeshStandardMaterial({
            color: lightColor,
            emissive: lightColor,
            emissiveIntensity: 0.6,
          })
        );
        orb.position.set(
          Math.cos(angle) * (trunkRadius + length),
          branchHeight,
          Math.sin(angle) * (trunkRadius + length)
        );
        group.add(orb);
      }
    }
  }

  // === RUINS ===
  private createRuins() {
    // Scatter ancient ruins around the world (6 sites)
    const ruinPositions = [
      { x: 60, z: 60 },
      { x: -70, z: 40 },
      { x: 50, z: -80 },
      { x: -60, z: -60 },
      { x: 80, z: -20 },
      { x: -40, z: 70 },
    ];

    ruinPositions.forEach(pos => {
      this.addRuin(pos.x, pos.z);
    });
  }

  private addRuin(x: number, z: number) {
    const group = new THREE.Group();
    const height = this.getHeightAt(x, z);

    // Stone material for walls
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x666655,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Mossy stone material
    const mossyMaterial = new THREE.MeshStandardMaterial({
      color: 0x445544,
      roughness: 0.95,
      metalness: 0.05,
    });

    // Partial walls (2-4 per ruin)
    const numWalls = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numWalls; i++) {
      const wallWidth = 3 + Math.random() * 4;
      const wallHeight = 1.5 + Math.random() * 2;
      const wallDepth = 0.4 + Math.random() * 0.2;

      const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
      const wall = new THREE.Mesh(wallGeometry, Math.random() > 0.5 ? stoneMaterial : mossyMaterial);

      const angle = (i / numWalls) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 2 + Math.random() * 3;
      wall.position.set(
        Math.cos(angle) * dist,
        wallHeight / 2,
        Math.sin(angle) * dist
      );
      wall.rotation.y = angle + Math.PI / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }

    // Broken columns (2-3 per ruin)
    const numColumns = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numColumns; i++) {
      const columnHeight = 1 + Math.random() * 2;
      const columnRadius = 0.3 + Math.random() * 0.2;

      const columnGeometry = new THREE.CylinderGeometry(columnRadius * 0.8, columnRadius, columnHeight, 8);
      const column = new THREE.Mesh(columnGeometry, stoneMaterial);

      const angle = Math.random() * Math.PI * 2;
      const dist = 1 + Math.random() * 4;
      column.position.set(
        Math.cos(angle) * dist,
        columnHeight / 2,
        Math.sin(angle) * dist
      );
      // Slight tilt for ruined look
      column.rotation.x = (Math.random() - 0.5) * 0.2;
      column.rotation.z = (Math.random() - 0.5) * 0.2;
      column.castShadow = true;
      group.add(column);
    }

    // Dig pit with glowing artifact
    const pitGeometry = new THREE.CylinderGeometry(1.5, 1.2, 0.5, 12);
    const pitMaterial = new THREE.MeshStandardMaterial({
      color: 0x332211,
      roughness: 1,
    });
    const pit = new THREE.Mesh(pitGeometry, pitMaterial);
    pit.position.y = -0.2;
    group.add(pit);

    // Glowing artifact in the pit
    const artifactGeometry = new THREE.OctahedronGeometry(0.3, 0);
    const artifactMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
    });
    const artifact = new THREE.Mesh(artifactGeometry, artifactMaterial);
    artifact.position.y = 0.2;
    artifact.rotation.y = Math.random() * Math.PI;
    group.add(artifact);

    group.position.set(x, height, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
  }

  // === BUILDINGS ===
  private createBuildings() {
    // Create houses scattered around the world (10 buildings)
    const buildingPositions = [
      { x: 25, z: 35, size: 'small' },
      { x: -30, z: 25, size: 'small' },
      { x: 40, z: -30, size: 'large' },
      { x: -45, z: -40, size: 'small' },
      { x: 70, z: 50, size: 'large' },
      { x: -80, z: 20, size: 'small' },
      { x: 55, z: -70, size: 'small' },
      { x: -55, z: 80, size: 'large' },
      { x: 90, z: -60, size: 'small' },
      { x: -70, z: -80, size: 'small' },
    ];

    buildingPositions.forEach(pos => {
      if (pos.size === 'large') {
        this.addLargeBuilding(pos.x, pos.z);
      } else {
        this.addSmallCottage(pos.x, pos.z);
      }
    });
  }

  private addSmallCottage(x: number, z: number) {
    const group = new THREE.Group();
    const height = this.getHeightAt(x, z);

    const width = 6;
    const depth = 5;
    const wallHeight = 3;

    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Floor
    const floorGeometry = new THREE.BoxGeometry(width, 0.2, depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0.1;
    floor.receiveShadow = true;
    group.add(floor);

    // Back wall (solid)
    const backWallGeometry = new THREE.BoxGeometry(width, wallHeight, 0.3);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2, -depth / 2 + 0.15);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    // Front wall with doorway
    const doorWidth = 1.2;
    const doorHeight = 2.2;

    // Left part of front wall
    const frontLeftGeometry = new THREE.BoxGeometry((width - doorWidth) / 2, wallHeight, 0.3);
    const frontLeft = new THREE.Mesh(frontLeftGeometry, wallMaterial);
    frontLeft.position.set(-(width + doorWidth) / 4, wallHeight / 2, depth / 2 - 0.15);
    frontLeft.castShadow = true;
    group.add(frontLeft);

    // Right part of front wall
    const frontRight = new THREE.Mesh(frontLeftGeometry, wallMaterial);
    frontRight.position.set((width + doorWidth) / 4, wallHeight / 2, depth / 2 - 0.15);
    frontRight.castShadow = true;
    group.add(frontRight);

    // Above door
    const aboveDoorGeometry = new THREE.BoxGeometry(doorWidth, wallHeight - doorHeight, 0.3);
    const aboveDoor = new THREE.Mesh(aboveDoorGeometry, wallMaterial);
    aboveDoor.position.set(0, doorHeight + (wallHeight - doorHeight) / 2, depth / 2 - 0.15);
    group.add(aboveDoor);

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(0.3, wallHeight, depth);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-width / 2 + 0.15, wallHeight / 2, 0);
    leftWall.castShadow = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(width / 2 - 0.15, wallHeight / 2, 0);
    rightWall.castShadow = true;
    group.add(rightWall);

    // Roof (simple triangular prism)
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x553322,
      roughness: 0.7,
    });
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-width / 2 - 0.5, 0);
    roofShape.lineTo(0, 2);
    roofShape.lineTo(width / 2 + 0.5, 0);
    roofShape.lineTo(-width / 2 - 0.5, 0);

    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, {
      depth: depth + 1,
      bevelEnabled: false,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.x = Math.PI / 2;
    roof.position.set(0, wallHeight, -depth / 2 - 0.5);
    roof.castShadow = true;
    group.add(roof);

    // Simple furniture - table
    const tableGeometry = new THREE.BoxGeometry(1.5, 0.1, 1);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(-1.5, 0.8, -1);
    group.add(table);

    // Table legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const legPositions = [
      { x: -2.1, z: -1.4 },
      { x: -0.9, z: -1.4 },
      { x: -2.1, z: -0.6 },
      { x: -0.9, z: -0.6 },
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, tableMaterial);
      leg.position.set(pos.x, 0.4, pos.z);
      group.add(leg);
    });

    // Picture frame on back wall
    this.addPictureFrame(group, 0, wallHeight / 2 + 0.5, -depth / 2 + 0.3, 0);

    group.position.set(x, height, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);

    // Add collision
    this.buildingColliders.push({ x, z, width, depth });
  }

  private addLargeBuilding(x: number, z: number) {
    const group = new THREE.Group();
    const height = this.getHeightAt(x, z);

    const width = 12;
    const depth = 10;
    const wallHeight = 4;

    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x9a8a7a,
      roughness: 0.75,
      metalness: 0.15,
    });

    // Floor
    const floorGeometry = new THREE.BoxGeometry(width, 0.2, depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a4738,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0.1;
    floor.receiveShadow = true;
    group.add(floor);

    // Back wall with window
    const windowWidth = 2;
    const windowHeight = 1.5;
    const windowY = 2;

    // Back wall left
    const backLeftGeometry = new THREE.BoxGeometry((width - windowWidth) / 2, wallHeight, 0.3);
    const backLeft = new THREE.Mesh(backLeftGeometry, wallMaterial);
    backLeft.position.set(-(width + windowWidth) / 4, wallHeight / 2, -depth / 2 + 0.15);
    backLeft.castShadow = true;
    group.add(backLeft);

    // Back wall right
    const backRight = new THREE.Mesh(backLeftGeometry, wallMaterial);
    backRight.position.set((width + windowWidth) / 4, wallHeight / 2, -depth / 2 + 0.15);
    backRight.castShadow = true;
    group.add(backRight);

    // Above window
    const aboveWindowGeometry = new THREE.BoxGeometry(windowWidth, wallHeight - windowY - windowHeight, 0.3);
    const aboveWindow = new THREE.Mesh(aboveWindowGeometry, wallMaterial);
    aboveWindow.position.set(0, windowY + windowHeight + (wallHeight - windowY - windowHeight) / 2, -depth / 2 + 0.15);
    group.add(aboveWindow);

    // Below window
    const belowWindowGeometry = new THREE.BoxGeometry(windowWidth, windowY - windowHeight / 2, 0.3);
    const belowWindow = new THREE.Mesh(belowWindowGeometry, wallMaterial);
    belowWindow.position.set(0, (windowY - windowHeight / 2) / 2, -depth / 2 + 0.15);
    group.add(belowWindow);

    // Front wall with double doorway
    const doorWidth = 2.5;
    const doorHeight = 2.8;

    const frontLeftGeometry = new THREE.BoxGeometry((width - doorWidth) / 2, wallHeight, 0.3);
    const frontLeft = new THREE.Mesh(frontLeftGeometry, wallMaterial);
    frontLeft.position.set(-(width + doorWidth) / 4, wallHeight / 2, depth / 2 - 0.15);
    frontLeft.castShadow = true;
    group.add(frontLeft);

    const frontRight = new THREE.Mesh(frontLeftGeometry, wallMaterial);
    frontRight.position.set((width + doorWidth) / 4, wallHeight / 2, depth / 2 - 0.15);
    frontRight.castShadow = true;
    group.add(frontRight);

    const aboveDoorGeometry = new THREE.BoxGeometry(doorWidth, wallHeight - doorHeight, 0.3);
    const aboveDoor = new THREE.Mesh(aboveDoorGeometry, wallMaterial);
    aboveDoor.position.set(0, doorHeight + (wallHeight - doorHeight) / 2, depth / 2 - 0.15);
    group.add(aboveDoor);

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(0.3, wallHeight, depth);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-width / 2 + 0.15, wallHeight / 2, 0);
    leftWall.castShadow = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(width / 2 - 0.15, wallHeight / 2, 0);
    rightWall.castShadow = true;
    group.add(rightWall);

    // Flat roof
    const roofGeometry = new THREE.BoxGeometry(width + 1, 0.3, depth + 1);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x443333,
      roughness: 0.8,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = wallHeight + 0.15;
    roof.castShadow = true;
    group.add(roof);

    // Interior dividing wall
    const dividerGeometry = new THREE.BoxGeometry(0.2, wallHeight - 0.5, depth * 0.4);
    const divider = new THREE.Mesh(dividerGeometry, wallMaterial);
    divider.position.set(width / 4, (wallHeight - 0.5) / 2, -depth / 4);
    group.add(divider);

    // Furniture - bed
    const bedBaseGeometry = new THREE.BoxGeometry(2, 0.4, 3);
    const bedMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const bedBase = new THREE.Mesh(bedBaseGeometry, bedMaterial);
    bedBase.position.set(-width / 3, 0.4, -depth / 3);
    group.add(bedBase);

    const mattressGeometry = new THREE.BoxGeometry(1.8, 0.3, 2.8);
    const mattressMaterial = new THREE.MeshStandardMaterial({ color: 0xddd8c4 });
    const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
    mattress.position.set(-width / 3, 0.75, -depth / 3);
    group.add(mattress);

    // Multiple picture frames
    this.addPictureFrame(group, -3, wallHeight / 2 + 0.5, -depth / 2 + 0.3, 0);
    this.addPictureFrame(group, 3, wallHeight / 2 + 0.5, -depth / 2 + 0.3, 0);
    this.addPictureFrame(group, -width / 2 + 0.3, wallHeight / 2 + 0.5, 0, Math.PI / 2);

    group.position.set(x, height, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);

    // Add collision
    this.buildingColliders.push({ x, z, width, depth });
  }

  private addPictureFrame(parent: THREE.Group, x: number, y: number, z: number, rotationY: number) {
    const frameGroup = new THREE.Group();

    // Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3520,
      roughness: 0.7,
    });

    const frameWidth = 1.2;
    const frameHeight = 0.9;
    const frameDepth = 0.05;
    const borderWidth = 0.08;

    // Frame border pieces
    const topGeometry = new THREE.BoxGeometry(frameWidth, borderWidth, frameDepth);
    const top = new THREE.Mesh(topGeometry, frameMaterial);
    top.position.y = frameHeight / 2 - borderWidth / 2;
    frameGroup.add(top);

    const bottom = new THREE.Mesh(topGeometry, frameMaterial);
    bottom.position.y = -frameHeight / 2 + borderWidth / 2;
    frameGroup.add(bottom);

    const sideGeometry = new THREE.BoxGeometry(borderWidth, frameHeight, frameDepth);
    const left = new THREE.Mesh(sideGeometry, frameMaterial);
    left.position.x = -frameWidth / 2 + borderWidth / 2;
    frameGroup.add(left);

    const right = new THREE.Mesh(sideGeometry, frameMaterial);
    right.position.x = frameWidth / 2 - borderWidth / 2;
    frameGroup.add(right);

    // Picture canvas (colored rectangle to simulate image)
    const canvasGeometry = new THREE.PlaneGeometry(frameWidth - borderWidth * 2, frameHeight - borderWidth * 2);
    const colors = [0x4488aa, 0x88aa44, 0xaa4488, 0x44aa88, 0x8844aa];
    const canvasMaterial = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.5,
    });
    const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvas.position.z = -0.01;
    frameGroup.add(canvas);

    frameGroup.position.set(x, y, z);
    frameGroup.rotation.y = rotationY;
    parent.add(frameGroup);
  }

  private createGlowingPlants() {
    // Scatter glowing plants around the larger world
    const plantColors = [0x00ff66, 0x00ffaa, 0x66ff00, 0x00ff88];

    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 360; // Extended for 400x400 world
      const z = (Math.random() - 0.5) * 360;

      // Don't place at spawn or too close to trees
      if (Math.sqrt(x * x + z * z) < 8) continue;

      const color = plantColors[Math.floor(Math.random() * plantColors.length)];
      this.addGlowingPlant(x, z, color);
    }
  }

  private addGlowingPlant(x: number, z: number, color: number) {
    const group = new THREE.Group();

    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.03, 0.05, 0.5, 6);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x004400,
      roughness: 0.8,
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.25;
    group.add(stem);

    // Glowing flower/leaf
    const petalGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    petalGeometry.scale(1, 0.5, 1);
    const petalMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
    });

    // Multiple petals (share material so updating one updates all)
    for (let i = 0; i < 5; i++) {
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      const angle = (i / 5) * Math.PI * 2;
      petal.position.set(
        Math.cos(angle) * 0.1,
        0.55,
        Math.sin(angle) * 0.1
      );
      petal.rotation.x = 0.3;
      petal.rotation.y = angle;
      group.add(petal);
    }

    // Center glow
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      petalMaterial // Share the material
    );
    center.position.y = 0.55;
    group.add(center);

    // Only track one mesh per plant for animation (they share the material)
    this.glowingPlants.push(center);

    group.position.set(x, this.getHeightAt(x, z), z);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.scale.setScalar(0.8 + Math.random() * 0.6);
    this.scene.add(group);
  }

  private createMushrooms() {
    // Bioluminescent mushroom clusters for larger world
    const mushroomColors = [0x00ffff, 0xff00ff, 0x8800ff, 0x00ff88];

    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 360; // Extended for 400x400 world
      const z = (Math.random() - 0.5) * 360;

      if (Math.sqrt(x * x + z * z) < 10) continue;

      const color = mushroomColors[Math.floor(Math.random() * mushroomColors.length)];
      this.addMushroomCluster(x, z, color);
    }
  }

  private addMushroomCluster(x: number, z: number, color: number) {
    const numMushrooms = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numMushrooms; i++) {
      const offsetX = (Math.random() - 0.5) * 1.5;
      const offsetZ = (Math.random() - 0.5) * 1.5;
      const scale = 0.5 + Math.random() * 0.8;

      this.addMushroom(x + offsetX, z + offsetZ, color, scale);
    }
  }

  private addMushroom(x: number, z: number, color: number, scale: number) {
    const group = new THREE.Group();

    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.6,
      metalness: 0.2,
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.2;
    group.add(stem);

    // Cap
    const capGeometry = new THREE.SphereGeometry(0.25, 10, 8);
    capGeometry.scale(1, 0.5, 1);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.3,
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.45;
    group.add(cap);
    this.mushrooms.push(cap);

    // Glowing spots on cap
    const spotGeometry = new THREE.SphereGeometry(0.04, 6, 6);
    const spotMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 1,
    });

    for (let i = 0; i < 5; i++) {
      const spot = new THREE.Mesh(spotGeometry, spotMaterial);
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.15;
      spot.position.set(
        Math.cos(angle) * radius,
        0.5 + Math.random() * 0.05,
        Math.sin(angle) * radius
      );
      group.add(spot);
    }

    group.position.set(x, this.getHeightAt(x, z), z);
    group.scale.setScalar(scale);
    this.scene.add(group);
  }

  private createTorches() {
    // Scatter torches around the world (30-40)
    for (let i = 0; i < 35; i++) {
      const x = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 160;

      // Don't place at spawn
      if (Math.sqrt(x * x + z * z) < 12) continue;

      this.addTorch(x, z);
    }
  }

  private addTorch(x: number, z: number) {
    const group = new THREE.Group();

    // Torch post (wooden cylinder)
    const postGeometry = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6);
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3520,
      roughness: 0.9,
      metalness: 0.1,
    });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 0.6;
    post.castShadow = true;
    group.add(post);

    // Flame holder (small ring)
    const holderGeometry = new THREE.TorusGeometry(0.1, 0.02, 6, 8);
    const holderMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.7,
    });
    const holder = new THREE.Mesh(holderGeometry, holderMaterial);
    holder.position.y = 1.2;
    holder.rotation.x = Math.PI / 2;
    group.add(holder);

    // Flame (cone with emissive orange material)
    const flameGeometry = new THREE.ConeGeometry(0.12, 0.35, 6);
    const flameMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.y = 1.4;
    group.add(flame);

    // Track flame for animation
    this.torches.push(flame);

    // Inner flame (brighter core)
    const innerFlameGeometry = new THREE.ConeGeometry(0.06, 0.2, 5);
    const innerFlameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.8,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial);
    innerFlame.position.y = 1.35;
    group.add(innerFlame);

    const height = this.getHeightAt(x, z);
    group.position.set(x, height, z);
    this.scene.add(group);

    // Store position for baked lighting
    this.torchPositions.push(new THREE.Vector3(x, height, z));
  }

  // Bake torch lighting into ground mesh vertex colors
  private bakeTorchLighting() {
    if (!this.groundMesh) return;

    const geometry = this.groundMesh.geometry as THREE.PlaneGeometry;
    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;

    const lightRadius = 10; // How far the light reaches
    const lightIntensity = 1.0; // Max brightness boost

    for (let i = 0; i < positions.count; i++) {
      // Get world position of this vertex (plane is rotated -90 on X)
      const localX = positions.getX(i);
      const localY = positions.getY(i);
      const worldX = localX;
      const worldZ = -localY; // Y becomes -Z after rotation

      // Calculate light contribution from all torches
      let totalLight = 0;
      for (const torchPos of this.torchPositions) {
        const dx = worldX - torchPos.x;
        const dz = worldZ - torchPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < lightRadius) {
          // Smooth falloff
          const falloff = 1 - (dist / lightRadius);
          totalLight += falloff * falloff * lightIntensity;
        }
      }

      // Clamp total light
      totalLight = Math.min(totalLight, 1);

      // Vertex colors multiply with material color (which is dark green 0x1a3a1a)
      // So we need to boost significantly to make orange visible
      // Base is 1,1,1 (white) which gives the normal material color
      // Adding orange: boost red a lot, green a bit, reduce blue
      const r = 1 + totalLight * 4;    // Boost red significantly
      const g = 1 + totalLight * 1.5;  // Boost green a bit (for warmth)
      const b = 1 - totalLight * 0.3;  // Slightly reduce blue

      colors.setXYZ(i, r, g, b);
    }

    colors.needsUpdate = true;
  }

  private createTallGrass() {
    // Scatter tall grass patches around (40 patches)
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 160;

      // Don't place at spawn
      if (Math.sqrt(x * x + z * z) < 8) continue;

      this.addTallGrassPatch(x, z);
    }
  }

  private addTallGrassPatch(x: number, z: number) {
    const numBlades = 8 + Math.floor(Math.random() * 8);
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < numBlades; i++) {
      const offsetX = (Math.random() - 0.5) * 1.5;
      const offsetZ = (Math.random() - 0.5) * 1.5;
      const bladeHeight = 0.4 + Math.random() * 0.6;

      // Thin cone for grass blade
      const bladeGeometry = new THREE.ConeGeometry(0.02, bladeHeight, 3);
      const blade = new THREE.Mesh(bladeGeometry, grassMaterial);

      const bx = x + offsetX;
      const bz = z + offsetZ;
      blade.position.set(bx, this.getHeightAt(bx, bz) + bladeHeight / 2, bz);

      // Slight random tilt
      blade.rotation.x = (Math.random() - 0.5) * 0.3;
      blade.rotation.z = (Math.random() - 0.5) * 0.3;

      this.scene.add(blade);
    }
  }

  private createFerns() {
    // Scatter ferns around (25 patches)
    const fernMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4a1a,
      roughness: 0.7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 140;
      const z = (Math.random() - 0.5) * 140;

      // Don't place at spawn
      if (Math.sqrt(x * x + z * z) < 10) continue;

      this.addFern(x, z, fernMaterial);
    }
  }

  private addFern(x: number, z: number, material: THREE.Material) {
    const group = new THREE.Group();
    const numFronds = 5 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numFronds; i++) {
      // Create fern frond as a scaled plane
      const frondGeometry = new THREE.PlaneGeometry(0.15, 0.6);
      const frond = new THREE.Mesh(frondGeometry, material);

      const angle = (i / numFronds) * Math.PI * 2;
      const tilt = 0.3 + Math.random() * 0.4;

      frond.position.set(
        Math.cos(angle) * 0.15,
        0.25,
        Math.sin(angle) * 0.15
      );
      frond.rotation.y = angle;
      frond.rotation.x = -tilt;

      group.add(frond);
    }

    const scale = 0.8 + Math.random() * 0.6;
    group.scale.setScalar(scale);
    group.position.set(x, this.getHeightAt(x, z), z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
  }

  private createFlowers() {
    // Scatter flowers around (30 patches)
    const flowerColors = [0xff6699, 0xffff66, 0x66ccff, 0xff9966, 0xcc66ff];

    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 150;
      const z = (Math.random() - 0.5) * 150;

      // Don't place at spawn
      if (Math.sqrt(x * x + z * z) < 8) continue;

      const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      this.addFlowerPatch(x, z, color);
    }
  }

  private addFlowerPatch(x: number, z: number, color: number) {
    const numFlowers = 3 + Math.floor(Math.random() * 5);

    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x228822,
      roughness: 0.8,
    });

    const petalMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.2,
      roughness: 0.6,
    });

    for (let i = 0; i < numFlowers; i++) {
      const offsetX = (Math.random() - 0.5) * 1.2;
      const offsetZ = (Math.random() - 0.5) * 1.2;
      const stemHeight = 0.3 + Math.random() * 0.3;

      const fx = x + offsetX;
      const fz = z + offsetZ;
      const fy = this.getHeightAt(fx, fz);

      // Stem
      const stemGeometry = new THREE.CylinderGeometry(0.015, 0.02, stemHeight, 4);
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.set(fx, fy + stemHeight / 2, fz);
      this.scene.add(stem);

      // Flower head (small sphere)
      const headGeometry = new THREE.SphereGeometry(0.06, 6, 6);
      const head = new THREE.Mesh(headGeometry, petalMaterial);
      head.position.set(fx, fy + stemHeight + 0.05, fz);
      this.scene.add(head);

      // Petals around the head
      const numPetals = 5;
      for (let p = 0; p < numPetals; p++) {
        const petalGeometry = new THREE.SphereGeometry(0.04, 4, 4);
        petalGeometry.scale(1, 0.5, 1);
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);

        const petalAngle = (p / numPetals) * Math.PI * 2;
        petal.position.set(
          fx + Math.cos(petalAngle) * 0.08,
          fy + stemHeight + 0.03,
          fz + Math.sin(petalAngle) * 0.08
        );

        this.scene.add(petal);
      }
    }
  }

  private createTechDebris() {
    // Scattered tech elements for larger world
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 360; // Extended for 400x400 world
      const z = (Math.random() - 0.5) * 360;

      if (Math.sqrt(x * x + z * z) < 12) continue;

      const type = Math.floor(Math.random() * 3);

      switch (type) {
        case 0:
          this.addDataPillar(x, z);
          break;
        case 1:
          this.addBrokenRobot(x, z);
          break;
        case 2:
          this.addEnergyNode(x, z);
          break;
      }
    }
  }

  private addDataPillar(x: number, z: number) {
    const group = new THREE.Group();

    const height = 1 + Math.random() * 2;
    const geometry = new THREE.BoxGeometry(0.5, height, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x333344,
      roughness: 0.3,
      metalness: 0.8,
    });

    const pillar = new THREE.Mesh(geometry, material);
    pillar.position.y = height / 2;
    pillar.castShadow = true;
    group.add(pillar);

    // Glowing data lines
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
    });

    for (let i = 0; i < 4; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.02, height * 0.8, 0.02);
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      const angle = (i / 4) * Math.PI * 2;
      line.position.set(
        Math.cos(angle) * 0.2,
        height / 2,
        Math.sin(angle) * 0.2
      );
      group.add(line);
    }

    group.position.set(x, this.getHeightAt(x, z), z);
    group.rotation.y = Math.random() * Math.PI;
    this.scene.add(group);
  }

  private addBrokenRobot(x: number, z: number) {
    const group = new THREE.Group();

    // Body (fallen over)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.5, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.5,
      metalness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    body.rotation.z = Math.random() * 0.5;
    body.rotation.x = Math.random() * 0.3;
    body.castShadow = true;
    group.add(body);

    // Dead eye
    const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x330000,
      emissive: 0x330000,
      emissiveIntensity: 0.3,
    });
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(0.2, 0.5, 0.5);
    group.add(eye);

    // Scattered parts
    for (let i = 0; i < 3; i++) {
      const partGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
      const part = new THREE.Mesh(partGeometry, bodyMaterial);
      part.position.set(
        (Math.random() - 0.5) * 2,
        0.05,
        (Math.random() - 0.5) * 2
      );
      part.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      group.add(part);
    }

    group.position.set(x, this.getHeightAt(x, z), z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
  }

  private addEnergyNode(x: number, z: number) {
    const group = new THREE.Group();

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.6,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.1;
    group.add(base);

    // Energy orb (no point light - emissive is enough)
    const orbGeometry = new THREE.SphereGeometry(0.3, 12, 12);
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.8,
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.y = 0.6;
    group.add(orb);

    group.position.set(x, this.getHeightAt(x, z), z);
    this.scene.add(group);
  }

  private createFloatingParticles() {
    // Floating particle sprites for atmosphere in larger world
    const particleCount = 250;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 300; // Extended for 400x400 world
      positions[i * 3 + 1] = 1 + Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffaa,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);
  }

  // Call each frame to animate glowing elements (optimized - only update a few per frame)
  update(deltaTime: number) {
    this.time += deltaTime;

    // Global pulse value - all elements use the same pulse to avoid per-element sin() calls
    const pulse1 = 0.4 + Math.sin(this.time * 2) * 0.2;
    const pulse2 = 0.3 + Math.sin(this.time * 1.5) * 0.15;

    // Only update a subset of elements each frame (rotating through them)
    const frameIndex = Math.floor(this.time * 10) % 10;

    // Update ~10% of plants per frame
    for (let i = frameIndex; i < this.glowingPlants.length; i += 10) {
      const material = this.glowingPlants[i].material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = pulse1;
    }

    // Update ~10% of mushrooms per frame
    for (let i = frameIndex; i < this.mushrooms.length; i += 10) {
      const material = this.mushrooms[i].material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = pulse2;
    }

    // Torch flicker animation (fast random flicker)
    for (let i = frameIndex; i < this.torches.length; i += 10) {
      const flame = this.torches[i];
      const material = flame.material as THREE.MeshStandardMaterial;

      // Randomized flicker effect
      const flicker = 0.6 + Math.sin(this.time * 15 + i * 7) * 0.2 + Math.random() * 0.2;
      material.emissiveIntensity = flicker;

      // Slight scale variation for more dynamic look
      const scaleFlicker = 0.9 + Math.sin(this.time * 12 + i * 5) * 0.1;
      flame.scale.y = scaleFlicker;
    }

    // Circuit lines don't need per-frame animation - static glow is fine
  }

  dispose() {
    // Clean up geometries and materials
    this.swingableObjects.forEach(obj => {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    });
  }
}
