# BoardGuru MCP API Documentation
## Enterprise Board Governance Intelligence API

### Overview
The BoardGuru Model Context Protocol (MCP) provides AI-powered board governance intelligence through a comprehensive RESTful API. Built for enterprise-scale integration with existing governance systems.

**Base URL:** `https://api.boardguru.ai/v1/mcp`
**Protocol:** HTTPS only
**Authentication:** Bearer token (JWT) or API Key
**Rate Limits:** Tiered based on subscription (100-5000 requests/minute)

---

## Authentication

### API Key Authentication
```http
GET /mcp/board-analysis
Authorization: ApiKey bg_mcp_1234567890abcdef...
Content-Type: application/json
```

### JWT Token Authentication
```http
GET /mcp/board-analysis  
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Creating API Keys
```http
POST /auth/api-keys
Authorization: Bearer {user_jwt_token}
Content-Type: application/json

{
  "name": "Board Analysis Integration",
  "description": "API key for board composition analysis",
  "permissions": [
    {
      "resource": "board_analysis",
      "actions": ["read", "write"]
    }
  ],
  "scopes": [
    {
      "service": "board_analysis",
      "level": "read"
    }
  ],
  "expires_in_days": 365,
  "rate_limit": {
    "requests_per_minute": 100,
    "requests_per_hour": 1000,
    "requests_per_day": 10000
  }
}
```

---

## Core Resources

### 1. Board Analysis

#### Analyze Board Composition
```http
POST /mcp/board-analysis/analyze
Authorization: ApiKey bg_mcp_...
Content-Type: application/json

{
  "organization_id": "org_12345",
  "board_members": [
    {
      "id": "member_001",
      "name": "Jane Smith",
      "role": "Chair",
      "tenure_months": 36,
      "age": 55,
      "gender": "F",
      "ethnicity": "White",
      "skills": ["Finance", "Strategy", "M&A"],
      "experience": {
        "total_years": 25,
        "board_years": 8,
        "industries": ["Financial Services", "Technology"],
        "public_company": true,
        "ceo_experience": false
      },
      "independence": "Independent",
      "committees": ["Audit", "Compensation"]
    }
  ],
  "analysis_options": {
    "include_recommendations": true,
    "include_benchmarking": true,
    "include_risk_assessment": true,
    "benchmark_against": "industry_peers"
  }
}
```

#### Response
```json
{
  "analysis_id": "analysis_789",
  "timestamp": "2024-04-24T10:30:00Z",
  "organization_id": "org_12345",
  "status": "completed",
  "results": {
    "overall_score": 78,
    "grade": "B+",
    "composition": {
      "total_members": 8,
      "independent_members": 6,
      "diversity": {
        "gender": {
          "female_percentage": 37.5,
          "target": 40.0,
          "benchmark": 35.2
        },
        "ethnic": {
          "diverse_percentage": 25.0,
          "target": 30.0,
          "benchmark": 28.1
        },
        "age": {
          "average_age": 58.2,
          "range": [45, 68],
          "optimal_range": [45, 65]
        }
      },
      "tenure": {
        "average_months": 42,
        "optimal_range": [24, 72],
        "concerning_members": 1
      }
    },
    "skills_matrix": {
      "coverage_score": 82,
      "critical_gaps": [
        {
          "skill": "Cybersecurity",
          "importance": 90,
          "current_coverage": 25,
          "recommended_level": 85
        },
        {
          "skill": "ESG",
          "importance": 85,
          "current_coverage": 60,
          "recommended_level": 80
        }
      ],
      "strengths": [
        {
          "skill": "Financial Expertise",
          "coverage": 95,
          "depth": "Excellent"
        }
      ]
    },
    "performance": {
      "decision_quality": 85,
      "decision_speed": 72,
      "strategic_focus": 78,
      "risk_oversight": 80
    },
    "recommendations": [
      {
        "id": "rec_001",
        "priority": "High",
        "category": "Skills Gap",
        "title": "Add Cybersecurity Expert",
        "description": "Board lacks sufficient cybersecurity expertise for digital risk oversight",
        "rationale": "85% of industry peers have dedicated cybersecurity expertise",
        "implementation": {
          "timeline": "Next board refresh cycle",
          "effort": "Medium",
          "cost": 25000,
          "success_metrics": ["Cybersecurity coverage >80%", "Risk assessment score +15"]
        },
        "impact": {
          "risk_reduction": 35,
          "governance_improvement": 15,
          "stakeholder_confidence": 20
        },
        "confidence": 92
      }
    ],
    "benchmarking": {
      "industry": "Financial Services",
      "peer_group": "Large Cap Banks",
      "metrics": [
        {
          "metric": "Overall Governance Score",
          "your_score": 78,
          "peer_average": 74,
          "top_quartile": 85,
          "ranking": "60th percentile"
        }
      ]
    }
  },
  "metadata": {
    "analysis_time_ms": 2341,
    "confidence": 88,
    "data_quality": 92,
    "model_version": "v2.1.0"
  }
}
```

### 2. Compliance Intelligence

#### Run Compliance Analysis
```http
POST /mcp/compliance-analysis/analyze
Authorization: ApiKey bg_mcp_...
Content-Type: application/json

