#!/usr/bin/env node

/**
 * BoardGuru MCP Demo Server
 * Interactive demonstration of governance intelligence capabilities
 * 
 * Usage: npm run demo
 * Then open: http://localhost:3001/demo
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.DEMO_PORT || 3001;
const MCP_PORT = process.env.MCP_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Demo data
// eslint-disable-next-line no-unused-vars
const DEMO_DATA = {
  boardMembers: [
    {
      id: 'member_001',
      name: 'Sarah Chen',
      role: 'Chair',
      tenure_months: 42,
      age: 58,
      gender: 'F',
      ethnicity: 'Asian',
      skills: ['Finance', 'Strategy', 'Risk Management', 'M&A'],
      experience: {
        total_years: 28,
        board_years: 12,
        industries: ['Financial Services', 'Technology'],
        public_company: true,
        ceo_experience: true
      },
      independence: 'Independent',
      committees: ['Audit', 'Risk']
    },
    {
      id: 'member_002',
      name: 'James Morrison',
      role: 'CEO',
      tenure_months: 18,
      age: 52,
      gender: 'M',
      ethnicity: 'White',
      skills: ['Technology', 'Product', 'Scaling', 'Digital Transformation'],
      experience: {
        total_years: 24,
        board_years: 5,
        industries: ['Technology', 'SaaS'],
        public_company: true,
        ceo_experience: true
      },
      independence: 'Executive',
      committees: []
    },
    {
      id: 'member_003',
      name: 'Dr. Amara Okafor',
      role: 'Independent Director',
      tenure_months: 36,
      age: 45,
      gender: 'F',
      ethnicity: 'Black',
      skills: ['Healthcare', 'Regulatory', 'Digital Health', 'ESG'],
      experience: {
        total_years: 18,
        board_years: 8,
        industries: ['Healthcare', 'Pharmaceuticals'],
        public_company: true,
        ceo_experience: false
      },
      independence: 'Independent',
      committees: ['ESG', 'Compensation']
    },
    {
      id: 'member_004',
      name: 'Robert Zhang',
      role: 'Independent Director',
      tenure_months: 60,
      age: 62,
      gender: 'M',
      ethnicity: 'Asian',
      skills: ['Finance', 'Audit', 'Corporate Development'],
      experience: {
        total_years: 32,
        board_years: 15,
        industries: ['Financial Services', 'Insurance'],
        public_company: true,
        ceo_experience: false
      },
      independence: 'Independent',
      committees: ['Audit', 'Finance']
    },
    {
      id: 'member_005',
      name: 'Maria Rodriguez',
      role: 'Independent Director',
      tenure_months: 24,
      age: 49,
      gender: 'F',
      ethnicity: 'Hispanic',
      skills: ['Legal', 'Compliance', 'Governance', 'Risk'],
      experience: {
        total_years: 22,
        board_years: 6,
        industries: ['Legal Services', 'Financial Services'],
        public_company: true,
        ceo_experience: false
      },
      independence: 'Independent',
      committees: ['Risk', 'Governance']
    }
  ],
  meetingData: {
    id: 'meeting_q4_2024',
    title: 'Q4 2024 Board Meeting',
    date: '2024-04-15T09:00:00Z',
    duration_minutes: 165,
    participants: 8,
    agenda_items: [
      {
        title: 'CEO Report & Strategic Update',
        duration_minutes: 35,
        type: 'Report'
      },
      {
        title: 'Financial Performance Review',
        duration_minutes: 25,
        type: 'Report'
      },
      {
        title: 'Cybersecurity Risk Assessment',
        duration_minutes: 30,
        type: 'Discussion'
      },
      {
        title: 'ESG Initiative Approval',
        duration_minutes: 40,
        type: 'Decision'
      },
      {
        title: 'Executive Compensation Review',
        duration_minutes: 35,
        type: 'Decision'
      }
    ]
  },
  complianceData: {
    frameworks: ['GDPR', 'SOX', 'FCA_SYSC', 'UK_CORP_GOV'],
    overall_score: 87,
    critical_issues: 3,
    upcoming_deadlines: 8
  }
};

// Demo routes
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

app.get('/api/demo/board-analysis', async (req, res) => {
  // Simulate API call to MCP server
  setTimeout(() => {
    res.json({
      analysis_id: 'demo_analysis_' + Date.now(),
      timestamp: new Date().toISOString(),
      organization_id: 'demo_org_001',
      status: 'completed',
      results: {
        overall_score: 82,
        grade: 'B+',
        composition: {
          total_members: 5,
          independent_members: 4,
          diversity: {
            gender: {
              female_percentage: 60.0,
              target: 40.0,
              benchmark: 35.2
            },
            ethnic: {
              diverse_percentage: 60.0,
              target: 30.0,
              benchmark: 28.1
            },
            age: {
              average_age: 53.2,
              range: [45, 62],
              optimal_range: [45, 65]
            }
          }
        },
        skills_matrix: {
          coverage_score: 78,
          critical_gaps: [
            {
              skill: 'Cybersecurity',
              importance: 90,
              current_coverage: 25,
              recommended_level: 85
            },
            {
              skill: 'International Markets',
              importance: 75,
              current_coverage: 40,
              recommended_level: 70
            }
          ],
          strengths: [
            {
              skill: 'Financial Expertise',
              coverage: 95,
              depth: 'Excellent'
            },
            {
              skill: 'Governance',
              coverage: 90,
              depth: 'Strong'
            }
          ]
        },
        recommendations: [
          {
            priority: 'High',
            category: 'Skills Gap',
            title: 'Add Cybersecurity Expert',
            description: 'Board lacks sufficient cybersecurity expertise for digital risk oversight',
            impact: {
              risk_reduction: 35,
              governance_improvement: 15
            },
            confidence: 92
          },
          {
            priority: 'Medium',
            category: 'Experience',
            title: 'Consider International Experience',
            description: 'Limited international market experience as company expands globally',
            impact: {
              strategic_guidance: 25,
              market_insights: 30
            },
            confidence: 78
          }
        ],
        benchmarking: {
          industry: 'Technology',
          peer_group: 'Mid-Cap SaaS',
          ranking: '75th percentile',
          strengths: ['Diversity', 'Independence', 'Governance experience'],
          improvement_areas: ['Technical expertise', 'International experience']
        }
      },
      metadata: {
        analysis_time_ms: 1834,
        confidence: 88,
        data_quality: 92,
        model_version: 'v2.1.0'
      }
    });
  }, 2000); // Simulate processing time
});

app.get('/api/demo/compliance-analysis', (req, res) => {
  setTimeout(() => {
    res.json({
      analysis_id: 'demo_compliance_' + Date.now(),
      timestamp: new Date().toISOString(),
      organization_id: 'demo_org_001',
      status: 'completed',
      summary: {
        overall_compliance_score: 87,
        risk_level: 'Medium',
        total_requirements: 186,
        compliant_requirements: 162,
        non_compliant_requirements: 24,
        critical_issues: 3,
        recommendations: 8
      },
      findings: [
        {
          severity: 'Critical',
          category: 'Gap',
          framework: 'GDPR',
          title: 'Data Processing Records Incomplete',
          description: '15% of data processing activities lack proper documentation',
          remediation: {
            effort: 'Medium',
            cost: 25000,
            timeline: '60-90 days'
          }
        },
        {
          severity: 'High',
          category: 'Risk',
          framework: 'SOX',
          title: 'IT Controls Documentation',
          description: 'Some IT general controls need updated documentation',
          remediation: {
            effort: 'Low',
            cost: 8000,
            timeline: '30-45 days'
          }
        }
      ],
      predictions: {
        next_quarter_risk: 'Stable',
        compliance_trend: 'Improving',
        upcoming_challenges: [
          'AI Act compliance requirements (Q4 2024)',
          'Updated ESG reporting standards (Q1 2025)'
        ]
      },
      financial_impact: {
        investment_needed: 65000,
        risk_avoided: 2500000,
        efficiency_savings: 180000,
        roi_percentage: 4023
      }
    });
  }, 1500);
});

app.get('/api/demo/meeting-analysis', (req, res) => {
  setTimeout(() => {
    res.json({
      analysis_id: 'demo_meeting_' + Date.now(),
      timestamp: new Date().toISOString(),
      meeting_id: 'demo_meeting_q4_2024',
      status: 'completed',
      summary: {
        overall_score: 84,
        efficiency_score: 78,
        participation_score: 89,
        outcome_score: 86,
        action_items_count: 12,
        decisions_count: 3,
        duration_minutes: 165
      },
      performance: {
        time_management: {
          started_on_time: true,
          ended_on_time: false,
          agenda_adherence: 82,
          overrun_minutes: 15
        },
        participation: {
          speaking_balance: 75,
          engagement_level: 89,
          all_voices_heard: true,
          dominant_speakers: 1
        },
        outcomes: {
          decisions_clarity: 92,
          action_items_clarity: 88,
          next_steps_defined: true
        }
      },
      key_insights: [
        'Strong engagement on ESG initiatives discussion',
        'Cybersecurity concerns require follow-up',
        'Compensation decisions well-structured',
        'Meeting ran long due to extended ESG discussion'
      ],
      decisions: [
        {
          title: 'ESG Initiative Budget Approval',
          amount: 2500000,
          voting_result: 'Unanimous approval',
          implementation_date: '2024-05-01'
        },
        {
          title: 'Executive Compensation Adjustment',
          voting_result: '4 for, 1 abstention',
          effective_date: '2024-07-01'
        }
      ],
      action_items: [
        {
          title: 'Cybersecurity assessment completion',
          assignee: 'CTO',
          due_date: '2024-05-15',
          priority: 'High'
        },
        {
          title: 'ESG implementation plan',
          assignee: 'Chief Sustainability Officer',
          due_date: '2024-05-30',
          priority: 'High'
        }
      ],
      recommendations: [
        {
          category: 'Time Management',
          title: 'Implement stricter time controls',
          description: 'Use timebox techniques to avoid overruns'
        },
        {
          category: 'Preparation',
          title: 'Pre-circulate detailed ESG materials',
          description: 'Complex topics need advance review'
        }
      ]
    });
  }, 1800);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    demo_mode: true
  });
});

// Start the demo server
let mcpServer;

// eslint-disable-next-line no-unused-vars
function startMCPServer() {
  console.log('🚀 Starting MCP server...');
  mcpServer = spawn('node', ['../dist/server.js'], {
    cwd: __dirname,
    stdio: 'pipe',
    env: { ...process.env, PORT: MCP_PORT }
  });

  mcpServer.stdout.on('data', (data) => {
    console.log('MCP:', data.toString().trim());
  });

  mcpServer.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString().trim());
  });

  mcpServer.on('close', (code) => {
    console.log(`MCP server exited with code ${code}`);
  });
}

function stopMCPServer() {
  if (mcpServer) {
    console.log('🛑 Stopping MCP server...');
    mcpServer.kill();
  }
}

// Start servers
app.listen(PORT, () => {
  console.log('🎭 BoardGuru MCP Demo Server');
  console.log('============================');
  console.log(`📊 Demo UI: http://localhost:${PORT}/demo`);
  console.log(`🔌 MCP Server: http://localhost:${MCP_PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/demo#docs`);
  console.log('');
  console.log('Demo Features:');
  console.log('• Board Composition Analysis');
  console.log('• Compliance Intelligence');
  console.log('• Meeting Performance Analytics');
  console.log('• Real-time AI Insights');
  console.log('');
  console.log('💡 Try the interactive demo to see £1M+ revenue potential!');
  
  // Uncomment to auto-start MCP server
  // startMCPServer();
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down demo server...');
  stopMCPServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down demo server...');
  stopMCPServer();
  process.exit(0);
});