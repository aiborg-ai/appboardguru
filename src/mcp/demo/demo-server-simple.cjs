#!/usr/bin/env node

/**
 * BoardGuru MCP Demo Server - Simplified Version
 * Minimal demo server that works reliably for deployment
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || process.env.DEMO_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Demo data - Board analysis results
const DEMO_BOARD_ANALYSIS = {
  boardScore: 82,
  totalMembers: 8,
  independence: {
    score: 75,
    independent: 6,
    nonIndependent: 2,
    issues: ["CEO also serves as Chair", "Two family members on board"]
  },
  diversity: {
    score: 88,
    gender: { male: 5, female: 3, other: 0 },
    ethnicity: { white: 4, asian: 2, black: 1, hispanic: 1 },
    age: { under40: 1, "40-60": 4, over60: 3 }
  },
  expertise: {
    score: 85,
    gaps: ["Cybersecurity", "ESG/Sustainability"],
    strengths: ["Finance", "Operations", "Legal", "Technology"]
  },
  compliance: {
    score: 70,
    issues: [
      "Missing ESG committee",
      "No cybersecurity expertise on audit committee", 
      "Excessive tenure for 2 members (>12 years)"
    ],
    recommendations: [
      "Establish ESG committee within 6 months",
      "Add cybersecurity expert to board",
      "Implement term limits policy"
    ]
  },
  riskAssessment: {
    score: 78,
    highRisk: ["Regulatory compliance", "Technology oversight"],
    mediumRisk: ["Succession planning", "Executive compensation"],
    lowRisk: ["Financial oversight", "Stakeholder engagement"]
  },
  meetingEfficiency: {
    score: 68,
    avgDuration: "3.2 hours",
    preparationTime: "2.1 hours per member",
    actionItemCompletion: "74%",
    recommendations: [
      "Implement pre-meeting materials 48h requirement",
      "Use AI-powered meeting summaries",
      "Establish action item tracking system"
    ]
  },
  aiInsights: [
    "Board composition shows strong financial expertise but lacks modern governance skills",
    "Independence concerns due to dual CEO/Chair role may affect regulatory compliance",
    "High diversity scores position company well for ESG ratings",
    "Technology expertise gap creates cyber risk exposure",
    "Meeting efficiency below industry benchmark of 75%"
  ],
  roiProjection: {
    annualSavings: 285000,
    riskReduction: "£450K potential losses avoided",
    efficiencyGains: "30% reduction in meeting prep time",
    complianceBenefits: "Reduced regulatory risk exposure",
    totalValue: "£1.2M annual value creation"
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'BoardGuru MCP Demo',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Demo board analysis endpoint
app.get('/api/demo/board-analysis', (req, res) => {
  res.json({
    success: true,
    message: "AI-powered board analysis completed",
    data: DEMO_BOARD_ANALYSIS,
    processingTime: "2.3 seconds",
    confidence: "High (94%)",
    timestamp: new Date().toISOString()
  });
});

// Demo compliance scan
app.get('/api/demo/compliance-scan', (req, res) => {
  res.json({
    success: true,
    message: "Compliance framework scan completed",
    data: {
      overallScore: 78,
      frameworks: {
        "UK Corporate Governance Code": { score: 82, compliant: true },
        "Sarbanes-Oxley": { score: 88, compliant: true },
        "GDPR": { score: 72, compliant: false, issues: ["Data retention policy needs update"] },
        "ESG Reporting": { score: 65, compliant: false, issues: ["Missing sustainability committee"] }
      },
      criticalIssues: 2,
      mediumIssues: 4,
      recommendations: [
        "Update data retention policies for GDPR compliance",
        "Establish ESG/Sustainability committee",
        "Implement board diversity reporting",
        "Review director independence criteria"
      ],
      estimatedCost: "£45,000",
      timeToResolve: "3-6 months",
      riskLevel: "Medium"
    },
    timestamp: new Date().toISOString()
  });
});

// Demo meeting intelligence
app.get('/api/demo/meeting-intelligence', (req, res) => {
  res.json({
    success: true,
    message: "Meeting intelligence analysis completed",
    data: {
      meetingEfficiency: 68,
      keyMetrics: {
        avgMeetingDuration: "3.2 hours",
        preparationTime: "2.1 hours per member",
        actionItemCompletion: "74%",
        memberEngagement: "82%",
        decisionQuality: "79%"
      },
      improvements: [
        "AI-powered agenda optimization could save 45 minutes per meeting",
        "Automated action item tracking would improve completion to 90%",
        "Pre-meeting intelligence briefings reduce prep time by 30%"
      ],
      potentialSavings: {
        timePerMeeting: "45 minutes",
        annualTimeSavings: "36 hours per member", 
        costSavings: "£24,000 annually",
        productivityGain: "15%"
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ROI Calculator endpoint
app.post('/api/demo/calculate-roi', (req, res) => {
  const { boardSize = 8, meetingsPerYear = 12, avgMemberRate = 150 } = req.body;
  
  const calculations = {
    currentCosts: {
      meetingTime: boardSize * meetingsPerYear * 3.5 * avgMemberRate,
      preparation: boardSize * meetingsPerYear * 2.5 * avgMemberRate,
      compliance: 45000,
      total: 0
    },
    withBoardGuru: {
      meetingTime: boardSize * meetingsPerYear * 2.5 * avgMemberRate,
      preparation: boardSize * meetingsPerYear * 1.8 * avgMemberRate,
      compliance: 15000,
      subscription: 100000,
      total: 0
    }
  };
  
  calculations.currentCosts.total = 
    calculations.currentCosts.meetingTime + 
    calculations.currentCosts.preparation + 
    calculations.currentCosts.compliance;
    
  calculations.withBoardGuru.total = 
    calculations.withBoardGuru.meetingTime + 
    calculations.withBoardGuru.preparation + 
    calculations.withBoardGuru.compliance +
    calculations.withBoardGuru.subscription;
  
  const annualSavings = calculations.currentCosts.total - calculations.withBoardGuru.total;
  const roi = ((annualSavings / calculations.withBoardGuru.subscription) * 100).toFixed(0);
  
  res.json({
    success: true,
    message: "ROI calculation completed",
    data: {
      annualSavings,
      roi: `${roi}%`,
      paybackPeriod: `${Math.ceil(12 / (annualSavings / calculations.withBoardGuru.subscription))} months`,
      breakdown: calculations,
      recommendations: annualSavings > 100000 ? 
        ["Strong ROI case", "Recommend Enterprise plan", "3-year commitment for maximum savings"] :
        ["Positive ROI potential", "Consider Starter plan", "Pilot with key board first"]
    },
    timestamp: new Date().toISOString()
  });
});

// Demo homepage
app.get('/', (req, res) => {
  res.redirect('/demo.html');
});

app.get('/demo', (req, res) => {
  res.redirect('/demo.html');
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🎭 BoardGuru MCP Demo Server');
  console.log('============================');
  console.log(`📊 Demo UI: http://localhost:${PORT}/demo.html`);
  console.log(`🔍 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 API: http://localhost:${PORT}/api/demo/board-analysis`);
  console.log('');
  console.log('Demo Features:');
  console.log('✅ Board Composition Analysis');
  console.log('✅ Compliance Intelligence');
  console.log('✅ Meeting Performance Analytics');
  console.log('✅ ROI Calculator');
  console.log('');
  console.log('💡 Ready for £1M+ revenue generation!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down demo server...');
  server.close(() => {
    console.log('✅ Demo server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down demo server...');
  server.close(() => {
    console.log('✅ Demo server stopped');
    process.exit(0);
  });
});

module.exports = app;