{
  "organization_id": "org_12345",
  "analysis_type": "full",
  "scope": {
    "frameworks": ["GDPR", "SOX", "FCA_SYSC"],
    "include_subsidiaries": true
  },
  "options": {
    "include_recommendations": true,
    "include_predictions": true,
    "include_financial_impact": true,
    "detail_level": "comprehensive"
  }
}
```

#### Response
```json
{
  "analysis_id": "comp_analysis_456",
  "timestamp": "2024-04-24T10:30:00Z",
  "organization_id": "org_12345",
  "status": "completed",
  "summary": {
    "overall_compliance_score": 87,
    "risk_level": "Medium",
    "total_requirements": 247,
    "compliant_requirements": 215,
    "non_compliant_requirements": 18,
    "critical_issues": 3,
    "recommendations": 12
  },
  "findings": [
    {
      "id": "finding_001",
      "severity": "Critical",
      "category": "Violation",
      "framework": "GDPR",
      "requirement": "Article 30 - Records of Processing",
      "title": "Incomplete Processing Records",
      "description": "Records of processing activities missing for 15% of data processing operations",
      "evidence": [
        {
          "type": "System",
          "source": "Data mapping audit",
          "details": "Gap analysis identified 23 unrecorded processing activities",
          "confidence": 92
        }
      ],
      "impact": {
        "operational": "Data subject request delays",
        "financial": "Potential fines up to €20M or 4% global turnover", 
        "reputational": "Regulatory scrutiny and public disclosure",
        "regulatory": "Article 83 administrative fine"
      },
      "remediation": {
        "actions": [
          "Complete data processing inventory",
          "Implement automated record maintenance",
          "Assign data protection accountability"
        ],
        "effort": "Medium",
        "cost": 45000,
        "timeline": "60-90 days",
        "responsible": ["Data Protection Officer", "IT Security Team"]
      },
      "status": "Open"
    }
  ],
  "predictions": {
    "risk_trends": [
      {
        "framework": "GDPR",
        "current_risk": 35,
        "predicted_risk": 28,
        "trend": "Decreasing",
        "confidence": 85,
        "factors": ["Ongoing remediation", "Process improvements"]
      }
    ],
    "upcoming_challenges": [
      {
        "challenge": "New AI Act compliance requirements",
        "likelihood": 78,
        "impact": "Medium regulatory burden",
        "timeline": "Q4 2024",
        "preparation": [
          "AI governance framework",
          "Algorithm audit processes",
          "Transparency documentation"
        ]
      }
    ]
  },
  "financial_impact": {
    "costs": {
      "current_compliance": 2500000,
      "recommended_investment": 180000,
      "ongoing_costs": 2750000
    },
    "risks": {
      "potential_penalties": 12000000,
      "business_disruption": 1500000,
      "legal_costs": 500000
    },
    "benefits": {
      "penalties_avoided": 8000000,
      "efficiency_gains": 350000,
      "risk_reduction": 2000000
    },
    "roi": {
      "investment": 180000,
      "returns": 2350000,
      "percentage": 1305,
      "payback_period": 2.8,
      "npv": 2170000
    }
  }
}
```

### 3. Meeting Intelligence

#### Analyze Meeting
```http
POST /mcp/meeting-analysis/analyze
Authorization: ApiKey bg_mcp_...
Content-Type: application/json

