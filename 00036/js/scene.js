let scene, camera, renderer;
let stadiumGroup, trainingGroup, vipGroup, lockerGroup, securityGroup;
let currentArea = 'stadium';
let lights = {};
let raycaster, mouse;

function initScene() {
    const container = document.getElementById('three-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    scene.fog = new THREE.Fog(0x050810, 50, 200);

    const width = container.clientWidth;
    const height = container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 40, 60);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(20, 40, 30);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 200;
    mainLight.shadow.camera.left = -60;
    mainLight.shadow.camera.right = 60;
    mainLight.shadow.camera.top = 60;
    mainLight.shadow.camera.bottom = -60;
    scene.add(mainLight);

    createGround();
    createStadium();
    createTrainingHall();
    createVIPBoxes();
    createLockerRoom();
    createSecurityCenter();
    createAreaLights();

    setupControls();
    setupEventListeners();
    animate();
    window.addEventListener('resize', onWindowResize);
}

function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a2744,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(300, 60, 0x2a3f5f, 0x1a2744);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
}

function createStadium() {
    stadiumGroup = new THREE.Group();
    stadiumGroup.position.set(0, 0, 0);

    const baseGeometry = new THREE.CylinderGeometry(40, 45, 5, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a3f5f,
        roughness: 0.7,
        metalness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 2.5;
    base.castShadow = true;
    base.receiveShadow = true;
    stadiumGroup.add(base);

    createStands();
    createLawn();
    createRoof();
    createScoreboard();

    scene.add(stadiumGroup);
}

function createStands() {
    const standMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3a557f,
        roughness: 0.6
    });

    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + Math.PI / 4;
        const radius = 38;
        const standGroup = new THREE.Group();
        
        for (let row = 0; row < 8; row++) {
            const rowHeight = row * 1.2;
            const rowRadius = radius + row * 0.8;
            
            for (let col = 0; col < 15; col++) {
                const seatAngle = angle + (col - 7) * 0.08;
                const seatGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.8);
                const zone = ['A', 'B', 'C', 'D'][i];
                const isSold = Math.random() > 0.3;
                
                let seatColor;
                if (zone === 'A') {
                    seatColor = isSold ? 0xffd700 : 0x5a4a20;
                } else if (zone === 'C') {
                    seatColor = isSold ? 0x4488ff : 0x2a4a7f;
                } else {
                    seatColor = isSold ? 0x00aaff : 0x1a3a5f;
                }
                
                const seatMaterial = new THREE.MeshStandardMaterial({ 
                    color: seatColor,
                    roughness: 0.5,
                    metalness: 0.2
                });
                
                const seat = new THREE.Mesh(seatGeometry, seatMaterial);
                seat.position.set(
                    Math.cos(seatAngle) * rowRadius,
                    rowHeight + 5.5,
                    Math.sin(seatAngle) * rowRadius
                );
                seat.rotation.y = seatAngle + Math.PI / 2;
                seat.castShadow = true;
                seat.receiveShadow = true;
                
                seat.userData = {
                    type: 'seat',
                    id: `${zone}${row + 1}-${col + 1}`,
                    zone: zone,
                    row: row + 1,
                    col: col + 1,
                    isSold: isSold,
                    price: zone === 'A' ? 1280 : zone === 'B' ? 680 : zone === 'D' ? 580 : 380
                };
                
                standGroup.add(seat);
            }
        }
        
        stadiumGroup.add(standGroup);
    }
}

function createLawn() {
    const lawnGeometry = new THREE.CircleGeometry(25, 64);
    const lawnMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d8a3e,
        roughness: 0.8,
        metalness: 0.0
    });
    const lawn = new THREE.Mesh(lawnGeometry, lawnMaterial);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = 5.02;
    lawn.receiveShadow = true;
    lawn.userData = { type: 'lawn' };
    stadiumGroup.add(lawn);

    const fieldLineMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.5
    });

    const centerCircle = new THREE.RingGeometry(8, 8.2, 64);
    const centerCircleMesh = new THREE.Mesh(centerCircle, fieldLineMaterial);
    centerCircleMesh.rotation.x = -Math.PI / 2;
    centerCircleMesh.position.y = 5.03;
    stadiumGroup.add(centerCircleMesh);

    const centerDot = new THREE.CircleGeometry(0.3, 16);
    const centerDotMesh = new THREE.Mesh(centerDot, fieldLineMaterial);
    centerDotMesh.rotation.x = -Math.PI / 2;
    centerDotMesh.position.y = 5.03;
    stadiumGroup.add(centerDotMesh);

    const halfLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.02, 50),
        fieldLineMaterial
    );
    halfLine.position.y = 5.03;
    stadiumGroup.add(halfLine);

    const leftGoal = createGoal(-22, 5.1, 0);
    stadiumGroup.add(leftGoal);
    const rightGoal = createGoal(22, 5.1, 0);
    stadiumGroup.add(rightGoal);

    createSprinklers();
}

