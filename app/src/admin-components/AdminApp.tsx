import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Overview } from './Overview';
import { UsersPage } from './UsersPage';
import { ServersPage } from './ServersPage';
import { GroupsPage } from './GroupsPage';
import { MessagesPage } from './MessagesPage';
import { AccessPage } from './AccessPage';

export function AdminApp() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <Overview />}
      {activeTab === 'users' && <UsersPage />}
      {activeTab === 'servers' && <ServersPage />}
      {activeTab === 'groups' && <GroupsPage />}
      {activeTab === 'messages' && <MessagesPage />}
      {activeTab === 'access' && <AccessPage />}
    </AdminLayout>
  );
}
