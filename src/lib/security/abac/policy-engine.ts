/**
 * ABAC Policy Engine
 * Core engine for evaluating access control policies with comprehensive rule evaluation
 */

import {
  ABACPolicy,
  AccessRequest,
  AccessDecision,
  PolicyRule,
  LogicalExpression,
  AttributeMatch,
  DecisionReason,
  Obligation,
  Advice,
  PolicyId,
  RuleId,
  ABACError,
  EvaluationMetrics,
  PolicySet,
  AttributeResolver,
  PolicyEvaluator,
  DecisionCombiner
} from './types'
import { logSecurityEvent } from '../audit'

/**
 * Policy Decision Point (PDP) - Main evaluation engine
 */
export class PolicyEngine {
  private policies: Map<PolicyId, ABACPolicy> = new Map()
  private policySets: Map<string, PolicySet> = new Map()
  private attributeResolvers: Map<string, AttributeResolver> = new Map()
  private obligationHandlers: Map<string, (obligation: Obligation, context: AccessRequest) => Promise<void>> = new Map()
  private metrics: EvaluationMetrics[] = []
  private readonly maxCachedMetrics = 1000

  /**
   * Register a policy in the engine
   */
  registerPolicy(policy: ABACPolicy): void {
    if (policy.status !== 'active') {
      return
    }

    this.policies.set(policy.id as PolicyId, policy)
    
    // Log policy registration
    logSecurityEvent('policy_registered', {
      policyId: policy.id,
      policyName: policy.name,
      rulesCount: policy.rules.length
    }, 'low').catch(console.error)
  }

  /**
   * Unregister a policy from the engine
   */
  unregisterPolicy(policyId: PolicyId): void {
    this.policies.delete(policyId)
    
    logSecurityEvent('policy_unregistered', {
      policyId
    }, 'low').catch(console.error)
  }

  /**
   * Register a policy set
   */
  registerPolicySet(policySet: PolicySet): void {
    this.policySets.set(policySet.id, policySet)
  }

  /**
   * Register attribute resolver for dynamic attribute resolution
   */
  registerAttributeResolver(attributePath: string, resolver: AttributeResolver): void {
    this.attributeResolvers.set(attributePath, resolver)
  }

  /**
   * Register obligation handler
   */
  registerObligationHandler(
    obligationType: string, 
    handler: (obligation: Obligation, context: AccessRequest) => Promise<void>
  ): void {
    this.obligationHandlers.set(obligationType, handler)
  }