function createGoal(x, y, z) {
    const goalGroup = new THREE.Group();
    const postMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.8
    });

    const leftPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
        postMaterial
    );
    leftPost.position.set(x, y + 4, z - 3.66);
    leftPost.castShadow = true;
    goalGroup.add(leftPost);

    const rightPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
        postMaterial
    );
    rightPost.position.set(x, y + 4, z + 3.66);
    rightPost.castShadow = true;
    goalGroup.add(rightPost);

    const crossbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 7.32, 8),
        postMaterial
    );
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(x, y + 8, z);
    crossbar.castShadow = true;
    goalGroup.add(crossbar);

    return goalGroup;
}

function createSprinklers() {
    const sprinklerPositions = [
        [-15, 5.05, -15], [15, 5.05, -15],
        [-15, 5.05, 15], [15, 5.05, 15],
        [0, 5.05, -20], [0, 5.05, 20]
    ];

    const sprinklerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.2
    });

    sprinklerPositions.forEach((pos, index) => {
        const sprinkler = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, 0.5, 16),
            sprinklerMaterial
        );
        sprinkler.position.set(pos[0], pos[1], pos[2]);
        sprinkler.userData = { type: 'sprinkler', id: index, active: true };
        stadiumGroup.add(sprinkler);
    });
}

function createRoof() {
    const roofGeometry = new THREE.TorusGeometry(48, 3, 8, 32);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a3f5f,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: 0.8
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.x = Math.PI / 2;
    roof.position.y = 25;
    roof.castShadow = true;
    stadiumGroup.add(roof);
}

function createScoreboard() {
    const scoreboardGroup = new THREE.Group();
    scoreboardGroup.position.set(0, 22, -35);

    const frameGeometry = new THREE.BoxGeometry(20, 8, 0.5);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a2744,
        metalness: 0.8,
        roughness: 0.2
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.castShadow = true;
    scoreboardGroup.add(frame);

    const screenGeometry = new THREE.PlaneGeometry(18, 6);
    const screenMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x001133,
        transparent: true,
        opacity: 0.9
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.3;
    scoreboardGroup.add(screen);

    stadiumGroup.add(scoreboardGroup);
}

function createTrainingHall() {
    trainingGroup = new THREE.Group();
    trainingGroup.position.set(-80, 0, 0);

    const hallGeometry = new THREE.BoxGeometry(40, 15, 25);
    const hallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a4a6f,
        roughness: 0.6,
        metalness: 0.3
    });
    const hall = new THREE.Mesh(hallGeometry, hallMaterial);
    hall.position.y = 7.5;
    hall.castShadow = true;
    hall.receiveShadow = true;
    trainingGroup.add(hall);

    const roofGeometry = new THREE.BoxGeometry(44, 2, 29);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a3a5f,
        roughness: 0.5
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 16;
    roof.castShadow = true;
    trainingGroup.add(roof);

    const courtGeometry = new THREE.PlaneGeometry(30, 18);
    const courtMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b4513,
        roughness: 0.7
    });
    const court = new THREE.Mesh(courtGeometry, courtMaterial);
    court.rotation.x = -Math.PI / 2;
    court.position.y = 0.1;
    trainingGroup.add(court);

    for (let i = 0; i < 5; i++) {
        const playerGroup = new THREE.Group();
        
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8),
            new THREE.MeshStandardMaterial({ color: 0xff6600 })
        );
        body.position.y = 0.6;
        body.castShadow = true;
        playerGroup.add(body);
        
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffcc99 })
        );
        head.position.y = 1.5;
        head.castShadow = true;
        playerGroup.add(head);
        
        playerGroup.position.set(
            -10 + Math.random() * 20,
            0,
            -6 + Math.random() * 12
        );
        playerGroup.userData = { type: 'trainingPlayer' };
        trainingGroup.add(playerGroup);
    }

    trainingGroup.visible = false;
    scene.add(trainingGroup);
}

