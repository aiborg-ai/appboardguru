#!/usr/bin/env ts-node

// Agent CLI Runner Script

import { AgentCLI } from '../src/lib/agents/cli';

const cli = new AgentCLI();
cli.start().catch(console.error);