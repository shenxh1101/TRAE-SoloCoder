const API_BASE = 'http://localhost:3001/api';

let scene, camera, renderer, controls;
let labObjects = {};
let autoRotate = false;
let currentPurchaseReagent = null;
let currentMaintenanceInstrument = null;
let dataRefreshInterval = null;

let experimentTables = [];
let reagents = [];
let instruments = [];
let schedules = [];
let wasteBins = [];
let alerts = [];
let purchaseOrders = [];
let maintenanceWorkorders = [];
let transferWorkorders = [];

async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    return await response.json();
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

async function checkApiConnection() {
  try {
    await apiRequest('/health');
    document.getElementById('api-status').textContent = '已连接';
    document.getElementById('api-status').style.color = '#00ff88';
    return true;
  } catch (error) {
    document.getElementById('api-status').textContent = '连接失败';
    document.getElementById('api-status').style.color = '#ff4444';
    return false;
  }
}

async function loadAllData() {
  try {
    const [tablesData, reagentsData, instrumentsData, schedulesData, wasteData, alertsData, ordersData, maintData] = await Promise.all([
      apiRequest('/experiment-tables').catch(() => []),
      apiRequest('/reagents').catch(() => []),
      apiRequest('/instruments').catch(() => []),
      apiRequest('/schedules').catch(() => ({ schedules: [] })),
      apiRequest('/waste').catch(() => []),
      apiRequest('/alerts/unacknowledged').catch(() => []),
      apiRequest('/reagents/purchase-orders').catch(() => []),
      apiRequest('/instruments/maintenance/workorders').catch(() => [])
    ]);

    experimentTables = Array.isArray(tablesData) ? tablesData : (tablesData && tablesData.tables ? tablesData.tables : []);
    reagents = Array.isArray(reagentsData) ? reagentsData : [];
    instruments = Array.isArray(instrumentsData) ? instrumentsData : [];
    schedules = schedulesData && schedulesData.schedules ? schedulesData.schedules : [];
    wasteBins = Array.isArray(wasteData) ? wasteData : [];
    alerts = Array.isArray(alertsData) ? alertsData : [];
    purchaseOrders = Array.isArray(ordersData) ? ordersData : [];
    maintenanceWorkorders = Array.isArray(maintData) ? maintData : [];

    const transferData = await apiRequest('/waste/transfer/workorders').catch(() => []);
    transferWorkorders = Array.isArray(transferData) ? transferData : [];

    updateSidebarStats();
    updateAlertsList();
    updateOrdersList();
    updateWorkordersList();
    updateSchedule();
    
    const has3DObjects = Object.keys(labObjects).length > 0;
    if (has3DObjects) {
      update3DObjects();
    }
    
    setTimeout(() => {
      autoGenerateWorkorders();
    }, 500);

  } catch (error) {
    console.error('加载数据失败:', error);
    showToast('数据加载失败', 'error');
  }
}

function updateSidebarStats() {
  const tableCount = experimentTables.length;
  const dangerTables = experimentTables.filter(t => t.status === 'danger').length;
  document.getElementById('stat-tables').textContent = `${tableCount - dangerTables} / ${tableCount}`;

  const instCount = instruments.length;
  const lockedInst = instruments.filter(i => i.locked).length;
  document.getElementById('stat-instruments').textContent = `${instCount - lockedInst} / ${instCount}`;

  const lowReagent = reagents.filter(r => r.status === 'warning').length;
  document.getElementById('stat-low-reagent').textContent = lowReagent;

  const activeAlerts = alerts.filter(a => a.level === 'danger' || a.level === 'warning').length;
  document.getElementById('stat-alerts').textContent = activeAlerts;
}

