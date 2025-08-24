-- Sample compliance data for testing and demonstration
-- This creates example assessments, findings, and remediation plans only if users and organizations exist

DO $$
BEGIN
    -- Check if we have both users and organizations before creating sample data
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) AND EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
        
        RAISE NOTICE 'Creating sample compliance data...';
        
        -- Sample compliance assessment for SOC 2
        INSERT INTO compliance_assessments (
            organization_id,
            framework_id,
            name,
            type,
            status,
            scope,
            assessor_id,
            scheduled_start_date,
            actual_start_date,
            scheduled_completion_date,
            overall_rating,
            summary,
            methodology
        ) VALUES (
            -- Use the first organization
            (SELECT id FROM organizations LIMIT 1),
            (SELECT id FROM compliance_frameworks WHERE name = 'SOC 2 Type II'),
            'Annual SOC 2 Type II Assessment 2024',
            'external',
            'in-progress',
            ARRAY['Infrastructure', 'Application Security', 'Data Management'],
            -- Use the first user
            (SELECT id FROM auth.users LIMIT 1),
            '2024-08-01',
            '2024-08-05',
            '2024-10-31',
            'partially-compliant',
            'Initial assessment shows strong controls in most areas with some gaps in monitoring and change management.',
            'Comprehensive review of security controls, interviews with key personnel, and testing of control effectiveness.'
        );

        -- Sample compliance findings
        INSERT INTO compliance_findings (
            assessment_id,
            organization_id,
            requirement_id,
            title,
            description,
            severity,
            status,
            deficiencies,
            recommendations,
            assigned_to,
            due_date,
            risk_rating,
            business_impact
        ) VALUES 
        (
            (SELECT id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            (SELECT organization_id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            'CC7.1',
            'Insufficient System Monitoring',
            'Current monitoring systems do not adequately track all system activities and security events. Log retention period is only 30 days, which does not meet SOC 2 requirements.',
            'high',
            'open',
            ARRAY['Log retention too short', 'Missing security event monitoring', 'No automated alerting for critical events'],
            ARRAY['Implement centralized logging solution', 'Extend log retention to 1 year', 'Set up automated security alerts'],
            (SELECT id FROM auth.users LIMIT 1),
            '2024-09-30',
            'high',
            'Reduced ability to detect security incidents and investigate breaches.'
        ),
        (
            (SELECT id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            (SELECT organization_id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            'CC8.1',
            'Change Management Process Gaps',
            'Change management process lacks proper documentation and approval workflows for production systems.',
            'medium',
            'open',
            ARRAY['No formal change approval process', 'Missing change documentation', 'No rollback procedures'],
            ARRAY['Implement formal change management workflow', 'Create change documentation templates', 'Establish rollback procedures'],
            (SELECT id FROM auth.users LIMIT 1),
            '2024-10-15',
            'medium',
            'Risk of unauthorized changes causing system outages or security vulnerabilities.'
        );

        -- Sample remediation plans
        INSERT INTO remediation_plans (
            finding_id,
            organization_id,
            title,
            description,
            status,
            priority,
            assigned_to,
            target_date,
            progress,
            action_items,
            resources_required,
            estimated_cost,
            success_criteria,
            verification_method
        ) VALUES
        (
            (SELECT id FROM compliance_findings WHERE title LIKE '%System Monitoring%' LIMIT 1),
            (SELECT organization_id FROM compliance_findings WHERE title LIKE '%System Monitoring%' LIMIT 1),
            'Implement Centralized Logging Solution',
            'Deploy and configure a centralized logging solution to collect, store, and monitor system logs across all infrastructure components.',
            'in-progress',
            'high',
            (SELECT id FROM auth.users LIMIT 1),
            '2024-09-15',
            35,
            '[
                {"task": "Evaluate logging solutions", "status": "completed", "due_date": "2024-08-15"},
                {"task": "Procure logging platform license", "status": "completed", "due_date": "2024-08-20"},
                {"task": "Install and configure logging infrastructure", "status": "in-progress", "due_date": "2024-09-01"},
                {"task": "Configure log sources and forwarders", "status": "pending", "due_date": "2024-09-10"},
                {"task": "Set up automated alerts and dashboards", "status": "pending", "due_date": "2024-09-15"}
            ]'::jsonb,
            'Security team (2 FTE), cloud infrastructure budget, logging platform license',
            15000.00,
            'All critical systems logging to centralized platform, 1-year log retention, automated security alerts operational',
            'Review log collection coverage, test alert mechanisms, verify retention policy implementation'
        ),
        (
            (SELECT id FROM compliance_findings WHERE title LIKE '%Change Management%' LIMIT 1),
            (SELECT organization_id FROM compliance_findings WHERE title LIKE '%Change Management%' LIMIT 1),
            'Implement Formal Change Management Process',
            'Establish formal change management workflow with proper documentation, approval processes, and rollback procedures.',
            'pending',
            'medium',
            (SELECT id FROM auth.users LIMIT 1),
            '2024-10-01',
            0,
            '[
                {"task": "Document current change processes", "status": "pending", "due_date": "2024-09-10"},
                {"task": "Design formal change approval workflow", "status": "pending", "due_date": "2024-09-20"},
                {"task": "Create change documentation templates", "status": "pending", "due_date": "2024-09-25"},
                {"task": "Implement change management tool", "status": "pending", "due_date": "2024-09-30"},
                {"task": "Train team on new processes", "status": "pending", "due_date": "2024-10-01"}
            ]'::jsonb,
            'DevOps team (1 FTE), change management tool license, training budget',
            8000.00,
            'All production changes follow formal approval process, change documentation complete, rollback procedures tested',
            'Audit change requests over 30-day period, verify all changes have proper documentation and approvals'
        );

        -- Sample compliance alerts
        INSERT INTO compliance_alerts (
            organization_id,
            title,
            message,
            priority,
            type,
            status,
            related_entity_type,
            related_entity_id,
            assigned_to,
            due_date
        ) VALUES
        (
            (SELECT organization_id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            'SOC 2 Assessment Deadline Approaching',
            'The SOC 2 Type II assessment is due for completion in 30 days. Several findings are still open and require immediate attention.',
            'high',
            'assessment-due',
            'active',
            'assessment',
            (SELECT id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            (SELECT id FROM auth.users LIMIT 1),
            '2024-10-31'
        ),
        (
            (SELECT organization_id FROM compliance_findings WHERE title LIKE '%System Monitoring%' LIMIT 1),
            'High-Risk Finding Overdue',
            'The system monitoring finding has exceeded its due date and requires immediate remediation to maintain compliance.',
            'critical',
            'overdue-task',
            'active',
            'finding',
            (SELECT id FROM compliance_findings WHERE title LIKE '%System Monitoring%' LIMIT 1),
            (SELECT id FROM auth.users LIMIT 1),
            '2024-09-30'
        );

        -- Sample activity log entries
        INSERT INTO compliance_activity_log (
            organization_id,
            user_id,
            action_type,
            action,
            entity_type,
            entity_id,
            title,
            description
        ) VALUES
        (
            (SELECT organization_id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            (SELECT id FROM auth.users LIMIT 1),
            'assessment',
            'created',
            'compliance_assessment',
            (SELECT id FROM compliance_assessments WHERE name LIKE '%SOC 2%' LIMIT 1),
            'Annual SOC 2 Type II Assessment 2024',
            'Created new SOC 2 assessment for annual compliance review'
        ),
        (
            (SELECT organization_id FROM compliance_findings WHERE title LIKE '%System Monitoring%' LIMIT 1),
            (SELECT id FROM auth.users LIMIT 1),
            'finding',
            'created',
            'compliance_finding',
            (SELECT id FROM compliance_findings WHERE title LIKE '%System Monitoring%' LIMIT 1),
            'Insufficient System Monitoring',
            'Identified system monitoring gaps during SOC 2 assessment'
        ),
        (
            (SELECT organization_id FROM remediation_plans WHERE title LIKE '%Centralized Logging%' LIMIT 1),
            (SELECT id FROM auth.users LIMIT 1),
            'remediation',
            'progress_updated',
            'remediation_plan',
            (SELECT id FROM remediation_plans WHERE title LIKE '%Centralized Logging%' LIMIT 1),
            'Implement Centralized Logging Solution',
            'Updated progress to 35% - logging infrastructure installation in progress'
        );
        
        RAISE NOTICE 'Sample compliance data created successfully';
        
    ELSE
        RAISE NOTICE 'Skipping sample data creation - no auth users or organizations found';
    END IF;
END $$;