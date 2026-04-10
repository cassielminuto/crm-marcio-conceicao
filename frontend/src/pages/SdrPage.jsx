import { useState } from 'react';
import { Instagram, Megaphone } from 'lucide-react';
import SdrTabsPills from '../components/SdrTabsPills';
import SdrKanban from './SdrKanban';
import SdrInboundKanban from './SdrInboundKanban';

const TABS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'inbound', label: 'Inbound', icon: Megaphone },
];

export default function SdrPage() {
  const [activeTab, setActiveTab] = useState('instagram');

  return (
    <div className="flex flex-col h-full min-h-0 animate-page-enter">
      {/* Tab bar */}
      <div className="shrink-0 bg-bg-secondary border-b border-border-subtle px-6 py-3 flex items-center">
        <SdrTabsPills tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Active tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'instagram' && <SdrKanban />}
        {activeTab === 'inbound' && <SdrInboundKanban />}
      </div>
    </div>
  );
}