function updateAlertsList() {
  const container = document.getElementById('alerts-list');
  if (alerts.length === 0) {
    container.innerHTML = '<div style="color: #8899aa; text-align: center; padding: 20px;">暂无警报</div>';
    return;
  }

  container.innerHTML = alerts.slice(0, 10).map(alert => `
    <div class="alert-item ${alert.level}" onclick="acknowledgeAlert('${alert.id}')">
      <div class="alert-title">${alert.title}</div>
      <div class="alert-desc">${alert.description}</div>
      <div class="alert-time">${new Date(alert.created_at).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

function updateOrdersList() {
  const container = document.getElementById('orders-list');
  if (purchaseOrders.length === 0) {
    container.innerHTML = '<div style="color: #8899aa; text-align: center; padding: 20px;">暂无采购申请</div>';
    return;
  }

  container.innerHTML = purchaseOrders.map(order => `
    <div class="order-item">
      <div class="order-header">
        <span class="order-id">${order.id}</span>
        <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
      </div>
      <div class="info-row"><span class="info-label">试剂</span><span class="info-value">${order.reagent_name}</span></div>
      <div class="info-row"><span class="info-label">采购量</span><span class="info-value">${order.amount}</span></div>
      <div class="alert-time">${new Date(order.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}

function updateWorkordersList() {
  const container = document.getElementById('workorders-list');
  const allWorkorders = [...maintenanceWorkorders, ...transferWorkorders];
  
  if (allWorkorders.length === 0) {
    container.innerHTML = '<div style="color: #8899aa; text-align: center; padding: 20px;">暂无工单</div>';
    return;
  }

  container.innerHTML = allWorkorders.map(wo => `
    <div class="workorder-item">
      <div class="order-header">
        <span class="order-id">${wo.id}</span>
        <span class="order-status ${wo.status}">${getStatusText(wo.status)}</span>
      </div>
      <div class="info-row"><span class="info-label">设备</span><span class="info-value">${wo.instrument_name || wo.waste_name}</span></div>
      <div class="info-row"><span class="info-label">类型</span><span class="info-value">${wo.maintenance_type || '转运'}</span></div>
      <div class="alert-time">${new Date(wo.created_at).toLocaleString()}</div>
      ${wo.status === 'pending' ? `<button class="btn btn-success" style="width: 100%; margin-top: 8px; padding: 5px;" onclick="completeWorkorder('${wo.id}')">完成处理</button>` : ''}
    </div>
  `).join('');
}

function updateSchedule() {
  const container = document.getElementById('schedule-container');
  const grouped = {};
  
  schedules.forEach(s => {
    if (!grouped[s.resource_name]) grouped[s.resource_name] = [];
    grouped[s.resource_name].push(s);
  });

  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<div style="color: #8899aa; padding: 20px;">暂无预约</div>';
    return;
  }

  container.innerHTML = Object.entries(grouped).map(([resource, bookings]) => `
    <div class="schedule-item">
      <div class="schedule-header">
        <span>${resource}</span>
        ${bookings.some(b => b.conflict) ? '<span style="color: #ff4444;">⚡ 冲突</span>' : ''}
      </div>
      ${bookings.map(b => `
        <div class="schedule-booking ${b.conflict ? 'conflict' : ''}" ${b.conflict ? `onclick="resolveConflict('${b.id}')"` : ''}>
          <div class="booking-time">${b.start_time}-${b.end_time} ${b.conflict ? '<span style="color: #ff4444; float: right;">点击调整</span>' : ''}</div>
          <div class="booking-project">${b.project}</div>
          <div class="booking-person">${b.person} (优先级: ${b.priority})</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function getStatusText(status) {
  const map = {
    'pending': '待处理',
    'processing': '处理中',
    'approved': '已批准',
    'completed': '已完成'
  };
  return map[status] || status;
}

function update3DObjects() {
  if (Object.keys(labObjects).length === 0) return;

  experimentTables.forEach(table => {
    const obj = labObjects[table.id];
    if (obj && obj.group) {
      const tableTop = obj.group.getObjectByName('tabletop');
      const screen = obj.group.getObjectByName('screen');
      const alarmLight = obj.group.getObjectByName('alarmlight');

      if (tableTop) {
        tableTop.material.color.setHex(table.status === 'danger' ? 0xff4444 : 0x5a6a7a);
      }
      if (screen) {
        screen.material.color.setHex(table.status === 'danger' ? 0xff4444 : 0x00ff88);
      }
      
      if (table.status === 'danger' && !alarmLight) {
        const newAlarmLight = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        newAlarmLight.position.set(1.5, 1.5, 0);
        newAlarmLight.name = 'alarmlight';
        obj.group.add(newAlarmLight);
      } else if (table.status !== 'danger' && alarmLight) {
        obj.group.remove(alarmLight);
      }
    }
  });

  instruments.forEach(inst => {
    const obj = labObjects[inst.id];
    if (obj && obj.group) {
      const body = obj.group.getObjectByName('instrumentBody');
      const screen = obj.group.getObjectByName('screen');
      const warningBorder = obj.group.getObjectByName('warningBorder');

      if (body) {
        const color = inst.locked ? 0xaa4444 : (inst.status === 'warning' ? 0xff8800 : 0x4a5a6a);
        body.material.color.setHex(color);
      }
      if (screen) {
        screen.material.color.setHex(inst.locked ? 0xff0000 : 0x00ff88);
      }

      if ((inst.status === 'warning' || inst.locked) && !warningBorder) {
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 1.5, 1.5));
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: inst.locked ? 0xff0000 : 0xff8800 
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        wireframe.position.y = 1.55;
        wireframe.name = 'warningBorder';
        obj.group.add(wireframe);
      } else if (inst.status !== 'warning' && !inst.locked && warningBorder) {
        obj.group.remove(warningBorder);
      }
    }
  });

  if (labObjects.reagentCabinet && labObjects.reagentCabinet.group) {
    const group = labObjects.reagentCabinet.group;
    group.traverse((child) => {
      if (child.userData && child.userData.reagentId) {
        const reagent = reagents.find(r => r.id === child.userData.reagentId);
        if (reagent) {
          child.traverse((bottleChild) => {
            if (bottleChild.material && bottleChild.material.color) {
              if (reagent.status === 'warning') {
                bottleChild.material.color.setHex(0xff8800);
                bottleChild.userData = bottleChild.userData || {};
                bottleChild.userData.flashing = true;
              } else {
                if (child.userData.baseColor) {
                  bottleChild.material.color.setHex(child.userData.baseColor);
                }
                if (bottleChild.userData) {
                  bottleChild.userData.flashing = false;
                }
              }
            }
          });
        }
      }
    });
  }

  if (labObjects.wasteArea && labObjects.wasteArea.group) {
    const group = labObjects.wasteArea.group;
    group.traverse((child) => {
      if (child.userData && child.userData.wasteId) {
        const waste = wasteBins.find(w => w.id === child.userData.wasteId);
        if (waste) {
          child.traverse((subChild) => {
            if (subChild.name === 'wastebin' && subChild.material) {
              if (waste.status === 'danger') {
                subChild.material.color.setHex(0xff0000);
                subChild.userData = subChild.userData || {};
                subChild.userData.flashing = true;
              }
            }
            if (subChild.name === 'wastelevel' && subChild.material) {
              if (waste.status === 'danger') {
                subChild.material.color.setHex(0xff0000);
                subChild.userData = subChild.userData || {};
                subChild.userData.flashing = true;
              }
            }
          });
        }
      }
    });
  }
}

function init() {
  try {
    const container = document.getElementById('canvas-container');
    if (!container) {
      console.error('找不到canvas-container元素不存在');
      return;
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 30, 80);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(25, 20, 25);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.minDistance = 10;
      controls.maxDistance = 50;
    } else {
      console.warn('OrbitControls未加载，将无法控制视角');
    }

    const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(20, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.3);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);

    createFloor();
    createWalls();
    createP3Lab();
    createExperimentTables();
    createReagentCabinets();
    createInstrumentArea();
    createWasteArea();
    createCeilingLights();

    window.addEventListener('resize', onWindowResize);
    
    if (renderer && renderer.domElement) {
      renderer.domElement.addEventListener('click', onMouseClick);
      renderer.domElement.addEventListener('mousemove', onMouseMove);
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);

    checkApiConnection().then(connected => {
      if (connected) {
        loadAllData().then(() => {
          const loadingEl = document.getElementById('loading');
          if (loadingEl) loadingEl.style.display = 'none';
          dataRefreshInterval = setInterval(loadAllData, 10000);
        }).catch(err => {
          console.error('加载数据失败:', err);
        });
      } else {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = '后端服务器未启动，请启动后端服务';
      }
    });

    animate();
    
    console.log('3D场景初始化成功');
  } catch (error) {
    console.error('初始化失败:', error);
    showToast('3D场景初始化失败', 'error');
  }
}

