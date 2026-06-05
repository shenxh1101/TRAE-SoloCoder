import { useState } from 'react';
import { useAirport } from '../../context/AirportContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import type { PageId, UserRole } from './Sidebar';
import type { Alert as TopBarAlert } from './TopBar';
import Dashboard from '../dashboard/Dashboard';
import GateManagement from '../gates/GateManagement';
import CheckinAllocation from '../checkin/CheckinAllocation';
import SecurityChannels from '../security/SecurityChannels';
import BaggageTracking from '../baggage/BaggageTracking';
import DelayHandler from '../delays/DelayHandler';
import GroundCrewScheduling from '../ground/GroundCrewScheduling';
import ReportsExport from '../reports/ReportsExport';

const PAGE_COMPONENTS: Record<PageId, React.FC> = {
  overview: Dashboard,
  flights: GateManagement,
  checkin: CheckinAllocation,
  security: SecurityChannels,
  baggage: BaggageTracking,
  delay: DelayHandler,
  ground: GroundCrewScheduling,
  reports: ReportsExport,
};

const ROLE_ACCESS: Record<UserRole, PageId[]> = {
  '旅客': ['overview', 'baggage'],
  '地勤人员': ['overview', 'flights', 'baggage', 'ground'],
  '航司代表': ['overview', 'flights', 'checkin', 'baggage', 'delay'],
  '机场管理员': ['overview', 'flights', 'checkin', 'security', 'baggage', 'delay', 'ground', 'reports'],
};

const ROLE_LABEL_TO_KEY: Record<UserRole, string> = {
  '旅客': '旅客',
  '地勤人员': '地勤人员',
  '航司代表': '航司代表',
  '机场管理员': '机场管理员',
};

function LayoutContent() {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [userRole, setUserRole] = useState<UserRole>('机场管理员');
  const { alerts, setCurrentRole } = useAirport();

  const topBarAlerts: TopBarAlert[] = alerts?.map((a) => ({
    type: a.type,
    message: a.message,
    severity: (a.severity === 'critical' || a.severity === 'high'
      ? 'danger'
      : a.severity === 'medium'
        ? 'warning'
        : a.severity === 'low'
          ? 'info'
          : 'success') as TopBarAlert['severity'],
  })) || [];

  const accessiblePages = ROLE_ACCESS[userRole];

  const handlePageChange = (page: PageId) => {
    if (accessiblePages.includes(page)) {
      setActivePage(page);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    setCurrentRole(ROLE_LABEL_TO_KEY[role]);
    if (!ROLE_ACCESS[role].includes(activePage)) {
      setActivePage(ROLE_ACCESS[role][0]);
    }
  };

  const PageComponent = PAGE_COMPONENTS[activePage];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark">
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        userRole={userRole}
        onRoleChange={handleRoleChange}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar alerts={topBarAlerts} onAlertClick={() => {}} />

        <main className="flex-1 overflow-y-auto p-5">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return <LayoutContent />;
}