{
  "meeting_id": "meeting_789",
  "analysis_options": {
    "include_transcript": true,
    "include_sentiment": true,
    "include_performance": true,
    "include_recommendations": true,
    "detail_level": "comprehensive"
  }
}
```

#### Response
```json
{
  "analysis_id": "meeting_analysis_321",
  "timestamp": "2024-04-24T10:30:00Z",
  "meeting_id": "meeting_789",
  "status": "completed",
  "summary": {
    "overall_score": 82,
    "efficiency_score": 78,
    "participation_score": 85,
    "outcome_score": 88,
    "action_items_count": 12,
    "decisions_count": 5,
    "duration_minutes": 135,
    "participants": 8
  },
  "performance": {
    "time_management": {
      "started_on_time": true,
      "ended_on_time": false,
      "agenda_adherence": 85,
      "time_per_topic": [
        {
          "topic": "Q4 Results Review",
          "planned_minutes": 20,
          "actual_minutes": 25,
          "variance": 25
        }
      ]
    },
    "participation": {
      "speaking_distribution": [
        {
          "participant": "John Smith (Chair)",
          "speaking_percentage": 28,
          "engagement_score": 92,
          "quality_score": 88
        },
        {
          "participant": "Sarah Johnson",
          "speaking_percentage": 15,
          "engagement_score": 85,
          "quality_score": 90
        }
      ],
      "engagement_metrics": {
        "questions_asked": 23,
        "interruptions": 7,
        "collaborative_moments": 18
      }
    },
    "outcomes": {
      "decisions_clarity": 88,
      "action_items_clarity": 85,
      "next_steps_defined": true,
      "consensus_achieved": 78
    }
  },
  "insights": {
    "key_topics": [
      {
        "topic": "Digital Transformation Strategy",
        "time_spent_minutes": 35,
        "sentiment": "Positive",
        "consensus_level": 85,
        "follow_up_required": true
      }
    ],
    "decisions": [
      {
        "id": "decision_001",
        "title": "Approve Q1 Budget Increase",
        "category": "Financial",
        "amount": 2500000,
        "voting_result": {
          "votes_for": 7,
          "votes_against": 0,
          "abstentions": 1,
          "result": "Passed"
        },
        "implementation_deadline": "2024-05-01"
      }
    ],
    "action_items": [
      {
        "id": "action_001",
        "title": "Prepare cybersecurity assessment",
        "assignee": "CTO",
        "due_date": "2024-05-15",
        "priority": "High",
        "complexity": "Medium"
      }
    ],
    "sentiment_analysis": {
      "overall_sentiment": "Positive",
      "confidence": 0.82,
      "key_concerns": [
        "Market volatility impact",
        "Regulatory compliance timeline"
      ],
      "positive_themes": [
        "Strong Q4 performance",
        "Digital transformation progress"
      ]
    }
  },
  "recommendations": [
    {
      "category": "Time Management",
      "priority": "Medium",
      "title": "Implement strict time boxing",
      "description": "Meeting ran 15 minutes over due to extended discussion on non-critical items",
      "implementation": {
        "steps": [
          "Set 5-minute warnings for each agenda item",
          "Designate timekeeper role",
          "Use parking lot for off-topic discussions"
        ],
        "effort": "Low",
        "timeline": "Immediate"
      },
      "expected_impact": {
        "efficiency_improvement": 15,
        "satisfaction_improvement": 10
      }
    }
  ]
}
```

---

## Webhooks

### Setting Up Webhooks
```http
POST /mcp/webhooks
Authorization: ApiKey bg_mcp_...
Content-Type: application/json