function createFloor() {
  const floorGeometry = new THREE.PlaneGeometry(50, 40);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a2a4a,
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const gridHelper = new THREE.GridHelper(50, 50, 0x00d4ff, 0x1a3a5a);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

function createWalls() {
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2a3a5a,
    roughness: 0.9,
    metalness: 0.1
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(50, 8, 0.3), wallMaterial);
  backWall.position.set(0, 4, -20);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 40), wallMaterial);
  leftWall.position.set(-25, 4, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 40), wallMaterial);
  rightWall.position.set(25, 4, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);
}

function createCeilingLights() {
  const lightPositions = [
    [-15, 7.5, -10], [0, 7.5, -10], [15, 7.5, -10],
    [-15, 7.5, 5], [0, 7.5, 5], [15, 7.5, 5],
    [-15, 7.5, 15], [0, 7.5, 15], [15, 7.5, 15]
  ];

  lightPositions.forEach(pos => {
    const lightGeo = new THREE.BoxGeometry(3, 0.1, 1.5);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(...pos);
    scene.add(light);

    const pointLight = new THREE.PointLight(0xffffff, 0.5, 20);
    pointLight.position.set(pos[0], pos[1] - 0.5, pos[2]);
    scene.add(pointLight);
  });
}

function createP3Lab() {
  const p3LabGroup = new THREE.Group();
  p3LabGroup.position.set(-18, 0, -12);

  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3a2a4a,
    roughness: 0.7,
    metalness: 0.3,
    transparent: true,
    opacity: 0.8
  });

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.3), wallMaterial);
  frontWall.position.set(0, 2.5, 4);
  p3LabGroup.add(frontWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 8), wallMaterial);
  leftWall.position.set(-5, 2.5, 0);
  p3LabGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 8), wallMaterial);
  rightWall.position.set(5, 2.5, 0);
  p3LabGroup.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.3), wallMaterial);
  backWall.position.set(0, 2.5, -4);
  p3LabGroup.add(backWall);

  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2, 3.5, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.8, roughness: 0.3 })
  );
  doorFrame.position.set(0, 1.75, 4.1);
  p3LabGroup.add(doorFrame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 3.3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x881111, metalness: 0.5, roughness: 0.5 })
  );
  door.position.set(0, 1.75, 4.2);
  door.name = 'p3door';
  p3LabGroup.add(door);

  const readerGeo = new THREE.BoxGeometry(0.3, 0.4, 0.1);
  const readerMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const reader = new THREE.Mesh(readerGeo, readerMat);
  reader.position.set(1.2, 2, 4.3);
  p3LabGroup.add(reader);

  const readerLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  readerLight.position.set(1.2, 2.1, 4.36);
  readerLight.name = 'p3accesslight';
  p3LabGroup.add(readerLight);

  const signGeo = new THREE.BoxGeometry(2, 0.5, 0.1);
  const signMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 4.5, 4.2);
  p3LabGroup.add(sign);

  const floorGeo = new THREE.PlaneGeometry(10, 8);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a2a3a });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  p3LabGroup.add(floor);

  const cabinet = createEquipment(1.5, 1.8, 0.8, 0x445566);
  cabinet.position.set(-3, 0.9, -2);
  p3LabGroup.add(cabinet);

  const workbench = createEquipment(3, 0.8, 1.5, 0x556677);
  workbench.position.set(3, 0.4, -1);
  p3LabGroup.add(workbench);

  labObjects.p3Lab = { group: p3LabGroup, type: 'p3lab', name: 'P3生物安全实验室' };
  scene.add(p3LabGroup);
}