function createVIPBoxes() {
    vipGroup = new THREE.Group();
    vipGroup.position.set(80, 0, 0);

    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 5; col++) {
            const boxGeometry = new THREE.BoxGeometry(8, 6, 10);
            const boxMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x3a3a5a,
                roughness: 0.4,
                metalness: 0.5
            });
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(
                col * 10 - 20,
                row * 7 + 3,
                0
            );
            box.castShadow = true;
            box.receiveShadow = true;
            box.userData = { type: 'vipBox', id: `VIP-${row + 1}-${col + 1}` };
            
            const glassGeometry = new THREE.BoxGeometry(7.8, 4, 0.2);
            const glassMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x88ccff,
                transparent: true,
                opacity: 0.3,
                metalness: 0.9,
                roughness: 0.1
            });
            const glass = new THREE.Mesh(glassGeometry, glassMaterial);
            glass.position.set(0, 0, 5.1);
            box.add(glass);

            vipGroup.add(box);
        }
    }

    vipGroup.visible = false;
    scene.add(vipGroup);
}

function createLockerRoom() {
    lockerGroup = new THREE.Group();
    lockerGroup.position.set(0, 0, 80);

    const roomGeometry = new THREE.BoxGeometry(50, 8, 30);
    const roomMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a3a4a,
        roughness: 0.7
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.position.y = 4;
    room.castShadow = true;
    room.receiveShadow = true;
    lockerGroup.add(room);

    const displayGeometry = new THREE.BoxGeometry(3, 2, 0.2);
    const displayMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x001133,
        emissive: 0x003366,
        emissiveIntensity: 0.5
    });

    for (let i = 0; i < 11; i++) {
        const display = new THREE.Mesh(displayGeometry, displayMaterial);
        display.position.set(
            -20 + i * 4,
            5,
            -14.9
        );
        display.userData = { type: 'lockerDisplay', playerId: i + 1 };
        lockerGroup.add(display);
    }

    for (let i = 0; i < 22; i++) {
        const lockerGeometry = new THREE.BoxGeometry(2, 2.5, 1.5);
        const lockerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a3a2a,
            roughness: 0.6
        });
        const locker = new THREE.Mesh(lockerGeometry, lockerMaterial);
        locker.position.set(
            -20 + (i % 11) * 4,
            1.25,
            i < 11 ? -10 : -5
        );
        locker.castShadow = true;
        lockerGroup.add(locker);
    }

    lockerGroup.visible = false;
    scene.add(lockerGroup);
}

function createSecurityCenter() {
    securityGroup = new THREE.Group();
    securityGroup.position.set(0, 0, -80);

    const centerGeometry = new THREE.BoxGeometry(45, 12, 35);
    const centerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a2a3a,
        roughness: 0.5,
        metalness: 0.4
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 6;
    center.castShadow = true;
    center.receiveShadow = true;
    securityGroup.add(center);

    const monitorGeometry = new THREE.BoxGeometry(8, 5, 0.3);
    const monitorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x001122,
        emissive: 0x002244,
        emissiveIntensity: 0.3
    });

    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
            const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
            monitor.position.set(
                -15 + col * 10,
                7 + row * 6,
                -17.4
            );
            monitor.userData = { type: 'securityMonitor', id: `MON-${row + 1}-${col + 1}` };
            securityGroup.add(monitor);
        }
    }

    const alertZones = ['Zone B', 'Zone C'];
    alertZones.forEach((zone, index) => {
        const alertGeometry = new THREE.BoxGeometry(12, 0.5, 12);
        const alertMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffaa00,
            emissive: 0xff6600,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.6
        });
        const alert = new THREE.Mesh(alertGeometry, alertMaterial);
        alert.position.set(
            -15 + index * 30,
            0.26,
            10
        );
        alert.userData = { type: 'alertZone', zone: zone, flashing: true };
        securityGroup.add(alert);
    });

    securityGroup.visible = false;
    scene.add(securityGroup);
}