{
  "url": "https://your-system.com/boardguru-webhook",
  "events": [
    "analysis.completed",
    "compliance.alert.critical",
    "meeting.analysis.ready"
  ],
  "secret": "your_webhook_secret_for_verification"
}
```

### Webhook Event Example
```json
{
  "event": "compliance.alert.critical",
  "timestamp": "2024-04-24T10:30:00Z",
  "organization_id": "org_12345",
  "data": {
    "alert_id": "alert_critical_001",
    "severity": "Critical",
    "title": "Regulatory Deadline Approaching",
    "description": "GDPR Article 30 compliance deadline in 7 days",
    "deadline": "2024-05-01T00:00:00Z",
    "actions_required": [
      "Complete data processing records",
      "Submit compliance certification"
    ],
    "estimated_effort": "40 hours",
    "responsible": ["Data Protection Officer"]
  }
}
```

---

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Your API key does not have permission to access board analysis",
    "details": {
      "required_permission": "board_analysis:read",
      "current_permissions": ["meeting_analysis:read"],
      "upgrade_path": "professional_tier"
    },
    "request_id": "req_abc123",
    "timestamp": "2024-04-24T10:30:00Z"
  }
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | API key lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `FEATURE_NOT_AVAILABLE` | 402 | Feature requires subscription upgrade |
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

### Rate Limit Headers
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1619028000
X-RateLimit-Tier: professional
```

### Rate Limits by Tier
| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|-----------------|---------------|--------------|
| Starter | 100 | 1,000 | 10,000 |
| Professional | 500 | 5,000 | 50,000 |
| Enterprise | 2,000 | 20,000 | 200,000 |
| White Label | Unlimited | Unlimited | Unlimited |

---

## SDKs and Code Examples

### Python SDK
```python
from boardguru_mcp import BoardGuruClient

# Initialize client
client = BoardGuruClient(
    api_key="bg_mcp_your_api_key_here",
    base_url="https://api.boardguru.ai/v1/mcp"
)

# Analyze board composition
board_analysis = client.board_analysis.analyze(
    organization_id="org_12345",
    board_members=[...],
    options={
        "include_recommendations": True,
        "include_benchmarking": True
    }
)

print(f"Board Score: {board_analysis.overall_score}")
print(f"Recommendations: {len(board_analysis.recommendations)}")
```

### JavaScript/Node.js SDK
```javascript
const { BoardGuruClient } = require('@boardguru/mcp-sdk');

const client = new BoardGuruClient({
  apiKey: 'bg_mcp_your_api_key_here',
  baseUrl: 'https://api.boardguru.ai/v1/mcp'
});

// Run compliance analysis
const complianceAnalysis = await client.compliance.analyze({
  organizationId: 'org_12345',
  analysisType: 'full',
  options: {
    includeRecommendations: true,
    includePredictions: true
  }
});

console.log(`Compliance Score: ${complianceAnalysis.summary.overallComplianceScore}`);
console.log(`Critical Issues: ${complianceAnalysis.summary.criticalIssues}`);
```

---

## Testing & Sandbox

### Sandbox Environment
- **Base URL:** `https://api-sandbox.boardguru.ai/v1/mcp`
- **Authentication:** Use sandbox API keys (prefix: `bg_mcp_test_`)
- **Rate Limits:** Same as production but reset daily
- **Data:** Synthetic data for testing

### Postman Collection
Download our complete Postman collection:
`https://api.boardguru.ai/postman/boardguru-mcp.json`

### Interactive API Explorer
Test all endpoints interactively:
`https://api-docs.boardguru.ai/explorer`

---

## Support & Resources

### Developer Support
- **Documentation:** `https://docs.boardguru.ai/mcp`
- **API Status:** `https://status.boardguru.ai`
- **Developer Slack:** `https://slack.boardguru.ai/developers`
- **GitHub Issues:** `https://github.com/boardguru/mcp-sdk`

### Contact
- **Technical Support:** `api-support@boardguru.ai`
- **Partnership Inquiries:** `partners@boardguru.ai`
- **Sales Questions:** `sales@boardguru.ai`

**Last Updated:** April 24, 2024
**API Version:** v1.0
**SDK Version:** v1.2.0