import { useState, useMemo } from 'react';
import {
  Users,
  Zap,
  Clock,
  MapPin,
  Send,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  CloudSun,
  UserCheck,
  Filter,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import type { GroundCrew } from '../../types';

type StatusFilter = 'all' | 'available' | 'busy' | 'off_duty';

const SKILL_COLORS: Record<string, string> = {
  机坪引导: 'bg-cyan-glow/20 text-cyan-glow',
  行李装卸: 'bg-amber-glow/20 text-amber-glow',
  推车牵引: 'bg-primary-light/20 text-primary-light',
  除冰作业: 'bg-sky-400/20 text-sky-400',
  值机协助: 'bg-violet-400/20 text-violet-400',
  旅客引导: 'bg-emerald-400/20 text-emerald-400',
  货舱操作: 'bg-orange-400/20 text-orange-400',
  安检协助: 'bg-rose-400/20 text-rose-400',
  应急处理: 'bg-danger/20 text-danger',
  特殊旅客服务: 'bg-pink-400/20 text-pink-400',
  电气维修: 'bg-teal-400/20 text-teal-400',
  设备巡检: 'bg-lime-400/20 text-lime-400',
  危险品处理: 'bg-red-400/20 text-red-400',
  加油协调: 'bg-yellow-400/20 text-yellow-400',
  多语种服务: 'bg-indigo-400/20 text-indigo-400',
};

const STATUS_CONFIG = {
  available: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', label: '空闲' },
  busy: { color: 'text-amber-glow', bg: 'bg-amber-glow/10', border: 'border-amber-glow/30', label: '忙碌' },
  off_duty: { color: 'text-primary-light/40', bg: 'bg-primary-light/5', border: 'border-primary-light/20', label: '休息' },
} as const;

interface PendingTask {
  id: string;
  flightNo: string;
  flightId: string;
  taskType: string;
  terminalId: string;
  time: string;
  location: string;
}

interface AssignmentResult {
  taskId: string;
  flightNo: string;
  taskType: string;
  crewId: string;
  crewName: string;
  matchedSkill: string;
}

function getInitials(name: string): string {
  return name.slice(0, 1);
}

const INITIAL_COLORS = [
  'bg-cyan-glow/30 text-cyan-glow',
  'bg-amber-glow/30 text-amber-glow',
  'bg-primary-light/30 text-primary-light',
  'bg-success/30 text-success',
  'bg-violet-400/30 text-violet-400',
  'bg-rose-400/30 text-rose-400',
  'bg-teal-400/30 text-teal-400',
];

export default function GroundCrewScheduling() {
  const {
    groundCrew,
    terminals,
    flights,
    crewTasks,
    currentRole,
    currentUser,
    generateCrewSchedule,
    updateTaskStatus,
    pushTasksToCrew,
  } = useAirport();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [assignmentResults, setAssignmentResults] = useState<AssignmentResult[]>([]);
  const [showAssignment, setShowAssignment] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pendingTasks = useMemo(() => {
    const tasks: PendingTask[] = [];
    const activeFlights = flights.filter(
      (f) => f.status === 'boarding' || f.status === 'scheduled' || f.status === 'delayed',
    );

    const taskTypes = ['登机引导', '行李装卸', '机坪引导', '加油', '货运', '牵引', '特殊旅客'] as const;

    activeFlights.forEach((f, idx) => {
      const count = idx % 2 === 0 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const type = taskTypes[(idx + i) % taskTypes.length];
        const gate = f.gateId ? f.gateId.replace('G-', '') : f.terminalId;
        tasks.push({
          id: `PT-${f.id}-${i}`,
          flightNo: f.flightNo,
          flightId: f.id,
          taskType: type,
          terminalId: f.terminalId,
          time: f.scheduledDeparture.slice(11, 16),
          location: `${f.terminalId} ${gate}`,
        });
      }
    });

    return tasks;
  }, [flights]);

  const filteredCrew = useMemo(() => {
    let crewList = groundCrew;
    if (currentRole === 'ground_crew' && currentUser && 'id' in currentUser) {
      crewList = groundCrew.filter((c) => c.id === currentUser.id);
    }
    return statusFilter === 'all' ? crewList : crewList.filter((c) => c.status === statusFilter);
  }, [groundCrew, statusFilter, currentRole, currentUser]);

  const selectedCrew = useMemo(
    () => groundCrew.find((c) => c.id === selectedCrewId) ?? null,
    [groundCrew, selectedCrewId],
  );

  const filteredCrewTasks = useMemo(() => {
    if (currentRole === 'ground_crew' && currentUser && 'id' in currentUser) {
      return crewTasks.filter((t) => t.crewId === currentUser.id);
    }
    if (selectedCrewId) {
      return crewTasks.filter((t) => t.crewId === selectedCrewId);
    }
    return crewTasks;
  }, [crewTasks, selectedCrewId, currentRole, currentUser]);

  const statusCounts = useMemo(() => {
    const counts = { available: 0, busy: 0, off_duty: 0 };
    groundCrew.forEach((c) => { counts[c.status]++; });
    return counts;
  }, [groundCrew]);

  const shiftData = useMemo(() => {
    const shifts = { morning: [] as GroundCrew[], afternoon: [] as GroundCrew[], night: [] as GroundCrew[] };
    groundCrew.forEach((c) => {
      if (c.shift.startsWith('早班')) shifts.morning.push(c);
      else if (c.shift.startsWith('中班')) shifts.afternoon.push(c);
      else if (c.shift.startsWith('夜班')) shifts.night.push(c);
    });
    return shifts;
  }, [groundCrew]);

  const handleAutoAssign = () => {
    setShowAssignment(true);
    const generatedTasks = generateCrewSchedule();
    const results: AssignmentResult[] = generatedTasks.map((task) => {
      const crew = groundCrew.find((c) => c.id === task.crewId);
      return {
        taskId: task.id,
        flightNo: task.flightNo,
        taskType: task.taskType,
        crewId: task.crewId,
        crewName: crew?.name || '未知',
        matchedSkill: task.taskType,
      };
    });
    setAssignmentResults(results);
    setSuccessMessage(`成功生成 ${generatedTasks.length} 个排班任务`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePushTasks = async () => {
    const crewId = selectedCrewId || (currentUser && 'id' in currentUser ? currentUser.id : null);
    if (!crewId) return;

    setPushStatus('sending');
    const success = await pushTasksToCrew(crewId);
    if (success) {
      setPushStatus('sent');
      setTimeout(() => setPushStatus('idle'), 4000);
    } else {
      setPushStatus('idle');
    }
  };

  const handleStatusChange = (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    updateTaskStatus(taskId, newStatus);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-cyan-glow">地勤排班调度</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAutoAssign}
            className="flex items-center gap-2 rounded-lg bg-primary-light px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-light/80"
          >
            <Zap className="h-4 w-4" />
            自动排班
          </button>
          <button
            type="button"
            onClick={handlePushTasks}
            disabled={pushStatus !== 'idle' || (!selectedCrewId && !(currentRole === 'ground_crew' && currentUser))}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              pushStatus === 'sent'
                ? 'bg-success/20 text-success'
                : pushStatus === 'sending'
                  ? 'bg-amber-glow/20 text-amber-glow'
                  : 'bg-dark-card text-primary-light hover:bg-dark-hover'
            } disabled:opacity-60`}
          >
            <Send className={`h-4 w-4 ${pushStatus === 'sending' ? 'animate-pulse' : ''}`} />
            {pushStatus === 'idle' ? '推送任务清单' : pushStatus === 'sending' ? '推送中...' : '推送成功'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="animate-fade-in rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card p-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-primary-light/60">空闲</span>
          <span className="font-bold text-success">{statusCounts.available}</span>
        </div>
        <div className="h-4 w-px bg-dark-border" />
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-glow" />
          <span className="text-primary-light/60">忙碌</span>
          <span className="font-bold text-amber-glow">{statusCounts.busy}</span>
        </div>
        <div className="h-4 w-px bg-dark-border" />
        <div className="flex items-center gap-2 text-sm">
          <Moon className="h-4 w-4 text-primary-light/40" />
          <span className="text-primary-light/60">休息</span>
          <span className="font-bold text-primary-light/40">{statusCounts.off_duty}</span>
        </div>
        <div className="h-4 w-px bg-dark-border" />
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary-light" />
          <span className="text-primary-light/60">总计</span>
          <span className="font-bold text-primary-light">{groundCrew.length}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'available', 'busy', 'off_duty'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-light text-white'
                : 'bg-dark-card text-primary-light/60 hover:bg-dark-hover hover:text-primary-light'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {s === 'all' ? '全部' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredCrew.map((crew, idx) => {
          const cfg = STATUS_CONFIG[crew.status];
          const initials = getInitials(crew.name);
          const initialColor = INITIAL_COLORS[idx % INITIAL_COLORS.length];
          const isSelected = selectedCrewId === crew.id;
          return (
            <div
              key={crew.id}
              onClick={() => setSelectedCrewId(isSelected ? null : crew.id)}
              className={`animate-fade-in cursor-pointer rounded-xl border bg-dark-card p-3 transition-all hover:bg-dark-hover ${
                isSelected ? 'border-cyan-glow/50 ring-1 ring-cyan-glow/20' : cfg.border
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${initialColor}`}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-primary-light">{crew.name}</span>
                    <span className={`h-2 w-2 rounded-full ${
                      crew.status === 'available' ? 'bg-success' : crew.status === 'busy' ? 'bg-amber-glow' : 'bg-primary-light/30'
                    }`} />
                  </div>
                  <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {crew.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SKILL_COLORS[skill] || 'bg-dark-border/50 text-primary-light/50'}`}
                  >
                    {skill}
                  </span>
                ))}
                {crew.skills.length > 3 && (
                  <span className="rounded bg-dark-border/50 px-1.5 py-0.5 text-[10px] text-primary-light/50">
                    +{crew.skills.length - 3}
                  </span>
                )}
              </div>

              {crew.currentTask && (
                <div className="mt-2 border-t border-dark-border pt-2">
                  <div className="flex items-center gap-1 text-xs text-amber-glow">
                    <Zap className="h-3 w-3" />
                    <span className="truncate">{crew.currentTask}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center gap-1 text-[10px] text-primary-light/40">
                <MapPin className="h-3 w-3" />
                {crew.location}
              </div>
            </div>
          );
        })}
      </div>

      {showAssignment && (
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-glow">自动排班结果</h3>
            <button
              type="button"
              onClick={() => setShowAssignment(false)}
              className="text-primary-light/40 transition-colors hover:text-primary-light"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 space-y-2">
            <div className="text-xs text-primary-light/50">待分配任务 ({pendingTasks.length}项)</div>
            <div className="flex flex-wrap gap-2">
              {pendingTasks.slice(0, 8).map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-dark-border bg-dark p-2 text-xs"
                >
                  <span className="font-medium text-cyan-glow">{task.flightNo}</span>
                  <span className="ml-1 text-primary-light/60">{task.taskType}</span>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-primary-light/40">
                    <Clock className="h-3 w-3" />
                    {task.time}
                    <MapPin className="ml-1 h-3 w-3" />
                    {task.location}
                  </div>
                </div>
              ))}
              {pendingTasks.length > 8 && (
                <div className="flex items-center text-xs text-primary-light/40">
                  +{pendingTasks.length - 8}项...
                </div>
              )}
            </div>
          </div>

          {assignmentResults.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-primary-light/50">分配结果 ({assignmentResults.length}项已分配)</div>
              {assignmentResults.map((r, idx) => (
                <div
                  key={r.taskId}
                  className="animate-fade-in flex items-center justify-between rounded-lg border border-dark-border bg-dark p-2.5"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-cyan-glow">{r.flightNo}</span>
                    <span className="text-xs text-primary-light/60">{r.taskType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-primary-light/30" />
                    <span className="text-sm font-medium text-primary-light">{r.crewName}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SKILL_COLORS[r.matchedSkill] || 'bg-success/20 text-success'}`}>
                      {r.matchedSkill}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dark-border bg-dark p-4 text-center text-sm text-warning">
              无可分配的任务，点击"自动排班"进行智能分配
            </div>
          )}
        </div>
      )}

      {selectedCrew && (
        <div className="rounded-xl border border-cyan-glow/30 bg-dark-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-cyan-glow" />
              <h3 className="text-sm font-bold text-cyan-glow">{selectedCrew.name} - 任务清单</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCrewId(null)}
              className="text-primary-light/40 transition-colors hover:text-primary-light"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="text-primary-light/50">技能:</span>
            {selectedCrew.skills.map((s) => (
              <span key={s} className={`rounded px-1.5 py-0.5 ${SKILL_COLORS[s] || 'bg-dark-border/50 text-primary-light/50'}`}>
                {s}
              </span>
            ))}
            <span className="ml-2 text-primary-light/50">班次: <span className="text-primary-light">{selectedCrew.shift}</span></span>
          </div>

          <div className="space-y-2">
            {filteredCrewTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  task.status === 'in_progress'
                    ? 'border-amber-glow/30 bg-amber-glow/5'
                    : task.status === 'pending'
                      ? 'border-primary-light/20 bg-primary-light/5'
                      : 'border-dark-border bg-dark'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                    task.status === 'in_progress'
                      ? 'bg-amber-glow/20 text-amber-glow'
                      : task.status === 'pending'
                        ? 'bg-primary-light/20 text-primary-light'
                        : 'bg-success/20 text-success'
                  }`}>
                    {task.status === 'in_progress' ? '执' : task.status === 'pending' ? '待' : '完'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-primary-light">
                      {task.flightNo} - {task.taskType}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-primary-light/50">
                      <Clock className="h-3 w-3" />
                      {task.scheduledTime.slice(11, 16)}
                      <MapPin className="h-3 w-3" />
                      {task.location}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(task.id, 'pending')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      task.status === 'pending'
                        ? 'bg-primary-light/10 text-primary-light'
                        : 'bg-dark-border/50 text-primary-light/40 hover:bg-primary-light/10 hover:text-primary-light'
                    }`}
                  >
                    待执行
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      task.status === 'in_progress'
                        ? 'bg-amber-glow/10 text-amber-glow'
                        : 'bg-dark-border/50 text-primary-light/40 hover:bg-amber-glow/10 hover:text-amber-glow'
                    }`}
                  >
                    进行中
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(task.id, 'completed')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      task.status === 'completed'
                        ? 'bg-success/10 text-success'
                        : 'bg-dark-border/50 text-primary-light/40 hover:bg-success/10 hover:text-success'
                    }`}
                  >
                    已完成
                  </button>
                </div>
              </div>
            ))}
            {filteredCrewTasks.length === 0 && (
              <div className="py-4 text-center text-xs text-primary-light/40">暂无任务</div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dark-border bg-dark-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-cyan-glow">班次安排</h3>
          <div className="flex gap-2">
            {terminals.map((t) => (
              <span key={t.id} className="rounded bg-dark-border/50 px-2 py-0.5 text-[10px] text-primary-light/50">
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { key: 'morning', label: '早班 06:00-14:00', icon: Sun, color: 'text-amber-glow', crew: shiftData.morning },
            { key: 'afternoon', label: '中班 14:00-22:00', icon: CloudSun, color: 'text-primary-light', crew: shiftData.afternoon },
            { key: 'night', label: '夜班 22:00-06:00', icon: Moon, color: 'text-indigo-400', crew: shiftData.night },
          ].map((shift) => {
            const ShiftIcon = shift.icon;
            return (
              <div key={shift.key} className="rounded-lg border border-dark-border bg-dark p-3">
                <div className="mb-2 flex items-center gap-2">
                  <ShiftIcon className={`h-4 w-4 ${shift.color}`} />
                  <span className={`text-sm font-medium ${shift.color}`}>{shift.label}</span>
                  <span className="ml-auto rounded bg-dark-border/50 px-1.5 py-0.5 text-[10px] text-primary-light/50">
                    {shift.crew.length}人
                  </span>
                </div>
                <div className="space-y-1.5">
                  {shift.crew.map((c) => {
                    const cfg = STATUS_CONFIG[c.status];
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-md bg-dark-card px-2.5 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            c.status === 'available' ? 'bg-success' : c.status === 'busy' ? 'bg-amber-glow' : 'bg-primary-light/30'
                          }`} />
                          <span className="text-xs text-primary-light">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.skills.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className={`rounded px-1 py-0.5 text-[9px] ${SKILL_COLORS[s] || 'bg-dark-border/50 text-primary-light/50'}`}
                            >
                              {s}
                            </span>
                          ))}
                          <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {shift.crew.length === 0 && (
                    <div className="py-2 text-center text-xs text-primary-light/30">暂无人员</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
