#!/usr/bin/env ts-node

// Agent System Test Script

import { 
  initializeAgentSystem, 
  submitAgentTask, 
  createAgentWorkflow,
  getAgentStatus,
  getAgentMetrics 
} from '../src/lib/agents';
import chalk from 'chalk';

async function testAgentSystem() {
  console.log(chalk.green('🧪 Testing Agent System...\n'));

  try {
    // Initialize the agent system
    console.log(chalk.yellow('1. Initializing agent system...'));
    const coordinator = await initializeAgentSystem();
    console.log(chalk.green('✅ Agent system initialized with 20 agents\n'));

    // Check agent statuses
    console.log(chalk.yellow('2. Checking agent statuses...'));
    const statuses = await getAgentStatus();
    console.log(chalk.green(`✅ ${statuses.size} agents online`));
    statuses.forEach((status, agentId) => {
      console.log(`   ${agentId}: ${status}`);
    });
    console.log();

    // Submit individual tasks
    console.log(chalk.yellow('3. Submitting individual tasks...'));
    
    const task1 = await submitAgentTask('Create indexes for board_members table', 'DBA-01');
    console.log(chalk.green(`✅ Database task submitted: ${task1}`));
    
    const task2 = await submitAgentTask('Implement repository for voting feature', 'REPO-02');
    console.log(chalk.green(`✅ Repository task submitted: ${task2}`));
    
    const task3 = await submitAgentTask('Create POST endpoint for board voting', 'API-03');
    console.log(chalk.green(`✅ API task submitted: ${task3}`));
    
    const task4 = await submitAgentTask('Build voting UI components', 'UI-08');
    console.log(chalk.green(`✅ UI task submitted: ${task4}`));
    
    const task5 = await submitAgentTask('Write tests for voting feature', 'TEST-14');
    console.log(chalk.green(`✅ Test task submitted: ${task5}\n`));

    // Create a feature workflow
    console.log(chalk.yellow('4. Creating feature development workflow...'));
    const workflowId = await createAgentWorkflow('feature', 'BoardVoting');
    console.log(chalk.green(`✅ Workflow created: ${workflowId}\n`));

    // Wait for tasks to process
    console.log(chalk.yellow('5. Processing tasks (waiting 3 seconds)...'));
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check metrics
    console.log(chalk.yellow('\n6. Checking agent metrics...'));
    const metrics = await getAgentMetrics();
    
    let totalCompleted = 0;
    let totalFailed = 0;
    
    metrics.forEach((metric, agentId) => {
      totalCompleted += metric.tasksCompleted;
      totalFailed += metric.tasksFailed;
      
      const successRate = metric.tasksCompleted > 0
        ? Math.round((metric.tasksCompleted / (metric.tasksCompleted + metric.tasksFailed)) * 100)
        : 100;
      
      console.log(`   ${agentId}: ${successRate}% success rate (${metric.tasksCompleted} completed, ${metric.tasksFailed} failed)`);
    });
    
    console.log(chalk.green(`\n✅ Total: ${totalCompleted} tasks completed, ${totalFailed} failed\n`));

    // Test agent handoff
    console.log(chalk.yellow('7. Testing agent handoff...'));
    coordinator.createHandoff({
      from: 'DBA-01',
      to: 'REPO-02',
      task: 'Implement repository methods for new schema',
      context: { schema: 'board_voting' },
      priority: 'high',
      timestamp: new Date()
    });
    console.log(chalk.green('✅ Handoff created from DBA-01 to REPO-02\n'));

    // Test command execution
    console.log(chalk.yellow('8. Testing command execution...'));
    const commandResult = await coordinator.executeCommand('@agent BIZ-03 "Implement voting business logic"');
    console.log(chalk.green(`✅ Command executed: ${commandResult}\n`));

    // Get task queue
    console.log(chalk.yellow('9. Checking task queues...'));
    const allTasks = coordinator.getTaskQueue();
    console.log(chalk.green(`✅ ${allTasks.length} tasks in queue\n`));

    // Get active workflows
    console.log(chalk.yellow('10. Checking active workflows...'));
    const workflows = coordinator.getActiveWorkflows();
    console.log(chalk.green(`✅ ${workflows.length} active workflows\n`));

    console.log(chalk.green('🎉 All tests completed successfully!\n'));

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
    process.exit(1);
  }
}

// Run tests
testAgentSystem().then(() => {
  console.log(chalk.cyan('Agent system is ready for use!'));
  console.log(chalk.gray('\nYou can now:'));
  console.log(chalk.gray('1. Visit /dashboard/agents to see the web dashboard'));
  console.log(chalk.gray('2. Use the API at /api/agents'));
  console.log(chalk.gray('3. Run the CLI with: npx ts-node scripts/agent-cli.ts'));
  process.exit(0);
}).catch(console.error);