function createExperimentTables() {
  const positions = [
    { x: -5, z: -5 },
    { x: 0, z: -5 },
    { x: 5, z: -5 },
    { x: -5, z: 3 },
    { x: 0, z: 3 },
    { x: 5, z: 3 }
  ];

  const tableIds = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

  tableIds.forEach((id, index) => {
    const pos = positions[index];
    const tableData = experimentTables.find(t => t.id === id) || { status: 'normal' };
    const tableGroup = createExperimentTable(tableData);
    tableGroup.position.set(pos.x, 0, pos.z);
    labObjects[id] = { group: tableGroup, type: 'table', data: tableData };
    scene.add(tableGroup);
  });
}

function createExperimentTable(tableData) {
  const group = new THREE.Group();

  const tableColor = tableData.status === 'danger' ? 0xff4444 : 0x5a6a7a;
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.15, 2),
    new THREE.MeshStandardMaterial({ color: tableColor, metalness: 0.3, roughness: 0.7 })
  );
  tableTop.position.y = 0.8;
  tableTop.castShadow = true;
  tableTop.name = 'tabletop';
  group.add(tableTop);

  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });
  const legPositions = [[-1.8, -0.8], [1.8, -0.8], [-1.8, 0.8], [1.8, 0.8]];
  legPositions.forEach(pos => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), legMaterial);
    leg.position.set(pos[0], 0.4, pos[1]);
    leg.castShadow = true;
    group.add(leg);
  });

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.05),
    new THREE.MeshBasicMaterial({ color: tableData.status === 'danger' ? 0xff4444 : 0x00ff88 })
  );
  screen.position.set(0, 1.2, -0.8);
  screen.name = 'screen';
  group.add(screen);

  const bottle1 = createReagentBottle(0xff6644, 0.15, 0.4);
  bottle1.position.set(-1.2, 1, 0.3);
  group.add(bottle1);

  const bottle2 = createReagentBottle(0x44ff66, 0.12, 0.35);
  bottle2.position.set(-0.8, 1, 0.5);
  group.add(bottle2);

  const flask = createFlask(0x44aaff);
  flask.position.set(0.8, 1, 0);
  group.add(flask);

  return group;
}

function createReagentBottle(color, radius, height) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.8, radius, height * 0.8, 16),
    new THREE.MeshPhysicalMaterial({ color: color, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.1 })
  );
  body.position.y = height * 0.4;
  group.add(body);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, height * 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  );
  cap.position.y = height * 0.9;
  group.add(cap);

  return group;
}

function createFlask(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshPhysicalMaterial({ color: color, transparent: true, opacity: 0.5 })
  );
  body.scale.set(1, 0.8, 1);
  group.add(body);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 0.3, 16),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
  );
  neck.position.y = 0.3;
  group.add(neck);

  return group;
}

function createReagentCabinets() {
  const cabinetGroup = new THREE.Group();
  cabinetGroup.position.set(15, 0, -12);

  const cabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, metalness: 0.6, roughness: 0.4 });
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 1), cabinetMaterial);
  cabinet.position.y = 1.5;
  cabinet.castShadow = true;
  cabinetGroup.add(cabinet);

  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x5a6a7a, metalness: 0.7, roughness: 0.3 });
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.9), doorMaterial);
  leftDoor.position.set(-2.45, 1.5, 0.05);
  leftDoor.name = 'leftDoor';
  cabinetGroup.add(leftDoor);

  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.9), doorMaterial);
  rightDoor.position.set(2.45, 1.5, 0.05);
  rightDoor.name = 'rightDoor';
  cabinetGroup.add(rightDoor);

  const shelfY = [0.6, 1.5, 2.4];
  const reagentColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
  
  const reagentIds = ['reagent1', 'reagent2', 'reagent3', 'reagent4', 'reagent5', 'reagent6'];
  
  reagentIds.slice(0, 6).forEach((id, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const reagent = reagents.find(r => r.id === id) || { status: 'normal' };
    const bottle = createReagentBottle(
      reagentColors[index], 
      reagent.status === 'warning' ? 0.1 : 0.15, 
      0.35
    );
    bottle.position.set(-1 + col * 2, shelfY[row], 0);
    bottle.userData.reagentId = id;
    bottle.userData.baseColor = reagentColors[index];
    
    if (reagent.status === 'warning') {
      bottle.userData.flashing = true;
      bottle.scale.set(0.6, 0.6, 0.6);
    }
    
    cabinetGroup.add(bottle);
  });

  labObjects.reagentCabinet = { group: cabinetGroup, type: 'cabinet', data: reagents };
  scene.add(cabinetGroup);
}

function createInstrumentArea() {
  const positions = [
    { x: -15, z: 10 },
    { x: -8, z: 10 },
    { x: -1, z: 10 },
    { x: 6, z: 10 },
    { x: 13, z: 10 }
  ];

  const instIds = ['inst1', 'inst2', 'inst3', 'inst4', 'inst5'];

  instIds.forEach((id, index) => {
    const pos = positions[index];
    const instData = instruments.find(i => i.id === id) || { status: 'normal', locked: false };
    const instGroup = createInstrument(instData);
    instGroup.position.set(pos.x, 0, pos.z);
    labObjects[id] = { group: instGroup, type: 'instrument', data: instData };
    scene.add(instGroup);
  });
}

