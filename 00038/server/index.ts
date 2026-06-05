import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  Simulation,
  SimulationStatus,
  SimulationResult,
  Notification,
  User,
} from '../shared/types';
import {
  validateParameters,
  detectPlasmaType,
  matchPlasmaModel,
  generateGrid,
  calculatePerformanceMetrics,
} from '../src/utils/plasmaUtils';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const mockUsers: User[] = [
  {
    id: 'user-1',
    name: '张管理员',
    email: 'admin@plasma-lab.com',
    role: 'ADMIN',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  },
  {
    id: 'user-2',
    name: '李负责人',
    email: 'leader@plasma-lab.com',
    role: 'LEADER',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=leader',
  },
  {
    id: 'user-3',
    name: '王研究员',
    email: 'member@plasma-lab.com',
    role: 'MEMBER',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
  },
];

let simulations: Simulation[] = [];
let notifications: Notification[] = [];

const performanceTargets = {
  targetConfinementTime: 0.5,
  targetFusionPower: 50,
  targetBetaValue: 3.5,
  targetStabilityMargin: 1.5,
};

function createMockResult(): SimulationResult {
  const randomFactor = 0.8 + Math.random() * 0.4;
  const confinementTime = 0.3 + Math.random() * 0.5;
  const fusionPower = 30 + Math.random() * 70;
  const betaValue = 2 + Math.random() * 3;
  const stabilityMargin = 1 + Math.random() * 2;
  const energyConfinement = 10 + Math.random() * 20;

  const timeSeriesData = Array.from({ length: 50 }, (_, i) => ({
    time: i * 0.01,
    growthRate: 0.05 + Math.random() * 0.3,
    averageDensity: 1e19 + Math.random() * 5e18,
    averageTemperature: 1e7 + Math.random() * 5e6,
    storedEnergy: 5 + Math.random() * 3,
    timeStep: 1e-8,
    mode: 'FLUID_MHD' as const,
  }));

  return {
    finalDensity: Array(20).fill(0).map(() => Array(20).fill(0).map(() => Array(20).fill(0).map(() => 1e19 + Math.random() * 5e18))),
    finalTemperature: Array(20).fill(0).map(() => Array(20).fill(0).map(() => Array(20).fill(0).map(() => 1e7 + Math.random() * 5e6))),
    velocityField: Array(20).fill(0).map(() => Array(20).fill(0).map(() => Array(20).fill(0).map(() => [Math.random() * 1e5, Math.random() * 1e5, Math.random() * 1e5]))),
    confinementTime,
    fusionPower,
    betaValue,
    stabilityMargin,
    energyConfinement,
    timeSeriesData,
    performanceTargets,
  };
}

