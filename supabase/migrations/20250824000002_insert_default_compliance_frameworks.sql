-- Insert default compliance frameworks
-- These are common frameworks that organizations typically need to comply with

INSERT INTO compliance_frameworks (name, version, description, category, regulatory_body, requirements) VALUES
-- SOC 2
(
    'SOC 2 Type II',
    '2017',
    'Service Organization Control 2 focuses on five trust service criteria: security, availability, processing integrity, confidentiality, and privacy.',
    'Security & Privacy',
    'AICPA',
    '[
        {"id": "CC1.1", "title": "Control Environment - Integrity and Ethical Values", "category": "Common Criteria", "description": "The entity demonstrates a commitment to integrity and ethical values."},
        {"id": "CC1.2", "title": "Board Independence and Oversight", "category": "Common Criteria", "description": "The board of directors demonstrates independence from management and exercises oversight."},
        {"id": "CC2.1", "title": "Communication of Information", "category": "Common Criteria", "description": "The entity obtains or generates and uses relevant, quality information."},
        {"id": "CC3.1", "title": "Specify Suitable Objectives", "category": "Common Criteria", "description": "The entity specifies objectives with sufficient clarity."},
        {"id": "CC4.1", "title": "Risk Assessment Process", "category": "Common Criteria", "description": "The entity implements risk assessment processes."},
        {"id": "CC5.1", "title": "Control Activities", "category": "Common Criteria", "description": "The entity selects and develops control activities."},
        {"id": "CC6.1", "title": "Logical and Physical Access Controls", "category": "Common Criteria", "description": "The entity implements logical and physical access controls."},
        {"id": "CC6.2", "title": "System Operations", "category": "Common Criteria", "description": "Prior to issuing system credentials, the entity registers and authorizes new internal and external users."},
        {"id": "CC7.1", "title": "System Monitoring", "category": "Common Criteria", "description": "The entity monitors the system and takes corrective action."},
        {"id": "CC8.1", "title": "Change Management", "category": "Common Criteria", "description": "The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes."}
    ]'::jsonb
),

-- ISO 27001
(
    'ISO 27001:2022',
    '2022',
    'International standard for information security management systems (ISMS). Provides requirements for establishing, implementing, maintaining and continually improving an ISMS.',
    'Information Security',
    'ISO',
    '[
        {"id": "A.5.1", "title": "Information Security Policies", "category": "Organizational Controls", "description": "Information security policy and topic-specific policies shall be defined."},
        {"id": "A.5.2", "title": "Information Security Roles and Responsibilities", "category": "Organizational Controls", "description": "Information security roles and responsibilities shall be defined and allocated."},
        {"id": "A.5.3", "title": "Segregation of Duties", "category": "Organizational Controls", "description": "Conflicting duties and areas of responsibility shall be segregated."},
        {"id": "A.6.1", "title": "Screening", "category": "People Controls", "description": "Background verification checks on all candidates for employment shall be carried out."},
        {"id": "A.6.2", "title": "Terms and Conditions of Employment", "category": "People Controls", "description": "Employment contractual agreements shall state personnel and organizational responsibilities for information security."},
        {"id": "A.8.1", "title": "Asset Management Policy", "category": "Asset Management", "description": "Assets associated with information and information processing facilities shall be identified."},
        {"id": "A.8.2", "title": "Information Classification", "category": "Asset Management", "description": "Information shall be classified according to its importance to the organization."}
    ]'::jsonb
),

-- GDPR
(
    'GDPR',
    '2018',
    'General Data Protection Regulation - EU regulation on data protection and privacy for individuals within the EU and EEA.',
    'Data Protection & Privacy',
    'European Union',
    '[
        {"id": "Art.5", "title": "Principles relating to processing of personal data", "category": "Principles", "description": "Personal data shall be processed lawfully, fairly and transparently."},
        {"id": "Art.6", "title": "Lawfulness of processing", "category": "Legal Basis", "description": "Processing shall be lawful only if one of six legal bases applies."},
        {"id": "Art.7", "title": "Conditions for consent", "category": "Consent", "description": "Where processing is based on consent, the controller shall demonstrate that consent was given."},
        {"id": "Art.25", "title": "Data protection by design and by default", "category": "Technical Measures", "description": "Taking into account state of the art, implement appropriate technical and organizational measures."},
        {"id": "Art.30", "title": "Records of processing activities", "category": "Documentation", "description": "Each controller shall maintain a record of processing activities under its responsibility."},
        {"id": "Art.32", "title": "Security of processing", "category": "Security", "description": "Implement appropriate technical and organizational measures to ensure security."},
        {"id": "Art.33", "title": "Notification of a personal data breach", "category": "Breach Response", "description": "Notify supervisory authority of a breach within 72 hours."},
        {"id": "Art.35", "title": "Data protection impact assessment", "category": "Risk Assessment", "description": "Carry out a DPIA where processing is likely to result in high risk."}
    ]'::jsonb
),