function createInstrument(instData) {
  const group = new THREE.Group();

  const baseColor = instData.locked ? 0x664444 : 0x3a4a5a;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.8, 1.8),
    new THREE.MeshStandardMaterial({ color: baseColor, metalness: 0.7, roughness: 0.3 })
  );
  base.position.y = 0.4;
  base.castShadow = true;
  group.add(base);

  const bodyColor = instData.status === 'warning' ? 0xff8800 : (instData.locked ? 0xaa4444 : 0x4a5a6a);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.5, 1.5),
    new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.6, roughness: 0.4 })
  );
  body.position.y = 1.55;
  body.castShadow = true;
  body.name = 'instrumentBody';
  group.add(body);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.6, 0.05),
    new THREE.MeshBasicMaterial({ color: instData.locked ? 0xff0000 : 0x00ff88 })
  );
  screen.position.set(0, 1.8, 0.78);
  screen.name = 'screen';
  group.add(screen);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.1, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.8, roughness: 0.2 })
  );
  top.position.y = 2.35;
  group.add(top);

  return group;
}

function createWasteArea() {
  const wasteGroup = new THREE.Group();
  wasteGroup.position.set(18, 0, 5);

  const binColors = [0x333333, 0x333333, 0x224422, 0xcc4444];
  const binPositions = [
    { x: -1.5, z: 0 },
    { x: -1.5, z: 2 },
    { x: 1.5, z: 0 },
    { x: 1.5, z: 2 }
  ];

  const wasteIds = ['waste1', 'waste2', 'waste3', 'waste4'];

  wasteIds.forEach((id, index) => {
    const pos = binPositions[index];
    const wasteData = wasteBins.find(w => w.id === id) || { level: 50, status: 'normal' };
    const bin = createWasteBin(wasteData, binColors[index]);
    bin.position.set(pos.x, 0, pos.z);
    bin.userData.wasteId = id;
    wasteGroup.add(bin);
  });

  labObjects.wasteArea = { group: wasteGroup, type: 'waste', data: wasteBins };
  scene.add(wasteGroup);
}

function createWasteBin(wasteData, color) {
  const group = new THREE.Group();

  const binMaterial = new THREE.MeshStandardMaterial({ 
    color: wasteData.status === 'danger' ? 0xff0000 : color,
    metalness: 0.3,
    roughness: 0.7
  });
  
  const bin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.6, 1.2, 16),
    binMaterial
  );
  bin.position.y = 0.6;
  bin.castShadow = true;
  bin.name = 'wastebin';
  group.add(bin);

  const levelPercent = wasteData.level / 100;
  const levelGeo = new THREE.CylinderGeometry(0.45, 0.55, 1.1 * levelPercent, 16);
  const levelMat = new THREE.MeshBasicMaterial({ 
    color: wasteData.status === 'danger' ? 0xff0000 : 0x44aa44,
    transparent: true,
    opacity: 0.6
  });
  const level = new THREE.Mesh(levelGeo, levelMat);
  level.position.y = 0.55 * levelPercent;
  level.name = 'wastelevel';
  group.add(level);

  return group;
}

function createEquipment(width, height, depth, color) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.5, roughness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  for (const key in labObjects) {
    const obj = labObjects[key];
    const intersects = raycaster.intersectObjects(obj.group.children, true);
    if (intersects.length > 0) {
      handleObjectClick(obj);
      break;
    }
  }
}

function handleObjectClick(obj) {
  switch (obj.type) {
    case 'p3lab':
      openModal('access-modal');
      break;
    case 'table':
      const table = experimentTables.find(t => t.id === Object.keys(labObjects).find(k => labObjects[k] === obj));
      if (table && table.status === 'danger') {
        const safetyCabinet = labObjects.reagentCabinet.group;
        const leftDoor = safetyCabinet.getObjectByName('leftDoor');
        const rightDoor = safetyCabinet.getObjectByName('rightDoor');
        if (leftDoor) leftDoor.rotation.y = -Math.PI / 3;
        if (rightDoor) rightDoor.rotation.y = Math.PI / 3;
        showToast('安全柜已闭锁！', 'warning');
      }
      break;
    case 'cabinet':
      const lowStockReagent = reagents.find(r => r.status === 'warning');
      if (lowStockReagent) {
        openPurchaseModal(lowStockReagent);
      }
      break;
    case 'instrument':
      const inst = instruments.find(i => labObjects[i.id] === obj);
      if (inst && (inst.status === 'warning' || inst.locked)) {
        openMaintenanceModal(inst);
      }
      break;
    case 'waste':
      const dangerWaste = wasteBins.find(w => w.status === 'danger');
      if (dangerWaste) {
        createTransferWorkorder(dangerWaste);
      }
      break;
  }
}

function onMouseMove(event) {
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  let hovered = false;
  for (const key in labObjects) {
    const obj = labObjects[key];
    const intersects = raycaster.intersectObjects(obj.group.children, true);
    if (intersects.length > 0) {
      showTooltip(event.clientX, event.clientY, obj);
      hovered = true;
      break;
    }
  }
  
  if (!hovered) {
    document.getElementById('info-tooltip').style.display = 'none';
  }
}