function createAreaLights() {
    const zones = ['A', 'B', 'C', 'D', 'E'];
    const lightPositions = [
        { x: 0, y: 35, z: -25 },
        { x: 25, y: 35, z: 0 },
        { x: -25, y: 35, z: 0 },
        { x: 0, y: 35, z: 25 },
        { x: 0, y: 35, z: 0 }
    ];

    zones.forEach((zone, index) => {
        const spotLight = new THREE.SpotLight(0xffffff, 1.2);
        spotLight.position.set(
            lightPositions[index].x,
            lightPositions[index].y,
            lightPositions[index].z
        );
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.3;
        spotLight.decay = 0.5;
        spotLight.distance = 100;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        
        spotLight.target.position.set(0, 5, 0);
        stadiumGroup.add(spotLight);
        stadiumGroup.add(spotLight.target);
        
        lights[zone] = spotLight;
    });
}

function setupControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let spherical = { theta: 0, phi: Math.PI / 4, radius: 80 };
    const target = new THREE.Vector3(0, 10, 0);

    function updateCamera() {
        camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
        camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
        camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
        camera.lookAt(target);
    }

    const container = document.getElementById('three-container');

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    container.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            spherical.theta -= deltaX * 0.005;
            spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, spherical.phi - deltaY * 0.005));
            
            updateCamera();
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }

        mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
        mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
    });

    container.addEventListener('mouseup', () => {
        isDragging = false;
    });

    container.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        spherical.radius = Math.max(30, Math.min(150, spherical.radius + e.deltaY * 0.1));
        updateCamera();
    });

    updateCamera();
}

function setupEventListeners() {
    const container = document.getElementById('three-container');
    
    container.addEventListener('click', (e) => {
        mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
        mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        let allMeshes = [];
        if (stadiumGroup) stadiumGroup.traverse((child) => { if (child.isMesh) allMeshes.push(child); });
        if (trainingGroup) trainingGroup.traverse((child) => { if (child.isMesh) allMeshes.push(child); });
        if (vipGroup) vipGroup.traverse((child) => { if (child.isMesh) allMeshes.push(child); });
        if (lockerGroup) lockerGroup.traverse((child) => { if (child.isMesh) allMeshes.push(child); });
        if (securityGroup) securityGroup.traverse((child) => { if (child.isMesh) allMeshes.push(child); });
        
        const intersects = raycaster.intersectObjects(allMeshes);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            handleObjectClick(object);
        }
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchArea(btn.dataset.area);
        });
    });
}

function handleObjectClick(object) {
    if (object.userData.type === 'seat') {
        showSeatInfo(object.userData);
    } else if (object.userData.type === 'alertZone') {
        openCameraModal();
    } else if (object.userData.type === 'securityMonitor') {
        openCameraModal();
    }
}

function switchArea(area) {
    currentArea = area;
    
    stadiumGroup.visible = area === 'stadium';
    trainingGroup.visible = area === 'training';
    vipGroup.visible = area === 'vip';
    lockerGroup.visible = area === 'locker';
    securityGroup.visible = area === 'security';

    const positions = {
        stadium: { x: 0, y: 0, z: 0 },
        training: { x: -80, y: 0, z: 0 },
        vip: { x: 80, y: 0, z: 0 },
        locker: { x: 0, y: 0, z: 80 },
        security: { x: 0, y: 0, z: -80 }
    };

    animateCameraTo(positions[area]);
}

function animateCameraTo(targetPos) {
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(
        targetPos.x,
        targetPos.y + 40,
        targetPos.z + 60
    );
    const duration = 1000;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(startPos, endPos, easeProgress);
        camera.lookAt(targetPos.x, targetPos.y + 10, targetPos.z);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    if (securityGroup) {
        securityGroup.traverse((child) => {
            if (child.userData && child.userData.type === 'alertZone' && child.userData.flashing) {
                child.material.emissiveIntensity = 0.5 + Math.sin(time * 4) * 0.5;
                child.material.opacity = 0.4 + Math.sin(time * 4) * 0.3;
            }
        });
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('three-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

window.addEventListener('load', initScene);
