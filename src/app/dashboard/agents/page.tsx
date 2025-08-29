// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

// Agent Dashboard Page

import AgentDashboard from '@/components/agents/AgentDashboard';

export const metadata = {
  title: 'Agent System Dashboard | AppBoardGuru',
  description: 'Monitor and control the 20 specialized AI agents'
};

export default function AgentsPage() {
  return <AgentDashboard />;
}