function showTooltip(x, y, obj) {
  const tooltip = document.getElementById('info-tooltip');
  let content = `<h3>${obj.name || (obj.data && obj.data.name) || '设备'}</h3>`;
  
  const table = experimentTables.find(t => labObjects[t.id] === obj);
  const inst = instruments.find(i => labObjects[i.id] === obj);

  if (table) {
    content += `
      <div class="info-row"><span class="info-label">项目名称</span><span class="info-value">${table.project}</span></div>
      <div class="info-row"><span class="info-label">负责人</span><span class="info-value">${table.person}</span></div>
      <div class="info-row"><span class="info-label">温度</span><span class="info-value ${table.temp > table.temp_threshold ? 'danger' : ''}">${table.temp}°C</span></div>
      <div class="info-row"><span class="info-label">pH值</span><span class="info-value ${table.ph < table.ph_min || table.ph > table.ph_max ? 'danger' : ''}">${table.ph}</span></div>
    `;
  } else if (inst) {
    content += `
      <div class="info-row"><span class="info-label">运行时间</span><span class="info-value ${inst.status === 'warning' ? 'warning' : ''}">${inst.runtime}h</span></div>
      <div class="info-row"><span class="info-label">保养阈值</span><span class="info-value">${inst.maintenance_threshold}h</span></div>
      <div class="info-row"><span class="info-label">状态</span><span class="info-value ${inst.locked ? 'danger' : ''}">${inst.locked ? '已锁定' : '运行中'}</span></div>
    `;
  } else if (obj.type === 'p3lab') {
    content += `
      <div class="info-row"><span class="info-label">门禁状态</span><span class="info-value">已锁定</span></div>
      <div class="info-row"><span class="info-label">点击</span><span class="info-value">进入门禁系统</span></div>
    `;
  } else if (obj.type === 'cabinet') {
    const lowCount = reagents.filter(r => r.status === 'warning').length;
    content += `
      <div class="info-row"><span class="info-label">试剂总数</span><span class="info-value">${reagents.length}</span></div>
      <div class="info-row"><span class="info-label">低库存</span><span class="info-value warning">${lowCount}种</span></div>
      <div class="info-row"><span class="info-label">点击</span><span class="info-value">查看采购</span></div>
    `;
  } else if (obj.type === 'waste') {
    const dangerCount = wasteBins.filter(w => w.status === 'danger').length;
    content += `
      <div class="info-row"><span class="info-label">废液桶数</span><span class="info-value">${wasteBins.length}</span></div>
      <div class="info-row"><span class="info-label">需处理</span><span class="info-value ${dangerCount > 0 ? 'danger' : ''}">${dangerCount}个</span></div>
    `;
  }
  
  tooltip.innerHTML = content;
  tooltip.style.display = 'block';
  tooltip.style.left = (x + 15) + 'px';
  tooltip.style.top = (y + 15) + 'px';
}

function animate() {
  requestAnimationFrame(animate);
  
  const time = Date.now() * 0.001;
  
  if (autoRotate) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
  } else {
    controls.autoRotate = false;
  }
  
  for (const key in labObjects) {
    const obj = labObjects[key];
    if (!obj || !obj.group) continue;
    
    obj.group.traverse((child) => {
      if (!child.material) return;
      
      if (child.userData && child.userData.flashing) {
        const intensity = (Math.sin(time * 3) + 1) / 2;
        child.material.transparent = true;
        child.material.opacity = 0.4 + intensity * 0.4;
      }
      if (child.name === 'alarmlight') {
        const intensity = (Math.sin(time * 5) + 1) / 2;
        child.material.color.setHSL(0, 1, 0.3 + intensity * 0.3);
      }
      if (child.name === 'warningBorder') {
        const intensity = (Math.sin(time * 2) + 1) / 2;
        child.material.transparent = true;
        child.material.opacity = 0.5 + intensity * 0.5;
      }
    });
  }
  
  const wasteObj = labObjects.wasteArea;
  if (wasteObj && wasteObj.group) {
    wasteObj.group.traverse((child) => {
      if (!child.material) return;
      
      if ((child.name === 'wastebin' || child.name === 'wastelevel') && 
          child.userData && child.userData.flashing) {
        const intensity = (Math.sin(time * 4) + 1) / 2;
        child.material.transparent = true;
        child.material.opacity = 0.4 + intensity * 0.4;
      }
    });
  }
  
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function updateDateTime() {
  const now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN');
  document.getElementById('current-time').textContent = now.toLocaleTimeString('zh-CN');
}

function resetCamera() {
  camera.position.set(25, 20, 25);
  controls.target.set(0, 0, 0);
  controls.update();
}

function toggleRotation() {
  autoRotate = !autoRotate;
  showToast(autoRotate ? '自动旋转已开启' : '自动旋转已关闭', 'info');
}

async function refreshData() {
  showToast('正在刷新数据...', 'info');
  await loadAllData();
  showToast('数据已刷新', 'success');
}

function showStatistics() {
  openModal('statistics-modal');
  loadStatistics();
}

