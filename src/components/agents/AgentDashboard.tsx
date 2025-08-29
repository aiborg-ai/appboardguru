'use client';

import React, { useEffect, useState } from 'react';
import { AgentId, AgentStatus, AgentTask, AgentMetrics } from '@/lib/agents/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Loader2,
  Send,
  Users,
  Zap,
  Database,
  Code,
  Layout,
  Shield,
  Cpu
} from 'lucide-react';

// Agent icons mapping
const AGENT_ICONS: Record<string, React.ReactNode> = {
  'infrastructure': <Database className="w-4 h-4" />,
  'business-logic': <Code className="w-4 h-4" />,
  'frontend': <Layout className="w-4 h-4" />,
  'quality-security': <Shield className="w-4 h-4" />,
  'specialized': <Cpu className="w-4 h-4" />
};

// Status colors
const STATUS_COLORS: Record<AgentStatus, string> = {
  'active': 'bg-green-500',
  'busy': 'bg-yellow-500',
  'blocked': 'bg-red-500',
  'idle': 'bg-gray-400',
  'error': 'bg-red-600'
};

interface AgentCardProps {
  agentId: AgentId;
  status: AgentStatus;
  metrics: AgentMetrics;
  taskQueue: number;
  category: string;
  name: string;
}

const AgentCard: React.FC<AgentCardProps> = ({ 
  agentId, 
  status, 
  metrics, 
  taskQueue,
  category,
  name
}) => {
  const statusIcon = {
    'active': <CheckCircle className="w-4 h-4 text-green-500" />,
    'busy': <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />,
    'blocked': <AlertCircle className="w-4 h-4 text-red-500" />,
    'idle': <Clock className="w-4 h-4 text-gray-400" />,
    'error': <AlertCircle className="w-4 h-4 text-red-600" />
  }[status];

  const successRate = metrics.tasksCompleted > 0 
    ? Math.round((metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed)) * 100)
    : 100;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {AGENT_ICONS[category]}
            <CardTitle className="text-sm font-medium">{agentId}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon}
            <Badge variant="secondary" className="text-xs">
              {taskQueue} tasks
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{name}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Success Rate</span>
            <span className="font-medium">{successRate}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Completed:</span>
            <span className="ml-1 font-medium">{metrics.tasksCompleted}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Failed:</span>
            <span className="ml-1 font-medium">{metrics.tasksFailed}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Time:</span>
            <span className="ml-1 font-medium">{Math.round(metrics.averageTaskTime / 1000)}s</span>
          </div>
          <div>
            <span className="text-muted-foreground">Quality:</span>
            <span className="ml-1 font-medium">{metrics.qualityScore}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface TaskListProps {
  tasks: AgentTask[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  return (
    <div className="space-y-2">
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No tasks in queue</p>
      ) : (
        tasks.map(task => (
          <div key={task.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium">{task.description}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-muted-foreground">
                  Agent: {task.agentId}
                </span>
                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                  {task.priority}
                </Badge>
                <Badge variant={
                  task.status === 'completed' ? 'default' :
                  task.status === 'in-progress' ? 'secondary' :
                  task.status === 'failed' ? 'destructive' : 'outline'
                } className="text-xs">
                  {task.status}
                </Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(task.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default function AgentDashboard() {
  const [agents, setAgents] = useState<Map<AgentId, any>>(new Map());
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Initialize mock agents
    const mockAgents = new Map<AgentId, any>();
    
    // Infrastructure agents
    mockAgents.set('DBA-01', {
      status: 'active' as AgentStatus,
      name: 'Database Architect',
      category: 'infrastructure',
      metrics: {
        responseTime: 120,
        resolutionTime: 5000,
        qualityScore: 95,
        handoffEfficiency: 90,
        domainExpertise: 98,
        tasksCompleted: 42,
        tasksFailed: 2,
        averageTaskTime: 4500
      },
      taskQueue: 3
    });

    mockAgents.set('REPO-02', {
      status: 'busy' as AgentStatus,
      name: 'Repository Guardian',
      category: 'infrastructure',
      metrics: {
        responseTime: 100,
        resolutionTime: 3000,
        qualityScore: 92,
        handoffEfficiency: 88,
        domainExpertise: 95,
        tasksCompleted: 58,
        tasksFailed: 4,
        averageTaskTime: 3200
      },
      taskQueue: 5
    });

    mockAgents.set('API-03', {
      status: 'active' as AgentStatus,
      name: 'API Conductor',
      category: 'infrastructure',
      metrics: {
        responseTime: 80,
        resolutionTime: 2000,
        qualityScore: 94,
        handoffEfficiency: 91,
        domainExpertise: 96,
        tasksCompleted: 75,
        tasksFailed: 3,
        averageTaskTime: 2100
      },
      taskQueue: 2
    });

    // Business Logic agents
    mockAgents.set('BIZ-03', {
      status: 'active' as AgentStatus,
      name: 'Business Logic Master',
      category: 'business-logic',
      metrics: {
        responseTime: 150,
        resolutionTime: 4000,
        qualityScore: 93,
        handoffEfficiency: 89,
        domainExpertise: 97,
        tasksCompleted: 63,
        tasksFailed: 5,
        averageTaskTime: 4200
      },
      taskQueue: 4
    });

    // Frontend agents
    mockAgents.set('UI-08', {
      status: 'idle' as AgentStatus,
      name: 'UI Component Architect',
      category: 'frontend',
      metrics: {
        responseTime: 90,
        resolutionTime: 2500,
        qualityScore: 96,
        handoffEfficiency: 92,
        domainExpertise: 94,
        tasksCompleted: 82,
        tasksFailed: 2,
        averageTaskTime: 2600
      },
      taskQueue: 0
    });

    // Quality & Security agents
    mockAgents.set('TEST-14', {
      status: 'busy' as AgentStatus,
      name: 'Test Commander',
      category: 'quality-security',
      metrics: {
        responseTime: 200,
        resolutionTime: 8000,
        qualityScore: 98,
        handoffEfficiency: 85,
        domainExpertise: 99,
        tasksCompleted: 45,
        tasksFailed: 1,
        averageTaskTime: 8500
      },
      taskQueue: 6
    });

    setAgents(mockAgents);

    // Mock tasks
    const mockTasks: AgentTask[] = [
      {
        id: 'task-1',
        agentId: 'DBA-01',
        description: 'Optimize board_members table indexes',
        priority: 'high',
        status: 'in-progress',
        createdAt: new Date(),
        startedAt: new Date()
      },
      {
        id: 'task-2',
        agentId: 'REPO-02',
        description: 'Implement repository for new voting feature',
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      },
      {
        id: 'task-3',
        agentId: 'TEST-14',
        description: 'Write E2E tests for board creation workflow',
        priority: 'high',
        status: 'in-progress',
        createdAt: new Date()
      }
    ];

    setTasks(mockTasks);
  }, []);

  const handleCommandSubmit = async () => {
    if (!command.trim()) return;
    
    setIsLoading(true);
    try {
      // Simulate command execution
      console.log('Executing command:', command);
      
      // Add a mock task
      const newTask: AgentTask = {
        id: `task-${Date.now()}`,
        agentId: 'BIZ-03',
        description: command,
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      };
      
      setTasks(prev => [...prev, newTask]);
      setCommand('');
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAgents = Array.from(agents.entries()).filter(([_, agent]) => 
    selectedCategory === 'all' || agent.category === selectedCategory
  );

  const totalAgents = agents.size;
  const activeAgents = Array.from(agents.values()).filter(a => a.status === 'active').length;
  const busyAgents = Array.from(agents.values()).filter(a => a.status === 'busy').length;
  const totalTasks = Array.from(agents.values()).reduce((sum, a) => sum + a.taskQueue, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent System Dashboard</h1>
          <p className="text-muted-foreground">Monitor and control your 20 specialized AI agents</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Users className="w-4 h-4 mr-1" />
            {totalAgents} Agents
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Activity className="w-4 h-4 mr-1" />
            {activeAgents} Active
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Zap className="w-4 h-4 mr-1" />
            {totalTasks} Tasks
          </Badge>
        </div>
      </div>

      {/* Command Input */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Command</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder='@agent DBA-01 "Optimize database performance"'
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCommandSubmit()}
              disabled={isLoading}
            />
            <Button onClick={handleCommandSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            <Button
              variant={selectedCategory === 'infrastructure' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('infrastructure')}
            >
              Infrastructure
            </Button>
            <Button
              variant={selectedCategory === 'business-logic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('business-logic')}
            >
              Business Logic
            </Button>
            <Button
              variant={selectedCategory === 'frontend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('frontend')}
            >
              Frontend
            </Button>
            <Button
              variant={selectedCategory === 'quality-security' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('quality-security')}
            >
              Quality & Security
            </Button>
            <Button
              variant={selectedCategory === 'specialized' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('specialized')}
            >
              Specialized
            </Button>
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map(([agentId, agent]) => (
              <AgentCard
                key={agentId}
                agentId={agentId}
                status={agent.status}
                metrics={agent.metrics}
                taskQueue={agent.taskQueue}
                category={agent.category}
                name={agent.name}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList tasks={tasks} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Active Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No active workflows</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Success Rate</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Response Time</span>
                    <span>125ms</span>
                  </div>
                  <Progress value={75} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Handoff Efficiency</span>
                    <span>89%</span>
                  </div>
                  <Progress value={89} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Tasks Completed</span>
                  <span className="font-medium">427</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Tasks Failed</span>
                  <span className="font-medium">22</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Average Task Time</span>
                  <span className="font-medium">4.2s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tasks in Queue</span>
                  <span className="font-medium">{totalTasks}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}