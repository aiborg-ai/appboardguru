#!/usr/bin/env node

// Agent System CLI Interface

import { AgentCoordinator } from './coordinator';
import { AgentId } from './types';
import readline from 'readline';
import chalk from 'chalk';

class AgentCLI {
  private coordinator: AgentCoordinator;
  private rl: readline.Interface;

  constructor() {
    this.coordinator = AgentCoordinator.getInstance();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('agent> ')
    });
  }

  async start() {
    console.log(chalk.green('\n🤖 AppBoardGuru Agent System CLI'));
    console.log(chalk.gray('Type "help" for available commands\n'));

    await this.coordinator.initialize();
    
    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const input = line.trim();
      
      if (!input) {
        this.rl.prompt();
        return;
      }

      try {
        await this.handleCommand(input);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye!'));
      process.exit(0);
    });
  }

  private async handleCommand(input: string) {
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case 'help':
        this.showHelp();
        break;

      case 'exit':
      case 'quit':
        this.rl.close();
        break;

      case 'status':
        await this.showStatus(parts.slice(1));
        break;

      case 'agents':
        this.showAgents();
        break;

      case 'task':
        await this.submitTask(parts.slice(1).join(' '));
        break;

      case 'workflow':
        await this.createWorkflow(parts.slice(1));
        break;

      case 'metrics':
        this.showMetrics(parts[1] as AgentId);
        break;

      case 'queue':
        this.showQueue(parts[1] as AgentId);
        break;

      case 'history':
        this.showHistory(parseInt(parts[1]) || 10);
        break;

      case 'clear':
        console.clear();
        break;

      case '@agent':
        await this.executeAgentCommand(input);
        break;

      default:
        if (input.startsWith('@agent')) {
          await this.executeAgentCommand(input);
        } else {
          console.log(chalk.red(`Unknown command: ${command}`));
          console.log(chalk.gray('Type "help" for available commands'));
        }
    }
  }

  private showHelp() {
    console.log(chalk.yellow('\n📚 Available Commands:\n'));
    
    const commands = [
      ['help', 'Show this help message'],
      ['status [agentId]', 'Show agent status (all agents if no ID specified)'],
      ['agents', 'List all available agents'],
      ['task <description>', 'Submit a new task'],
      ['@agent <agentId> "<task>"', 'Submit task to specific agent'],
      ['workflow <type> <parameter>', 'Create a workflow (types: feature, bugfix, performance)'],
      ['metrics [agentId]', 'Show agent metrics'],
      ['queue [agentId]', 'Show task queue'],
      ['history [limit]', 'Show message history'],
      ['clear', 'Clear the console'],
      ['exit/quit', 'Exit the CLI']
    ];

    commands.forEach(([cmd, desc]) => {
      console.log(chalk.cyan(`  ${cmd.padEnd(30)}`), chalk.gray(desc));
    });

    console.log(chalk.yellow('\n📝 Examples:\n'));
    console.log(chalk.gray('  @agent DBA-01 "Optimize database indexes"'));
    console.log(chalk.gray('  task Create new user authentication endpoint'));
    console.log(chalk.gray('  workflow feature BoardVoting'));
    console.log(chalk.gray('  status DBA-01'));
    console.log();
  }

  private async showStatus(args: string[]) {
    if (args.length === 0 || args[0] === '--all') {
      const statuses = this.coordinator.getAllAgentStatuses();
      
      console.log(chalk.yellow('\n📊 Agent Status:\n'));
      
      const statusColors = {
        'active': chalk.green,
        'busy': chalk.yellow,
        'blocked': chalk.red,
        'idle': chalk.gray,
        'error': chalk.red
      };

      statuses.forEach((status, agentId) => {
        const color = statusColors[status] || chalk.white;
        const icon = {
          'active': '✅',
          'busy': '⚡',
          'blocked': '🚫',
          'idle': '💤',
          'error': '❌'
        }[status] || '❓';

        console.log(`  ${icon} ${chalk.cyan(agentId.padEnd(10))} ${color(status)}`);
      });
    } else {
      const agentId = args[0] as AgentId;
      const status = this.coordinator.getAgentStatus(agentId);
      
      if (status) {
        console.log(chalk.cyan(`\nAgent ${agentId}:`), chalk.green(status));
      } else {
        console.log(chalk.red(`Agent ${agentId} not found`));
      }
    }
  }

  private showAgents() {
    const registry = require('./registry').AgentRegistry.getInstance();
    const configs = registry.getAllConfigs();
    
    console.log(chalk.yellow('\n🤖 Available Agents:\n'));
    
    const categories = {
      'infrastructure': '🏗️  Infrastructure',
      'business-logic': '💼 Business Logic',
      'frontend': '🎨 Frontend',
      'quality-security': '🛡️  Quality & Security',
      'specialized': '🚀 Specialized'
    };

    Object.entries(categories).forEach(([category, label]) => {
      console.log(chalk.cyan(`\n${label}:`));
      
      configs
        .filter(config => config.category === category)
        .forEach(config => {
          console.log(`  ${chalk.green(config.id.padEnd(10))} - ${chalk.gray(config.name)}`);
        });
    });
  }

  private async submitTask(description: string) {
    if (!description) {
      console.log(chalk.red('Task description is required'));
      return;
    }

    const taskId = await this.coordinator.submitTask({ description });
    console.log(chalk.green(`✅ Task submitted: ${taskId}`));
  }

  private async executeAgentCommand(input: string) {
    const result = await this.coordinator.executeCommand(input);
    
    if (typeof result === 'string') {
      console.log(chalk.green(`✅ Task submitted: ${result}`));
    } else {
      console.log(chalk.green('✅ Command executed successfully'));
      console.log(result);
    }
  }

  private async createWorkflow(args: string[]) {
    const type = args[0];
    const parameter = args.slice(1).join(' ');

    if (!type || !parameter) {
      console.log(chalk.red('Workflow type and parameter are required'));
      console.log(chalk.gray('Example: workflow feature BoardVoting'));
      return;
    }

    const WorkflowTemplates = require('./coordinator').WorkflowTemplates;
    
    let workflowRequest;
    switch (type) {
      case 'feature':
        workflowRequest = WorkflowTemplates.featureDevelopment(parameter);
        break;
      case 'bugfix':
        workflowRequest = WorkflowTemplates.bugFix(parameter);
        break;
      case 'performance':
        workflowRequest = WorkflowTemplates.performanceOptimization(parameter);
        break;
      default:
        console.log(chalk.red(`Unknown workflow type: ${type}`));
        console.log(chalk.gray('Valid types: feature, bugfix, performance'));
        return;
    }

    const workflowId = await this.coordinator.createWorkflow(workflowRequest);
    console.log(chalk.green(`✅ Workflow created: ${workflowId}`));
  }

  private showMetrics(agentId?: AgentId) {
    if (agentId) {
      const metrics = this.coordinator.getAgentMetrics(agentId);
      
      if (metrics) {
        console.log(chalk.yellow(`\n📈 Metrics for ${agentId}:\n`));
        console.log(`  Response Time:      ${metrics.responseTime}ms`);
        console.log(`  Resolution Time:    ${metrics.resolutionTime}ms`);
        console.log(`  Quality Score:      ${metrics.qualityScore}%`);
        console.log(`  Handoff Efficiency: ${metrics.handoffEfficiency}%`);
        console.log(`  Domain Expertise:   ${metrics.domainExpertise}%`);
        console.log(`  Tasks Completed:    ${metrics.tasksCompleted}`);
        console.log(`  Tasks Failed:       ${metrics.tasksFailed}`);
        console.log(`  Average Task Time:  ${metrics.averageTaskTime}ms`);
      } else {
        console.log(chalk.red(`Agent ${agentId} not found`));
      }
    } else {
      const allMetrics = this.coordinator.getAllAgentMetrics();
      
      console.log(chalk.yellow('\n📈 All Agent Metrics:\n'));
      
      allMetrics.forEach((metrics, agentId) => {
        const successRate = metrics.tasksCompleted > 0
          ? Math.round((metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed)) * 100)
          : 100;
        
        console.log(chalk.cyan(`${agentId}:`), 
          `Success: ${successRate}%,`,
          `Completed: ${metrics.tasksCompleted},`,
          `Failed: ${metrics.tasksFailed}`
        );
      });
    }
  }

  private showQueue(agentId?: AgentId) {
    const tasks = this.coordinator.getTaskQueue(agentId);
    
    if (tasks.length === 0) {
      console.log(chalk.gray('\nNo tasks in queue'));
      return;
    }

    console.log(chalk.yellow(`\n📋 Task Queue${agentId ? ` for ${agentId}` : ''}:\n`));
    
    tasks.forEach((task, index) => {
      const priorityColor = {
        'high': chalk.red,
        'medium': chalk.yellow,
        'low': chalk.green
      }[task.priority] || chalk.white;

      const statusIcon = {
        'pending': '⏳',
        'in-progress': '🔄',
        'completed': '✅',
        'failed': '❌',
        'blocked': '🚫'
      }[task.status] || '❓';

      console.log(`  ${index + 1}. ${statusIcon} [${priorityColor(task.priority)}] ${task.description}`);
      console.log(chalk.gray(`     Agent: ${task.agentId}, Status: ${task.status}`));
    });
  }

  private showHistory(limit: number) {
    const registry = require('./registry').AgentRegistry.getInstance();
    const messages = registry.getMessageHistory(limit);
    
    if (messages.length === 0) {
      console.log(chalk.gray('\nNo message history'));
      return;
    }

    console.log(chalk.yellow(`\n📜 Message History (last ${limit}):\n`));
    
    messages.forEach(message => {
      const time = new Date(message.timestamp).toLocaleTimeString();
      const typeIcon = {
        'task': '📝',
        'handoff': '🤝',
        'status': '📊',
        'error': '❌',
        'result': '✅'
      }[message.type] || '💬';

      console.log(`  ${chalk.gray(time)} ${typeIcon} ${chalk.cyan(message.from)} → ${chalk.green(message.to)}`);
      
      if (message.type === 'task' || message.type === 'handoff') {
        console.log(chalk.gray(`     ${JSON.stringify(message.content).substring(0, 80)}...`));
      }
    });
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new AgentCLI();
  cli.start().catch(console.error);
}

export { AgentCLI };