function createMockSimulations() {
  const baseSimulations: Partial<Simulation>[] = [
    {
      name: '托克马克高约束模式实验 H-98',
      description: 'EAST装置高约束模式等离子体模拟，研究L-H转换阈值',
      plasmaType: 'TOKAMAK',
      mode: 'FLUID_MHD',
      parameters: {
        densityProfile: [[1e19, 0.8e19], [1.2e19, 0.9e19]],
        temperatureProfile: [[1e7, 0.9e7], [1.2e7, 1e7]],
        magneticField: 5.5,
        majorRadius: 1.8,
        minorRadius: 0.45,
        plasmaCurrent: 1.2,
      },
      boundaryConditions: [
        { id: 'bc-1', name: '内表面', type: 'DIRICHLET', location: 'INNER', value: 300 },
        { id: 'bc-2', name: '外表面', type: 'NEUMANN', location: 'OUTER', value: 0 },
        { id: 'bc-3', name: '上边界', type: 'ABSORBING', location: 'TOP', value: 0 },
        { id: 'bc-4', name: '下边界', type: 'ABSORBING', location: 'BOTTOM', value: 0 },
      ],
      sourceTerms: [
        { id: 'src-1', name: 'ECRH加热', type: 'HEATING', amplitude: 5e6, spatialProfile: 'gaussian', startTime: 0, duration: 5 },
        { id: 'src-2', name: '氘氚燃料注入', type: 'FUELING', amplitude: 1e20, spatialProfile: 'uniform', startTime: 1, duration: 3 },
      ],
      status: 'COMPLETED',
      progress: 100,
      createdBy: 'user-1',
      modelType: 'MHD + Transport',
    },
    {
      name: '仿星器W7-X基准测试',
      description: 'W7-X仿星器优化磁场位形下的等离子体约束性能模拟',
      plasmaType: 'STELLARATOR',
      mode: 'HYBRID',
      parameters: {
        densityProfile: [[8e18, 0.7e18], [1e19, 0.8e18]],
        temperatureProfile: [[8e6, 0.7e6], [1e7, 0.9e7]],
        magneticField: 3.0,
        majorRadius: 5.5,
        minorRadius: 0.55,
        plasmaCurrent: 0,
      },
      boundaryConditions: [
        { id: 'bc-5', name: '第一壁', type: 'DIRICHLET', location: 'OUTER', value: 300 },
        { id: 'bc-6', name: '偏滤器区', type: 'NEUMANN', location: 'BOTTOM', value: -1e5 },
      ],
      sourceTerms: [
        { id: 'src-3', name: 'NBI加热', type: 'HEATING', amplitude: 8e6, spatialProfile: 'radial', startTime: 0, duration: 8 },
      ],
      status: 'COMPLETED',
      progress: 100,
      createdBy: 'user-2',
      modelType: 'MHD + Kinetic',
    },
    {
      name: '惯性约束聚变黑腔模拟',
      description: 'NIF规模黑腔内爆压缩过程，研究瑞利-泰勒不稳定性',
      plasmaType: 'INERTIAL',
      mode: 'PARTICLE_PIC',
      parameters: {
        densityProfile: [[1e25, 1e24], [1e26, 1e25]],
        temperatureProfile: [[1e8, 1e7], [1.2e8, 1.2e7]],
        magneticField: 0,
        majorRadius: 0.002,
        minorRadius: 0.001,
        plasmaCurrent: 0,
      },
      boundaryConditions: [
        { id: 'bc-7', name: '黑腔壁', type: 'ABSORBING', location: 'OUTER', value: 0 },
      ],
      sourceTerms: [
        { id: 'src-4', name: '激光驱动', type: 'HEATING', amplitude: 1e14, spatialProfile: 'gaussian', startTime: 0, duration: 1e-8 },
      ],
      status: 'COMPLETED',
      progress: 100,
      createdBy: 'user-1',
      modelType: 'PIC + Radiation',
    },
    {
      name: '磁镜装置等离子体约束',
      description: '串联磁镜中等离子体约束与损失模拟',
      plasmaType: 'MAGNETIC_MIRROR',
      mode: 'FLUID_MHD',
      parameters: {
        densityProfile: [[5e18, 0.5e18], [6e18, 0.6e18]],
        temperatureProfile: [[5e6, 0.5e6], [6e6, 0.6e6]],
        magneticField: 2.5,
        majorRadius: 0,
        minorRadius: 0.3,
        plasmaCurrent: 0.05,
      },
      boundaryConditions: [
        { id: 'bc-8', name: '左磁喉', type: 'PERIODIC', location: 'INNER', value: 0 },
        { id: 'bc-9', name: '右磁喉', type: 'PERIODIC', location: 'OUTER', value: 0 },
      ],
      sourceTerms: [
        { id: 'src-5', name: 'ECH加热', type: 'HEATING', amplitude: 2e6, spatialProfile: 'axial', startTime: 0, duration: 4 },
        { id: 'src-6', name: '杂质注入', type: 'IMPURITY', amplitude: 1e15, spatialProfile: 'gaussian', startTime: 2, duration: 1 },
      ],
      status: 'COMPLETED',
      progress: 100,
      createdBy: 'user-3',
      modelType: 'MHD',
    },
    {
      name: '托克马克撕裂模实验',
      description: '研究m=2/n=1撕裂模演化与ELM相互作用',
      plasmaType: 'TOKAMAK',
      mode: 'HYBRID',
      parameters: {
        densityProfile: [[9e18, 0.7e18], [1.1e19, 0.85e18]],
        temperatureProfile: [[9e6, 0.7e6], [1.1e7, 0.85e6]],
        magneticField: 5.0,
        majorRadius: 2.0,
        minorRadius: 0.5,
        plasmaCurrent: 1.5,
      },
      boundaryConditions: [
        { id: 'bc-10', name: '内表面', type: 'DIRICHLET', location: 'INNER', value: 300 },
        { id: 'bc-11', name: '外表面', type: 'NEUMANN', location: 'OUTER', value: 0 },
      ],
      sourceTerms: [
        { id: 'src-7', name: 'ICRF加热', type: 'HEATING', amplitude: 4e6, spatialProfile: 'radial', startTime: 0, duration: 6 },
        { id: 'src-8', name: 'LHCD电流驱动', type: 'CURRENT_DRIVE', amplitude: 0.3, spatialProfile: 'central', startTime: 0.5, duration: 5 },
      ],
      status: 'COMPUTING',
      progress: 68,
      createdBy: 'user-2',
      modelType: 'MHD + Kinetic',
    },
    {
      name: '稳态高β等离子体',
      description: '探索高β稳态运行方案，β目标>4%',
      plasmaType: 'TOKAMAK',
      mode: 'FLUID_MHD',
      parameters: {
        densityProfile: [[1.5e19, 1e19], [1.8e19, 1.2e19]],
        temperatureProfile: [[1.5e7, 1e7], [1.8e7, 1.2e7]],
        magneticField: 4.5,
        majorRadius: 2.2,
        minorRadius: 0.6,
        plasmaCurrent: 1.8,
      },
      boundaryConditions: [
        { id: 'bc-12', name: '内表面', type: 'DIRICHLET', location: 'INNER', value: 300 },
        { id: 'bc-13', name: '外表面', type: 'NEUMANN', location: 'OUTER', value: 0 },
        { id: 'bc-14', name: '上边界', type: 'ABSORBING', location: 'TOP', value: 0 },
        { id: 'bc-15', name: '下边界', type: 'ABSORBING', location: 'BOTTOM', value: 0 },
      ],
      sourceTerms: [
        { id: 'src-9', name: 'NBI加热', type: 'HEATING', amplitude: 10e6, spatialProfile: 'radial', startTime: 0, duration: 10 },
        { id: 'src-10', name: 'ECRH加热', type: 'HEATING', amplitude: 5e6, spatialProfile: 'gaussian', startTime: 2, duration: 8 },
      ],
      status: 'PAUSED',
      progress: 45,
      createdBy: 'user-1',
      modelType: 'MHD + Transport',
      convergenceCount: 3,
    },
  ];

  const now = Date.now();
  simulations = baseSimulations.map((sim, index) => {
    const createdAt = new Date(now - (baseSimulations.length - index) * 3600000 * 2).toISOString();
    const result = sim.status === 'COMPLETED' ? createMockResult() : undefined;

    return {
      id: uuidv4(),
      name: sim.name!,
      description: sim.description!,
      plasmaType: sim.plasmaType!,
      status: sim.status!,
      mode: sim.mode!,
      parameters: sim.parameters!,
      boundaryConditions: sim.boundaryConditions!,
      sourceTerms: sim.sourceTerms!,
      modelType: sim.modelType!,
      createdAt,
      createdBy: sim.createdBy!,
      progress: sim.progress!,
      instabilityGrowthRate: 0.1 + Math.random() * 0.2,
      convergenceCount: sim.convergenceCount || 0,
      result,
    };
  });

  notifications = [
    {
      id: uuidv4(),
      type: 'PERFORMANCE_ALERT',
      title: '稳态高β等离子体性能未达目标',
      message: '工况"稳态高β等离子体"的β值计算为2.8%，低于目标值4.0%。建议增加辅助加热功率或优化等离子体形状。',
      simulationId: simulations[5].id,
      read: false,
      createdAt: new Date(now - 1800000).toISOString(),
      recipients: ['user-1', 'user-2', 'user-3'],
    },
    {
      id: uuidv4(),
      type: 'CONVERGENCE_ISSUE',
      title: '收敛问题 - 工况已自动暂停',
      message: '工况"稳态高β等离子体"连续3次模拟不收敛，系统已自动暂停该工况。请检查参数设置或降低CFL数。',
      simulationId: simulations[5].id,
      read: false,
      createdAt: new Date(now - 3600000).toISOString(),
      recipients: ['user-1', 'user-2'],
    },
    {
      id: uuidv4(),
      type: 'SIMULATION_COMPLETE',
      title: '托克马克高约束模式实验 H-98 已完成',
      message: '模拟计算已完成，约束时间 0.42s，聚变功率 58.7 MW。详细结果已生成，可在详情页查看。',
      simulationId: simulations[0].id,
      read: true,
      createdAt: new Date(now - 7200000).toISOString(),
      recipients: ['user-1', 'user-2', 'user-3'],
    },
    {
      id: uuidv4(),
      type: 'SUGGESTION',
      title: '优化建议：提升约束性能',
      message: '基于多工况对比分析，建议将磁场强度从5.5T提升至6.0T，预计约束时间可提升15%。',
      simulationId: simulations[0].id,
      read: true,
      createdAt: new Date(now - 10800000).toISOString(),
      recipients: ['user-1', 'user-2', 'user-3'],
    },
    {
      id: uuidv4(),
      type: 'INSTABILITY_ALERT',
      title: '撕裂模不稳定性增长加速',
      message: '工况"托克马克撕裂模实验"中m=2/n=1撕裂模增长率超过阈值0.3，已自动将时间步长从1e-8s调整为5e-9s。',
      simulationId: simulations[4].id,
      read: false,
      createdAt: new Date(now - 600000).toISOString(),
      recipients: ['user-1', 'user-2', 'user-3'],
    },
  ];
}