async function loadStatistics() {
  try {
    const data = await apiRequest('/export/statistics');
    const content = document.getElementById('statistics-content');
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label">设备使用率统计</label>
        <div style="background: rgba(0,212,255,0.05); padding: 12px; border-radius: 6px;">
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #a0c4ff; font-size: 12px;">设备总数</span>
              <span style="color: #00d4ff;">${data.instruments.total}台</span>
            </div>
          </div>
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #a0c4ff; font-size: 12px;">需保养</span>
              <span style="color: #ffa500;">${data.instruments.need_maintenance}台</span>
            </div>
          </div>
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #a0c4ff; font-size: 12px;">已锁定</span>
              <span style="color: #ff4444;">${data.instruments.locked}台</span>
            </div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">试剂库存统计</label>
        <div style="background: rgba(0,212,255,0.05); padding: 12px; border-radius: 6px;">
          <div class="info-row"><span class="info-label">试剂总数</span><span class="info-value">${data.reagents.total}种</span></div>
          <div class="info-row"><span class="info-label">低库存</span><span class="info-value warning">${data.reagents.low_stock}种</span></div>
          <div class="info-row"><span class="info-label">平均剩余量</span><span class="info-value">${data.reagents.avg_remaining}%</span></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">今日警报统计</label>
        <div style="background: rgba(255,68,68,0.05); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,68,68,0.2);">
          <div class="info-row"><span class="info-label">总数</span><span class="info-value danger">${data.alerts.total}次</span></div>
          <div class="info-row"><span class="info-label">危险警报</span><span class="info-value danger">${data.alerts.danger_count}次</span></div>
          <div class="info-row"><span class="info-label">警告</span><span class="info-value warning">${data.alerts.warning_count}次</span></div>
          <div class="info-row"><span class="info-label">待处理</span><span class="info-value danger">${data.alerts.unacknowledged}次</span></div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('statistics-modal')">关闭</button>
        <button class="btn btn-primary" onclick="exportExcel()">导出Excel</button>
      </div>
    `;
  } catch (error) {
    showToast('加载统计数据失败', 'error');
  }
}

function exportExcel() {
  window.open(`${API_BASE}/export/excel`, '_blank');
  showToast('正在生成Excel文件...', 'info');
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
    btn.getAttribute('onclick').includes(`'${tabName}'`)
  );
  if (activeBtn) activeBtn.classList.add('active');
  document.getElementById('tab-' + tabName).classList.add('active');
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function openPurchaseModal(reagent) {
  currentPurchaseReagent = reagent;
  document.getElementById('purchase-id').value = 'PO-' + Date.now().toString().slice(-8);
  document.getElementById('purchase-reagent').value = reagent.name;
  document.getElementById('purchase-current').value = reagent.remaining + '%';
  const suggested = Math.ceil((100 - reagent.remaining) / 100 * 500) + 'ml';
  document.getElementById('purchase-suggested').value = suggested;
  document.getElementById('purchase-amount').value = suggested;
  openModal('purchase-modal');
}

async function submitPurchase() {
  try {
    const result = await apiRequest('/reagents/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        reagent_id: currentPurchaseReagent.id,
        amount: document.getElementById('purchase-amount').value,
        remark: document.getElementById('purchase-remark').value
      })
    });

    purchaseOrders.unshift(result);
    updateOrdersList();
    closeModal('purchase-modal');
    showToast('采购申请已提交', 'success');
    loadAllData();
  } catch (error) {
    showToast('提交失败', 'error');
  }
}

function openMaintenanceModal(inst) {
  currentMaintenanceInstrument = inst;
  document.getElementById('maint-id').value = 'WO-' + Date.now().toString().slice(-8);
  document.getElementById('maint-instrument').value = inst.name;
  document.getElementById('maint-runtime').value = inst.runtime + '小时';
  document.getElementById('maint-date').value = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  openModal('maintenance-modal');
}

async function submitMaintenance() {
  try {
    const result = await apiRequest('/instruments/maintenance/workorders', {
      method: 'POST',
      body: JSON.stringify({
        instrument_id: currentMaintenanceInstrument.id,
        maintenance_type: document.getElementById('maint-type').value,
        scheduled_date: document.getElementById('maint-date').value,
        description: document.getElementById('maint-desc').value
      })
    });

    maintenanceWorkorders.unshift(result);
    updateWorkordersList();
    closeModal('maintenance-modal');
    showToast('保养工单已创建', 'success');
    loadAllData();
  } catch (error) {
    showToast('创建失败', 'error');
  }
}

async function createTransferWorkorder(waste) {
  try {
    const result = await apiRequest('/waste/transfer/workorders', {
      method: 'POST',
      body: JSON.stringify({ waste_id: waste.id })
    });

    transferWorkorders.unshift(result);
    updateWorkordersList();
    showToast('转运工单已创建', 'success');
    loadAllData();
  } catch (error) {
    showToast('创建失败', 'error');
  }
}

async function completeWorkorder(workorderId) {
  try {
    const isMaint = workorderId.startsWith('WO');
    const endpoint = isMaint 
      ? `/instruments/maintenance/workorders/${workorderId}`
      : `/waste/transfer/workorders/${workorderId}`;

    await apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' })
    });

    showToast('工单已完成', 'success');
    loadAllData();
  } catch (error) {
    showToast('操作失败', 'error');
  }
}

async function simulateFaceScan() {
  const select = document.getElementById('person-select');
  const personName = select.options[select.selectedIndex].text;
  const statusDiv = document.getElementById('access-status');
  const scanArea = document.getElementById('face-scan-area');

  scanArea.style.borderColor = '#ffa500';
  statusDiv.textContent = '正在识别中...';
  statusDiv.style.color = '#ffa500';

  try {
    const result = await apiRequest('/access/face-scan', {
      method: 'POST',
      body: JSON.stringify({ person_name: personName })
    });

    setTimeout(() => {
      if (result.authorized) {
        scanArea.style.borderColor = '#00ff88';
        statusDiv.textContent = result.message;
        statusDiv.style.color = '#00ff88';
        
        const p3Obj = labObjects.p3Lab.group;
        const door = p3Obj.getObjectByName('p3door');
        const light = p3Obj.getObjectByName('p3accesslight');
        if (door) door.rotation.y = -Math.PI / 2;
        if (light) light.material.color.setHex(0x00ff00);
        
        showToast('P3实验室门禁已解锁', 'success');
      } else {
        scanArea.style.borderColor = '#ff4444';
        statusDiv.textContent = result.message;
        statusDiv.style.color = '#ff4444';
        
        const p3Obj = labObjects.p3Lab.group;
        const light = p3Obj.getObjectByName('p3accesslight');
        if (light) light.material.color.setHex(0xff0000);
        
        showToast('非授权进入警报！', 'error');
      }
      loadAllData();
    }, 1500);
  } catch (error) {
    scanArea.style.borderColor = '#ff4444';
    statusDiv.textContent = '识别失败';
    statusDiv.style.color = '#ff4444';
  }
}

async function acknowledgeAlert(alertId) {
  try {
    await apiRequest(`/alerts/${alertId}/acknowledge`, { method: 'PUT' });
    alerts = alerts.filter(a => a.id !== alertId);
    updateAlertsList();
    updateSidebarStats();
    showToast('警报已确认', 'info');
  } catch (error) {
    showToast('操作失败', 'error');
  }
}

async function resolveConflict(scheduleId) {
  const schedule = schedules.find(s => s.id === scheduleId);
  if (schedule && schedule.conflict_suggestion) {
    if (confirm(`${schedule.conflict_suggestion}\n\n是否自动调整？`)) {
      try {
        await apiRequest('/schedules/resolve-conflict', {
          method: 'POST',
          body: JSON.stringify({
            schedule_id: scheduleId,
            new_start_time: '13:00',
            new_end_time: '16:00'
          })
        });
        showToast('预约已调整', 'success');
        loadAllData();
      } catch (error) {
        showToast('调整失败', 'error');
      }
    }
  }
}

async function simulateAlert() {
  try {
    const tables = experimentTables.filter(t => t.status !== 'danger');
    if (tables.length > 0) {
      const randomTable = tables[Math.floor(Math.random() * tables.length)];
      await apiRequest(`/experiment-tables/simulate`, {
        method: 'POST',
        body: JSON.stringify({ id: randomTable.id, type: 'both' })
      });
      showToast('模拟警报已触发', 'warning');
      loadAllData();
    }
  } catch (error) {
    showToast('模拟失败', 'error');
  }
}

let previousReagentStatus = {};
let previousInstrumentStatus = {};
let previousWasteStatus = {};

async function autoGenerateWorkorders() {
  try {
    reagents.forEach(reagent => {
      const prevStatus = previousReagentStatus[reagent.id];
      if (reagent.status === 'warning' && prevStatus !== 'warning') {
        apiRequest(`/reagents/${reagent.id}/purchase-order`, {
          method: 'POST',
          body: JSON.stringify({ applicant: '系统自动生成' })
        }).then(order => {
          showToast(`已自动生成${reagent.name}采购申请单`, 'info');
          purchaseOrders.unshift(order);
          updateOrdersList();
        }).catch(() => {});
      }
      previousReagentStatus[reagent.id] = reagent.status;
    });

    instruments.forEach(inst => {
      const prevStatus = previousInstrumentStatus[inst.id];
      const processedKey = inst.id + '_processed';
      if ((inst.status === 'warning' || inst.locked) && prevStatus !== 'warning' && !previousInstrumentStatus[processedKey]) {
        apiRequest('/instruments/' + inst.id + '/maintenance-order', {
          method: 'POST',
          body: JSON.stringify({ maintenance_type: '常规保养' })
        }).then(workorder => {
          showToast('已自动生成' + inst.name + '保养工单，仪器已锁定', 'warning');
          maintenanceWorkorders.unshift(workorder);
          updateWorkordersList();
          previousInstrumentStatus[processedKey] = true;
        }).catch(() => {});
      }
      previousInstrumentStatus[inst.id] = inst.status;
    });

    wasteBins.forEach(waste => {
      const prevStatus = previousWasteStatus[waste.id];
      if (waste.status === 'danger' && prevStatus !== 'danger') {
        apiRequest(`/waste/${waste.id}/transfer-workorder`, {
          method: 'POST'
        }).then(workorder => {
          showToast(`已自动生成${waste.name}转运工单`, 'danger');
          transferWorkorders.unshift(workorder);
          updateWorkordersList();
        }).catch(() => {});
      }
      previousWasteStatus[waste.id] = waste.status;
    });
  } catch (error) {
    console.log('Auto workorder generation error:', error);
  }
}

async function autoAdjustSchedules() {
  try {
    const result = await apiRequest('/schedules/auto-adjust', {
      method: 'POST'
    });

    if (result.adjustments && result.adjustments.length > 0) {
      result.adjustments.forEach(adj => {
        showToast(`预约调整: ${adj.project} 已从 ${adj.old_time} 调整至 ${adj.new_time}`, 'info');
      });

      const suggestionHtml = result.adjustments.map(adj => `
        <div class="alert-item info">
          <div class="alert-title">📅 预约自动调整</div>
          <div class="alert-desc">${adj.project}: ${adj.old_time} → ${adj.new_time}</div>
          <div class="alert-desc" style="font-size: 10px; color: #8899aa; margin-top: 2px;">${adj.reason}</div>
        </div>
      `).join('');

      const alertsList = document.getElementById('alerts-list');
      alertsList.innerHTML = suggestionHtml + alertsList.innerHTML;

      schedules = result.schedules || schedules;
      updateSchedule();
      updateSidebarStats();
    } else if (result.remaining_conflicts === 0) {
      showToast('预约调度已优化，无冲突', 'success');
    }
  } catch (error) {
    console.log('Schedule auto-adjust error:', error);
    showToast('自动调整失败', 'error');
  }
}

async function autoAdjustScheduleClick() {
  if (confirm('是否自动调整所有冲突的预约？系统将按优先级自动调整时间')) {
    await autoAdjustSchedules();
  }
}

window.onload = init;