-- PCI DSS
(
    'PCI DSS',
    '4.0',
    'Payment Card Industry Data Security Standard - Security standard for organizations that handle branded credit cards.',
    'Payment Security',
    'PCI Security Standards Council',
    '[
        {"id": "1", "title": "Install and maintain network security controls", "category": "Network Security", "description": "Network security controls protect cardholder data environments."},
        {"id": "2", "title": "Apply secure configurations to all system components", "category": "Configuration Management", "description": "Malicious individuals use vendor default passwords to gain unauthorized access."},
        {"id": "3", "title": "Protect stored cardholder data", "category": "Data Protection", "description": "Protection methods such as encryption, truncation, masking, and hashing are critical components of cardholder data protection."},
        {"id": "4", "title": "Protect cardholder data with strong cryptography during transmission", "category": "Encryption", "description": "Sensitive information must be encrypted during transmission over networks."},
        {"id": "5", "title": "Protect all systems and networks from malicious software", "category": "Anti-malware", "description": "Malicious software can enter the network during many business-approved activities."},
        {"id": "6", "title": "Develop and maintain secure systems and software", "category": "Secure Development", "description": "Security vulnerabilities in systems and software may allow criminals to access cardholder data."},
        {"id": "7", "title": "Restrict access to cardholder data by business need to know", "category": "Access Control", "description": "Systems and processes must be in place to limit access based on need to know."},
        {"id": "8", "title": "Identify users and authenticate access to system components", "category": "Identity Management", "description": "Assigning a unique identification to each person with access ensures accountability."},
        {"id": "9", "title": "Restrict physical access to cardholder data", "category": "Physical Security", "description": "Any physical access to data or systems that house cardholder data provides opportunity for individuals to access devices or data."},
        {"id": "10", "title": "Log and monitor all access to system components and cardholder data", "category": "Monitoring", "description": "Logging mechanisms and the ability to track user activities are critical."},
        {"id": "11", "title": "Test security of systems and networks regularly", "category": "Testing", "description": "Regular testing of security systems and processes is important."},
        {"id": "12", "title": "Support information security with organizational policies and programs", "category": "Policy", "description": "A strong security policy sets the security tone for the organization."}
    ]'::jsonb
),

-- HIPAA
(
    'HIPAA',
    '2013',
    'Health Insurance Portability and Accountability Act - US federal law that provides data privacy and security provisions for safeguarding medical information.',
    'Healthcare Privacy',
    'US Department of Health and Human Services',
    '[
        {"id": "164.308", "title": "Administrative Safeguards", "category": "Administrative", "description": "Assigned security responsibility, workforce training, information access management, and more."},
        {"id": "164.310", "title": "Physical Safeguards", "category": "Physical", "description": "Facility access controls, workstation use, device and media controls."},
        {"id": "164.312", "title": "Technical Safeguards", "category": "Technical", "description": "Access control, audit controls, integrity, person or entity authentication, transmission security."},
        {"id": "164.314", "title": "Organizational Requirements", "category": "Organizational", "description": "Business associate contracts, requirements for group health plans."},
        {"id": "164.316", "title": "Policies and Procedures and Documentation Requirements", "category": "Documentation", "description": "Policies, procedures, and documentation requirements for the Security Rule."}
    ]'::jsonb
),

-- NIST Cybersecurity Framework
(
    'NIST CSF',
    '1.1',
    'National Institute of Standards and Technology Cybersecurity Framework - Voluntary framework consisting of standards, guidelines, and best practices.',
    'Cybersecurity',
    'NIST',
    '[
        {"id": "ID.AM", "title": "Asset Management", "category": "Identify", "description": "Physical devices and systems within the organization are inventoried and managed."},
        {"id": "ID.BE", "title": "Business Environment", "category": "Identify", "description": "The organizations mission, objectives, stakeholders, and activities are understood."},
        {"id": "ID.GV", "title": "Governance", "category": "Identify", "description": "Policies, procedures, and processes to manage and monitor regulatory, legal, risk, environmental, and operational requirements."},
        {"id": "PR.AC", "title": "Identity Management and Access Control", "category": "Protect", "description": "Access to physical and logical assets is limited to authorized users, processes, and devices."},
        {"id": "PR.AT", "title": "Awareness and Training", "category": "Protect", "description": "Personnel and partners are provided cybersecurity awareness education."},
        {"id": "DE.AE", "title": "Anomalies and Events", "category": "Detect", "description": "Anomalous activity is detected and the potential impact is understood."},
        {"id": "DE.CM", "title": "Security Continuous Monitoring", "category": "Detect", "description": "Information systems and assets are monitored to identify cybersecurity events."},
        {"id": "RS.RP", "title": "Response Planning", "category": "Respond", "description": "Response processes and procedures are executed and maintained."},
        {"id": "RS.CO", "title": "Communications", "category": "Respond", "description": "Response activities are coordinated with internal and external stakeholders."},
        {"id": "RC.RP", "title": "Recovery Planning", "category": "Recover", "description": "Recovery processes and procedures are executed and maintained."},
        {"id": "RC.IM", "title": "Improvements", "category": "Recover", "description": "Recovery planning and processes are improved by incorporating lessons learned."}
    ]'::jsonb
);