createMockSimulations();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/simulations', (_req, res) => {
  res.json(simulations);
});

app.get('/api/simulations/:id', (req, res) => {
  const sim = simulations.find((s) => s.id === req.params.id);
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  res.json(sim);
});

app.post('/api/simulations', (req, res) => {
  const { name, description, parameters, boundaryConditions, sourceTerms } = req.body;

  const validation = validateParameters(parameters);
  if (!validation.valid) {
    return res.status(400).json({ error: '参数校验失败', details: validation.errors });
  }

  const plasmaType = detectPlasmaType(parameters);
  const modelType = matchPlasmaModel(plasmaType);
  const grid = generateGrid({ type: 'structured', resolution: 20 });

  const newSim: Simulation = {
    id: uuidv4(),
    name,
    description,
    plasmaType,
    status: 'PARAM_VALIDATION',
    mode: 'FLUID_MHD',
    parameters,
    boundaryConditions,
    sourceTerms,
    modelType,
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    progress: 0,
    instabilityGrowthRate: 0,
    convergenceCount: 0,
  };

  simulations.unshift(newSim);

  io.emit('simulation:created', newSim);

  setTimeout(() => runSimulation(newSim.id), 1000);

  res.status(201).json(newSim);
});

app.get('/api/simulations/:id/progress', (req, res) => {
  const sim = simulations.find((s) => s.id === req.params.id);
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  res.json({
    status: sim.status,
    progress: sim.progress,
    instabilityGrowthRate: sim.instabilityGrowthRate,
    convergenceCount: sim.convergenceCount,
  });
});