  /**
   * Main evaluation method - evaluate access request against all applicable policies
   */
  async evaluate(request: AccessRequest): Promise<AccessDecision> {
    const startTime = Date.now()
    const requestId = request.context?.correlationId || this.generateRequestId()

    try {
      // Find applicable policies
      const applicablePolicies = await this.findApplicablePolicies(request)
      
      if (applicablePolicies.length === 0) {
        const decision: AccessDecision = {
          decision: 'not_applicable',
          confidence: 1.0,
          riskScore: 0,
          reasons: [{
            type: 'policy',
            description: 'No applicable policies found',
            severity: 'info'
          }],
          appliedPolicies: [],
          obligations: [],
          advice: [],
          metadata: {
            requestId,
            timestamp: new Date(),
            evaluationTime: Date.now() - startTime,
            evaluatedPolicies: 0,
            version: '1.0.0'
          }
        }

        await this.logDecision(request, decision)
        return decision
      }

      // Evaluate each applicable policy
      const policyDecisions: AccessDecision[] = []
      for (const policy of applicablePolicies) {
        const policyDecision = await this.evaluatePolicy(policy, request)
        policyDecisions.push(policyDecision)
      }

      // Combine decisions using appropriate algorithm
      const finalDecision = this.combineDecisions(policyDecisions, 'deny_overrides')
      
      // Update metadata
      finalDecision.metadata = {
        ...finalDecision.metadata,
        requestId,
        timestamp: new Date(),
        evaluationTime: Date.now() - startTime,
        evaluatedPolicies: applicablePolicies.length,
        version: '1.0.0'
      }

      // Execute obligations if decision is permit
      if (finalDecision.decision === 'permit') {
        await this.executeObligations(finalDecision.obligations, request)
      }

      // Log decision and metrics
      await this.logDecision(request, finalDecision)
      this.recordMetrics(finalDecision.metadata)

      return finalDecision

    } catch (error) {
      const errorDecision: AccessDecision = {
        decision: 'indeterminate',
        confidence: 0,
        riskScore: 100,
        reasons: [{
          type: 'policy',
          description: `Policy evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          details: { error: error instanceof Error ? error.stack : error }
        }],
        appliedPolicies: [],
        obligations: [],
        advice: [],
        metadata: {
          requestId,
          timestamp: new Date(),
          evaluationTime: Date.now() - startTime,
          evaluatedPolicies: 0,
          version: '1.0.0'
        }
      }

      await logSecurityEvent('policy_evaluation_error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        subject: request.subject.id,
        resource: request.resource.id,
        action: request.action.type
      }, 'high')

      return errorDecision
    }
  }

  /**
   * Find policies applicable to the access request
   */
  private async findApplicablePolicies(request: AccessRequest): Promise<ABACPolicy[]> {
    const applicable: ABACPolicy[] = []

    for (const [, policy] of this.policies) {
      if (policy.status !== 'active') continue

      const isApplicable = await this.isPolicyApplicable(policy, request)
      if (isApplicable) {
        applicable.push(policy)
      }
    }

    // Sort by priority (higher priority first)
    return applicable.sort((a, b) => (b.priority || 0) - (a.priority || 0))
  }

  /**
   * Check if policy is applicable to request
   */
  private async isPolicyApplicable(policy: ABACPolicy, request: AccessRequest): Promise<boolean> {
    if (!policy.target) return true

    // Check subject match
    if (policy.target.subjects && policy.target.subjects.length > 0) {
      const subjectMatch = await this.evaluateAttributeMatches(
        policy.target.subjects,
        request.subject.attributes,
        request
      )
      if (!subjectMatch) return false
    }

    // Check resource match
    if (policy.target.resources && policy.target.resources.length > 0) {
      const resourceMatch = await this.evaluateAttributeMatches(
        policy.target.resources,
        request.resource.attributes,
        request
      )
      if (!resourceMatch) return false
    }

    // Check action match
    if (policy.target.actions && policy.target.actions.length > 0) {
      const actionMatch = await this.evaluateAttributeMatches(
        policy.target.actions,
        request.action.attributes,
        request
      )
      if (!actionMatch) return false
    }

    // Check environment match
    if (policy.target.environments && policy.target.environments.length > 0) {
      const environmentMatch = await this.evaluateAttributeMatches(
        policy.target.environments,
        request.environment.attributes,
        request
      )
      if (!environmentMatch) return false
    }

    return true
  }

  /**
   * Evaluate a single policy against the request
   */
  private async evaluatePolicy(policy: ABACPolicy, request: AccessRequest): Promise<AccessDecision> {
    const reasons: DecisionReason[] = []
    const appliedRules: string[] = []
    let finalEffect: 'permit' | 'deny' | null = null
    
    // Evaluate each rule in the policy
    for (const rule of policy.rules) {
      const ruleResult = await this.evaluateRule(rule, request)
      
      if (ruleResult.applicable) {
        appliedRules.push(rule.id)
        reasons.push({
          type: 'rule',
          description: `Rule ${rule.id}: ${rule.description || rule.effect}`,
          severity: 'info',
          details: { ruleId: rule.id, effect: rule.effect }
        })

        // First applicable rule wins (could be configurable)
        if (finalEffect === null) {
          finalEffect = rule.effect
        }

        // Deny overrides - if any rule denies, overall effect is deny
        if (rule.effect === 'deny') {
          finalEffect = 'deny'
          break
        }
      }
    }

    // Calculate confidence and risk score
    const confidence = appliedRules.length > 0 ? 0.9 : 0.1
    const riskScore = this.calculateRiskScore(request, finalEffect || 'deny')

    const decision: AccessDecision = {
      decision: finalEffect === 'permit' ? 'permit' : 
               finalEffect === 'deny' ? 'deny' : 'not_applicable',
      confidence,
      riskScore,
      reasons,
      appliedPolicies: [policy.id],
      obligations: finalEffect === 'permit' ? (policy.obligations || []) : [],
      advice: policy.advice || [],
      metadata: {
        requestId: '',
        timestamp: new Date(),
        evaluationTime: 0,
        evaluatedPolicies: 1,
        version: '1.0.0'
      }
    }

    return decision
  }

  /**
   * Evaluate a single rule
   */
  private async evaluateRule(rule: PolicyRule, request: AccessRequest): Promise<{
    applicable: boolean
    effect?: 'permit' | 'deny'
  }> {
    // Check rule target first
    if (rule.target) {
      const targetApplicable = await this.isPolicyApplicable(
        { ...({} as ABACPolicy), target: rule.target }, 
        request
      )
      if (!targetApplicable) {
        return { applicable: false }
      }
    }

    // Evaluate rule condition
    if (rule.condition) {
      const conditionResult = await this.evaluateLogicalExpression(rule.condition, request)
      if (!conditionResult) {
        return { applicable: false }
      }
    }

    return { applicable: true, effect: rule.effect }
  }

  /**
   * Evaluate logical expression (AND, OR, NOT)
   */
  private async evaluateLogicalExpression(
    expression: LogicalExpression,
    request: AccessRequest
  ): Promise<boolean> {
    const { operator, operands } = expression

    switch (operator) {
      case 'and':
        for (const operand of operands) {
          let result: boolean
          if ('operator' in operand) {
            result = await this.evaluateLogicalExpression(operand as LogicalExpression, request)
          } else {
            result = await this.evaluateAttributeMatch(operand as AttributeMatch, request)
          }
          if (!result) return false
        }
        return true

      case 'or':
        for (const operand of operands) {
          let result: boolean
          if ('operator' in operand) {
            result = await this.evaluateLogicalExpression(operand as LogicalExpression, request)
          } else {
            result = await this.evaluateAttributeMatch(operand as AttributeMatch, request)
          }
          if (result) return true
        }
        return false

      case 'not':
        if (operands.length !== 1) {
          throw new Error('NOT operator must have exactly one operand')
        }
        const operand = operands[0]
        let result: boolean
        if ('operator' in operand) {
          result = await this.evaluateLogicalExpression(operand as LogicalExpression, request)
        } else {
          result = await this.evaluateAttributeMatch(operand as AttributeMatch, request)
        }
        return !result

      default:
        throw new Error(`Unknown logical operator: ${operator}`)
    }
  }

  /**
   * Evaluate multiple attribute matches (AND logic)
   */
  private async evaluateAttributeMatches(
    matches: AttributeMatch[],
    attributes: Record<string, unknown>,
    request: AccessRequest
  ): Promise<boolean> {
    for (const match of matches) {
      const result = await this.evaluateAttributeMatch(match, request, attributes)
      if (!result) return false
    }
    return true
  }

  /**
   * Evaluate single attribute match
   */
  private async evaluateAttributeMatch(
    match: AttributeMatch,
    request: AccessRequest,
    providedAttributes?: Record<string, unknown>
  ): Promise<boolean> {
    const { attribute, operator, value, ignoreCase = false } = match

    // Get attribute value
    let attributeValue: unknown

    // Try to resolve from provided attributes first
    if (providedAttributes && attribute in providedAttributes) {
      attributeValue = providedAttributes[attribute]
    } else {
      // Try to resolve dynamically
      const resolver = this.attributeResolvers.get(attribute)
      if (resolver) {
        attributeValue = await resolver(attribute, request)
      } else {
        // Try to resolve from request context
        attributeValue = this.resolveAttributeFromRequest(attribute, request)
      }
    }

    // Handle case insensitive comparison
    const actualValue = ignoreCase && typeof attributeValue === 'string' ? 
      attributeValue.toLowerCase() : attributeValue
    const expectedValue = ignoreCase && typeof value === 'string' ? 
      value.toLowerCase() : value

    // Evaluate based on operator
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue

      case 'not_equals':
        return actualValue !== expectedValue

      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue)

      case 'not_in':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue)

      case 'regex':
        if (typeof actualValue !== 'string' || typeof expectedValue !== 'string') {
          return false
        }
        const regex = new RegExp(expectedValue, ignoreCase ? 'i' : '')
        return regex.test(actualValue)

      case 'greater_than':
        return typeof actualValue === 'number' && typeof expectedValue === 'number' && 
               actualValue > expectedValue

      case 'less_than':
        return typeof actualValue === 'number' && typeof expectedValue === 'number' && 
               actualValue < expectedValue

      case 'contains':
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.includes(expectedValue)
        }
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue)
        }
        return false

      case 'starts_with':
        return typeof actualValue === 'string' && typeof expectedValue === 'string' &&
               actualValue.startsWith(expectedValue)

      case 'ends_with':
        return typeof actualValue === 'string' && typeof expectedValue === 'string' &&
               actualValue.endsWith(expectedValue)

      case 'exists':
        return attributeValue !== undefined && attributeValue !== null

      case 'not_exists':
        return attributeValue === undefined || attributeValue === null

      default:
        throw new Error(`Unknown attribute match operator: ${operator}`)
    }
  }

  /**
   * Resolve attribute from request context
   */
  private resolveAttributeFromRequest(attributePath: string, request: AccessRequest): unknown {
    const parts = attributePath.split('.')
    let current: any = request

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * Combine multiple policy decisions
   */
  private combineDecisions(
    decisions: AccessDecision[],
    algorithm: 'deny_overrides' | 'permit_overrides' | 'first_applicable' | 'only_one_applicable'
  ): AccessDecision {
    if (decisions.length === 0) {
      throw new Error('Cannot combine empty decision list')
    }

    if (decisions.length === 1) {
      return decisions[0]
    }

    let finalDecision: 'permit' | 'deny' | 'not_applicable' | 'indeterminate'
    const allReasons: DecisionReason[] = []
    const allPolicies: string[] = []
    const allObligations: Obligation[] = []
    const allAdvice: Advice[] = []
    let totalRiskScore = 0
    let totalConfidence = 0

    for (const decision of decisions) {
      allReasons.push(...decision.reasons)
      allPolicies.push(...decision.appliedPolicies)
      allObligations.push(...decision.obligations)
      allAdvice.push(...decision.advice)
      totalRiskScore += decision.riskScore
      totalConfidence += decision.confidence
    }

    switch (algorithm) {
      case 'deny_overrides':
        finalDecision = decisions.some(d => d.decision === 'deny') ? 'deny' :
                       decisions.some(d => d.decision === 'permit') ? 'permit' :
                       decisions.some(d => d.decision === 'indeterminate') ? 'indeterminate' :
                       'not_applicable'
        break

      case 'permit_overrides':
        finalDecision = decisions.some(d => d.decision === 'permit') ? 'permit' :
                       decisions.some(d => d.decision === 'deny') ? 'deny' :
                       decisions.some(d => d.decision === 'indeterminate') ? 'indeterminate' :
                       'not_applicable'
        break

      case 'first_applicable':
        const firstApplicable = decisions.find(d => d.decision !== 'not_applicable')
        finalDecision = firstApplicable ? firstApplicable.decision : 'not_applicable'
        break

      case 'only_one_applicable':
        const applicable = decisions.filter(d => d.decision !== 'not_applicable')
        if (applicable.length === 0) {
          finalDecision = 'not_applicable'
        } else if (applicable.length === 1) {
          finalDecision = applicable[0].decision
        } else {
          finalDecision = 'indeterminate'
          allReasons.push({
            type: 'policy',
            description: 'Multiple applicable policies found - indeterminate result',
            severity: 'warning'
          })
        }
        break

      default:
        throw new Error(`Unknown combining algorithm: ${algorithm}`)
    }

    return {
      decision: finalDecision,
      confidence: totalConfidence / decisions.length,
      riskScore: Math.min(totalRiskScore / decisions.length, 100),
      reasons: allReasons,
      appliedPolicies: [...new Set(allPolicies)],
      obligations: allObligations,
      advice: allAdvice,
      metadata: {
        requestId: '',
        timestamp: new Date(),
        evaluationTime: 0,
        evaluatedPolicies: decisions.length,
        version: '1.0.0'
      }
    }
  }

  /**
   * Calculate risk score based on request and decision
   */
  private calculateRiskScore(request: AccessRequest, effect: 'permit' | 'deny'): number {
    let riskScore = 0

    // Base risk from resource sensitivity
    const sensitivity = request.resource.attributes.sensitivity
    switch (sensitivity) {
      case 'critical': riskScore += 40; break
      case 'high': riskScore += 30; break
      case 'medium': riskScore += 20; break
      case 'low': riskScore += 10; break
      default: riskScore += 15; break
    }

    // Risk from action type
    const action = request.action.attributes.action
    if (action.includes('delete') || action.includes('destroy')) riskScore += 25
    else if (action.includes('modify') || action.includes('update')) riskScore += 15
    else if (action.includes('create')) riskScore += 10
    else if (action.includes('export')) riskScore += 20

    // Environmental risk factors
    if (request.environment.attributes.threatLevel === 'high') riskScore += 20
    if (request.environment.attributes.network === 'external') riskScore += 15
    if (request.environment.attributes.timeOfDay === 'after_hours') riskScore += 10

    // Subject risk factors
    if (request.subject.attributes.failedLoginCount && request.subject.attributes.failedLoginCount > 3) {
      riskScore += 15
    }
    if (!request.subject.attributes.mfaVerified) riskScore += 10

    // Effect modifier
    if (effect === 'deny') riskScore = Math.max(riskScore - 20, 0)

    return Math.min(riskScore, 100)
  }

  /**
   * Execute obligations
   */
  private async executeObligations(obligations: Obligation[], request: AccessRequest): Promise<void> {
    for (const obligation of obligations) {
      try {
        const handler = this.obligationHandlers.get(obligation.type)
        if (handler) {
          await handler(obligation, request)
        } else {
          // Default obligation handling
          await this.handleDefaultObligation(obligation, request)
        }
      } catch (error) {
        await logSecurityEvent('obligation_execution_failed', {
          obligationId: obligation.id,
          obligationType: obligation.type,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: request.context?.correlationId
        }, 'medium')
      }
    }
  }

  /**
   * Default obligation handler
   */
  private async handleDefaultObligation(obligation: Obligation, request: AccessRequest): Promise<void> {
    switch (obligation.type) {
      case 'log':
        await logSecurityEvent('obligation_log', {
          obligationId: obligation.id,
          parameters: obligation.parameters,
          subject: request.subject.id,
          resource: request.resource.id,
          action: request.action.type
        }, 'low')
        break

      case 'audit':
        await logSecurityEvent('obligation_audit', {
          obligationId: obligation.id,
          parameters: obligation.parameters,
          subject: request.subject.id,
          resource: request.resource.id,
          action: request.action.type
        }, 'medium')
        break

      default:
        console.warn(`No handler for obligation type: ${obligation.type}`)
    }
  }

  /**
   * Log access decision
   */
  private async logDecision(request: AccessRequest, decision: AccessDecision): Promise<void> {
    await logSecurityEvent('access_decision', {
      requestId: decision.metadata.requestId,
      decision: decision.decision,
      subject: request.subject.id,
      resource: request.resource.id,
      action: request.action.type,
      riskScore: decision.riskScore,
      confidence: decision.confidence,
      appliedPolicies: decision.appliedPolicies,
      evaluationTime: decision.metadata.evaluationTime
    }, decision.decision === 'deny' ? 'medium' : 'low')
  }

  /**
   * Record evaluation metrics
   */
  private recordMetrics(metadata: AccessDecision['metadata']): void {
    const metrics: EvaluationMetrics = {
      requestId: metadata.requestId,
      timestamp: metadata.timestamp,
      evaluationTime: metadata.evaluationTime,
      policiesEvaluated: metadata.evaluatedPolicies,
      rulesEvaluated: 0, // TODO: track this
      attributeResolutions: 0, // TODO: track this
      cacheHits: 0, // TODO: implement caching
      cacheMisses: 0
    }

    this.metrics.push(metrics)

    // Keep metrics array bounded
    if (this.metrics.length > this.maxCachedMetrics) {
      this.metrics.shift()
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get evaluation metrics
   */
  getMetrics(): EvaluationMetrics[] {
    return [...this.metrics]
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Get registered policies
   */
  getPolicies(): ABACPolicy[] {
    return Array.from(this.policies.values())
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: PolicyId): ABACPolicy | undefined {
    return this.policies.get(policyId)
  }
}