app.post('/api/simulations/:id/pause', (req, res) => {
  const sim = simulations.find((s) => s.id === req.params.id);
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  if (sim.status === 'COMPUTING') {
    sim.status = 'PAUSED';
    io.emit('simulation:updated', sim);
  }
  res.json(sim);
});

app.post('/api/simulations/:id/resume', (req, res) => {
  const sim = simulations.find((s) => s.id === req.params.id);
  if (!sim) return res.status(404).json({ error: 'Simulation not found' });
  if (sim.status === 'PAUSED') {
    sim.status = 'COMPUTING';
    io.emit('simulation:updated', sim);
    setTimeout(() => runSimulation(sim.id), 1000);
  }
  res.json(sim);
});

app.delete('/api/simulations/:id', (req, res) => {
  const index = simulations.findIndex((s) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Simulation not found' });
  const deleted = simulations.splice(index, 1)[0];
  io.emit('simulation:deleted', deleted.id);
  res.json(deleted);
});

app.get('/api/notifications', (_req, res) => {
  res.json(notifications.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const notification = notifications.find((n) => n.id === req.params.id);
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  notification.read = true;
  io.emit('notification:updated', notification);
  res.json(notification);
});

app.post('/api/notifications/read-all', (_req, res) => {
  notifications.forEach((n) => (n.read = true));
  io.emit('notifications:all-read');
  res.json({ success: true, count: notifications.length });
});

app.post('/api/compare', (req, res) => {
  const { simulationIds } = req.body;
  const sims = simulations.filter((s) => simulationIds.includes(s.id) && s.status === 'COMPLETED' && s.result);

  if (sims.length < 2) {
    return res.status(400).json({ error: '至少需要2个已完成的模拟工况' });
  }

  const radarData = sims.map((sim) => ({
    simulationId: sim.id,
    simulationName: sim.name,
    indicators: [
      { name: '约束时间', value: sim.result!.confinementTime, unit: 's', max: 1.0 },
      { name: '聚变功率', value: sim.result!.fusionPower, unit: 'MW', max: 100 },
      { name: 'β值', value: sim.result!.betaValue, unit: '%', max: 5.0 },
      { name: '稳定裕度', value: sim.result!.stabilityMargin, unit: '', max: 3.0 },
      { name: '能量约束', value: sim.result!.energyConfinement, unit: 'MJ', max: 30 },
    ],
    color: '',
  }));

  const colors = ['#6366F1', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  radarData.forEach((d, i) => (d.color = colors[i % colors.length]));

  const underperformingIds: string[] = [];
  sims.forEach((sim) => {
    if (sim.result!.fusionPower < performanceTargets.targetFusionPower) {
      underperformingIds.push(sim.id);
    }
  });

  const suggestions = [
    {
      id: uuidv4(),
      type: 'PARAMETER' as const,
      priority: 'HIGH' as const,
      title: '增加辅助加热功率',
      description: '当前工况聚变功率低于目标值，建议将NBI加热功率从当前水平提升20%，预计聚变功率可提升15-20%。',
      parameterAffected: '聚变功率、约束时间',
      expectedImprovement: '+18% 聚变功率',
      relatedSimulationIds: underperformingIds,
    },
    {
      id: uuidv4(),
      type: 'BOUNDARY' as const,
      priority: 'MEDIUM' as const,
      title: '优化边界条件设置',
      description: '建议将外边界从诺依曼条件改为吸收边界条件，可减少边界反射，提升约束性能约8%。',
      parameterAffected: '边界约束、能量损失',
      expectedImprovement: '+8% 约束时间',
      relatedSimulationIds: underperformingIds,
    },
    {
      id: uuidv4(),
      type: 'MODEL' as const,
      priority: 'MEDIUM' as const,
      title: '考虑使用混合模型',
      description: '当前使用流体MHD模型，对于高β等离子体建议切换到混合模型(Hybrid)以获得更精确的动力学效应。',
      parameterAffected: '计算精度、稳定性',
      expectedImprovement: '精度提升',
      relatedSimulationIds: underperformingIds,
    },
  ];

  res.json({
    simulationIds,
    radarData,
    underperformingIds,
    suggestions,
  });
});

app.get('/api/users', (_req, res) => {
  res.json(mockUsers);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers.find((u) => u.email === email);

  if (!user || password !== '123456') {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }

  const token = `token_${uuidv4()}`;
  res.json({ user, token });
});

async function runSimulation(simId: string) {
  const sim = simulations.find((s) => s.id === simId);
  if (!sim || sim.status === 'PAUSED' || sim.status === 'COMPLETED' || sim.status === 'FAILED') {
    return;
  }

  const statusFlow: SimulationStatus[] = ['PARAM_VALIDATION', 'GRID_GENERATION', 'COMPUTING', 'DATA_DIAGNOSIS'];

  for (const status of statusFlow) {
    sim.status = status;
    io.emit('simulation:updated', sim);

    const steps = status === 'COMPUTING' ? 20 : 10;
    const progressIncrement = status === 'COMPUTING' ? 50 : 25;
    const baseProgress = statusFlow.indexOf(status) * 25;

    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const currentSim = simulations.find((s) => s.id === simId);
      if (!currentSim || currentSim.status === 'PAUSED' || currentSim.status === 'FAILED') {
        return;
      }

      currentSim.progress = baseProgress + (i / steps) * progressIncrement;

      if (status === 'COMPUTING') {
        currentSim.instabilityGrowthRate = 0.05 + Math.random() * 0.35;

        if (currentSim.instabilityGrowthRate > 0.3 && Math.random() < 0.1) {
          const notif: Notification = {
            id: uuidv4(),
            type: 'INSTABILITY_ALERT',
            title: '不稳定性增长率超过阈值',
            message: `检测到不稳定性增长率 ${currentSim.instabilityGrowthRate.toFixed(3)} > 0.3，已自动调整时间步长。`,
            simulationId: currentSim.id,
            read: false,
            createdAt: new Date().toISOString(),
            recipients: ['user-1', 'user-2', 'user-3'],
          };
          notifications.unshift(notif);
          io.emit('notification:created', notif);
        }

        if (Math.random() < 0.02) {
          currentSim.convergenceCount++;
          if (currentSim.convergenceCount >= 3) {
            currentSim.status = 'PAUSED';
            io.emit('simulation:updated', currentSim);

            const notif: Notification = {
              id: uuidv4(),
              type: 'CONVERGENCE_ISSUE',
              title: '收敛问题 - 工况已自动暂停',
              message: `工况"${currentSim.name}"连续3次模拟不收敛，系统已自动暂停。请检查参数设置。`,
              simulationId: currentSim.id,
              read: false,
              createdAt: new Date().toISOString(),
              recipients: ['user-1', 'user-2'],
            };
            notifications.unshift(notif);
            io.emit('notification:created', notif);
            return;
          }
        }
      }

      io.emit('simulation:progress', {
        id: simId,
        progress: currentSim.progress,
        status: currentSim.status,
        instabilityGrowthRate: currentSim.instabilityGrowthRate,
        convergenceCount: currentSim.convergenceCount,
      });
    }
  }

  sim.status = 'COMPLETED';
  sim.progress = 100;
  sim.result = calculatePerformanceMetrics(
    sim.parameters,
    performanceTargets,
    Array.from({ length: 50 }, (_, i) => ({
      time: i * 0.01,
      growthRate: 0.05 + Math.random() * 0.3,
      averageDensity: 1e19 + Math.random() * 5e18,
      averageTemperature: 1e7 + Math.random() * 5e6,
      storedEnergy: 5 + Math.random() * 3,
      timeStep: 1e-8,
      mode: sim.mode,
    }))
  );

  io.emit('simulation:updated', sim);
  io.emit('simulation:completed', sim);

  const completeNotif: Notification = {
    id: uuidv4(),
    type: 'SIMULATION_COMPLETE',
    title: `模拟完成: ${sim.name}`,
    message: `计算已完成，约束时间 ${sim.result.confinementTime.toFixed(3)}s，聚变功率 ${sim.result.fusionPower.toFixed(1)} MW。`,
    simulationId: sim.id,
    read: false,
    createdAt: new Date().toISOString(),
    recipients: ['user-1', 'user-2', 'user-3'],
  };
  notifications.unshift(completeNotif);
  io.emit('notification:created', completeNotif);

  if (sim.result.fusionPower < performanceTargets.targetFusionPower ||
      sim.result.confinementTime < performanceTargets.targetConfinementTime) {
    const alertNotif: Notification = {
      id: uuidv4(),
      type: 'PERFORMANCE_ALERT',
      title: `性能预警: ${sim.name}`,
      message: `工况性能低于目标值：聚变功率 ${sim.result.fusionPower.toFixed(1)} MW / ${performanceTargets.targetFusionPower} MW，约束时间 ${sim.result.confinementTime.toFixed(3)}s / ${performanceTargets.targetConfinementTime}s。`,
      simulationId: sim.id,
      read: false,
      createdAt: new Date().toISOString(),
      recipients: ['user-1', 'user-2', 'user-3'],
    };
    notifications.unshift(alertNotif);
    io.emit('notification:created', alertNotif);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('simulation:subscribe', (simId) => {
    socket.join(`sim:${simId}`);
    const sim = simulations.find((s) => s.id === simId);
    if (sim) {
      socket.emit('simulation:update', sim);
    }
  });

  socket.on('simulation:unsubscribe', (simId) => {
    socket.leave(`sim:${simId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Plasma simulation server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
