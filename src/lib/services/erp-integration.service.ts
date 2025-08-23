/**
 * ERP Integration Suite
 * Comprehensive ERP system connectors for SAP, Oracle, Microsoft Dynamics
 */

import { IntegrationHubService, IntegrationConfig, DataMapping } from './integration-hub.service';
import { EventEmitter } from 'events';

// ERP System Types
export type ERPSystem = 'SAP' | 'ORACLE' | 'DYNAMICS' | 'NETSUITE' | 'WORKDAY';

export interface ERPConnection {
  id: string;
  system: ERPSystem;
  name: string;
  config: ERPConfig;
  status: ERPConnectionStatus;
  lastSync?: Date;
  syncStats: ERPSyncStats;
  modules: ERPModule[];
}

export type ERPConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SYNCING';

export interface ERPConfig {
  host: string;
  port?: number;
  database?: string;
  username: string;
  password: string;
  clientId?: string;
  apiVersion?: string;
  customFields?: Record<string, any>;
  syncInterval: number;
  batchSize: number;
  timeout: number;
}

export interface ERPSyncStats {
  totalRecords: number;
  lastSyncDuration: number;
  errorCount: number;
  successRate: number;
  avgProcessingTime: number;
}

export interface ERPModule {
  name: string;
  enabled: boolean;
  tables: string[];
  mappings: DataMapping[];
  filters?: ERPFilter[];
}

export interface ERPFilter {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'BETWEEN';
  value: any;
}

// Financial Data Structures
export interface FinancialRecord {
  id: string;
  type: 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';
  amount: number;
  currency: string;
  date: Date;
  description: string;
  accountCode: string;
  costCenter?: string;
  project?: string;
  customFields?: Record<string, any>;
}

export interface BudgetRecord {
  id: string;
  department: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  period: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface ComplianceRecord {
  id: string;
  regulationType: string;
  requirement: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  lastAssessment: Date;
  nextReview: Date;
  responsible: string;
}

// SAP Integration Connector
export class SAPConnector extends EventEmitter {
  private config: ERPConfig;
  private connection: any;
  private isConnected = false;

  constructor(config: ERPConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // SAP RFC connection setup
      this.connection = await this.createSAPConnection();
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  async syncFinancialData(): Promise<FinancialRecord[]> {
    if (!this.isConnected) {
      throw new Error('SAP connection not established');
    }

    try {
      // Query SAP Financial Accounting (FI) module
      const glData = await this.queryGLAccounts();
      const arData = await this.queryAccountsReceivable();
      const apData = await this.queryAccountsPayable();

      const financialRecords = [
        ...this.transformGLData(glData),
        ...this.transformARData(arData),
        ...this.transformAPData(apData),
      ];

      this.emit('dataSynced', { type: 'financial', count: financialRecords.length });
      return financialRecords;
    } catch (error) {
      this.emit('syncError', error);
      throw error;
    }
  }

  async syncBudgetData(): Promise<BudgetRecord[]> {
    if (!this.isConnected) {
      throw new Error('SAP connection not established');
    }

    try {
      // Query SAP Controlling (CO) module
      const budgetData = await this.queryBudgets();
      const actualData = await this.queryActuals();

      const budgetRecords = this.transformBudgetData(budgetData, actualData);
      
      this.emit('dataSynced', { type: 'budget', count: budgetRecords.length });
      return budgetRecords;
    } catch (error) {
      this.emit('syncError', error);
      throw error;
    }
  }

  async syncComplianceData(): Promise<ComplianceRecord[]> {
    if (!this.isConnected) {
      throw new Error('SAP connection not established');
    }

    try {
      // Query SAP GRC (Governance, Risk & Compliance) module
      const complianceData = await this.queryComplianceRecords();
      const riskData = await this.queryRiskAssessments();

      const complianceRecords = this.transformComplianceData(complianceData, riskData);
      
      this.emit('dataSynced', { type: 'compliance', count: complianceRecords.length });
      return complianceRecords;
    } catch (error) {
      this.emit('syncError', error);
      throw error;
    }
  }

  private async createSAPConnection(): Promise<any> {
    // SAP RFC connection implementation
    const sapConfig = {
      dest: this.config.host,
      user: this.config.username,
      passwd: this.config.password,
      client: this.config.clientId || '100',
      sysnr: this.config.port?.toString() || '00',
    };

    // Mock connection - in production, use node-rfc library
    return {
      connect: () => Promise.resolve(),
      close: () => Promise.resolve(),
      invoke: (functionName: string, params: any) => this.mockSAPCall(functionName, params),
    };
  }

  private async queryGLAccounts(): Promise<any[]> {
    return this.connection.invoke('RFC_READ_TABLE', {
      QUERY_TABLE: 'BKPF', // Accounting Document Header
      FIELDS: [
        { FIELDNAME: 'BUKRS' }, // Company Code
        { FIELDNAME: 'BELNR' }, // Document Number
        { FIELDNAME: 'GJAHR' }, // Fiscal Year
        { FIELDNAME: 'WRBTR' }, // Amount
        { FIELDNAME: 'WAERS' }, // Currency
        { FIELDNAME: 'BUDAT' }, // Posting Date
      ],
      OPTIONS: [
        { TEXT: "BUDAT >= '" + this.getDateFilter() + "'" }
      ],
    });
  }

  private async queryAccountsReceivable(): Promise<any[]> {
    return this.connection.invoke('RFC_READ_TABLE', {
      QUERY_TABLE: 'BSID', // Customer Open Items
      FIELDS: [
        { FIELDNAME: 'KUNNR' }, // Customer Number
        { FIELDNAME: 'WRBTR' }, // Amount
        { FIELDNAME: 'WAERS' }, // Currency
        { FIELDNAME: 'ZFBDT' }, // Baseline Payment Date
      ],
    });
  }

  private async queryAccountsPayable(): Promise<any[]> {
    return this.connection.invoke('RFC_READ_TABLE', {
      QUERY_TABLE: 'BSIK', // Vendor Open Items
      FIELDS: [
        { FIELDNAME: 'LIFNR' }, // Vendor Number
        { FIELDNAME: 'WRBTR' }, // Amount
        { FIELDNAME: 'WAERS' }, // Currency
        { FIELDNAME: 'ZFBDT' }, // Baseline Payment Date
      ],
    });
  }

  private async queryBudgets(): Promise<any[]> {
    return this.connection.invoke('RFC_READ_TABLE', {
      QUERY_TABLE: 'COSP', // CO Objects: Line Items (Actual)
      FIELDS: [
        { FIELDNAME: 'OBJNR' }, // Object Number
        { FIELDNAME: 'WRT01' }, // Value 01
        { FIELDNAME: 'WAERS' }, // Currency
        { FIELDNAME: 'GJAHR' }, // Fiscal Year
      ],
    });
  }

  private async queryActuals(): Promise<any[]> {
    return this.connection.invoke('RFC_READ_TABLE', {
      QUERY_TABLE: 'COSS', // CO Objects: Line Items (Plan)
      FIELDS: [
        { FIELDNAME: 'OBJNR' }, // Object Number
        { FIELDNAME: 'WRT01' }, // Value 01
        { FIELDNAME: 'WAERS' }, // Currency
        { FIELDNAME: 'GJAHR' }, // Fiscal Year
      ],
    });
  }

  private async queryComplianceRecords(): Promise<any[]> {
    // Mock compliance data query
    return [];
  }

  private async queryRiskAssessments(): Promise<any[]> {
    // Mock risk assessment query
    return [];
  }

  private transformGLData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `sap-gl-${index}`,
      type: this.determineRecordType(item),
      amount: parseFloat(item.WRBTR || '0'),
      currency: item.WAERS || 'USD',
      date: this.parseSAPDate(item.BUDAT),
      description: `GL Entry ${item.BELNR}`,
      accountCode: item.BUKRS || '',
      customFields: item,
    }));
  }

  private transformARData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `sap-ar-${index}`,
      type: 'ASSET' as const,
      amount: parseFloat(item.WRBTR || '0'),
      currency: item.WAERS || 'USD',
      date: this.parseSAPDate(item.ZFBDT),
      description: `AR Customer ${item.KUNNR}`,
      accountCode: '1200', // Accounts Receivable
      customFields: item,
    }));
  }

  private transformAPData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `sap-ap-${index}`,
      type: 'LIABILITY' as const,
      amount: parseFloat(item.WRBTR || '0'),
      currency: item.WAERS || 'USD',
      date: this.parseSAPDate(item.ZFBDT),
      description: `AP Vendor ${item.LIFNR}`,
      accountCode: '2100', // Accounts Payable
      customFields: item,
    }));
  }

  private transformBudgetData(budgetData: any[], actualData: any[]): BudgetRecord[] {
    // Combine budget and actual data
    const records: BudgetRecord[] = [];
    
    budgetData.forEach((budget, index) => {
      const actual = actualData.find(a => a.OBJNR === budget.OBJNR);
      const budgetedAmount = parseFloat(budget.WRT01 || '0');
      const actualAmount = parseFloat(actual?.WRT01 || '0');
      
      records.push({
        id: `sap-budget-${index}`,
        department: budget.OBJNR || 'Unknown',
        category: 'General',
        budgetedAmount,
        actualAmount,
        variance: actualAmount - budgetedAmount,
        period: budget.GJAHR || new Date().getFullYear().toString(),
        status: 'APPROVED',
      });
    });
    
    return records;
  }

  private transformComplianceData(complianceData: any[], riskData: any[]): ComplianceRecord[] {
    // Transform compliance data - mock implementation
    return [];
  }

  private determineRecordType(item: any): 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY' {
    // Simple logic to determine record type based on amount sign and account
    const amount = parseFloat(item.WRBTR || '0');
    return amount > 0 ? 'REVENUE' : 'EXPENSE';
  }

  private parseSAPDate(sapDate: string): Date {
    if (!sapDate) return new Date();
    
    // SAP date format: YYYYMMDD
    const year = parseInt(sapDate.substr(0, 4));
    const month = parseInt(sapDate.substr(4, 2)) - 1; // Month is 0-indexed
    const day = parseInt(sapDate.substr(6, 2));
    
    return new Date(year, month, day);
  }

  private getDateFilter(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Last month
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  private async mockSAPCall(functionName: string, params: any): Promise<any> {
    // Mock SAP RFC call for development
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (functionName) {
      case 'RFC_READ_TABLE':
        return this.generateMockTableData(params.QUERY_TABLE);
      default:
        return [];
    }
  }

  private generateMockTableData(table: string): any[] {
    // Generate mock data for different SAP tables
    const mockData = [];
    
    for (let i = 0; i < 10; i++) {
      switch (table) {
        case 'BKPF':
          mockData.push({
            BUKRS: '1000',
            BELNR: `${1000000 + i}`,
            GJAHR: '2024',
            WRBTR: (Math.random() * 10000).toFixed(2),
            WAERS: 'USD',
            BUDAT: '20241201',
          });
          break;
        case 'BSID':
          mockData.push({
            KUNNR: `CUST${i.toString().padStart(3, '0')}`,
            WRBTR: (Math.random() * 5000).toFixed(2),
            WAERS: 'USD',
            ZFBDT: '20241201',
          });
          break;
        case 'BSIK':
          mockData.push({
            LIFNR: `VEND${i.toString().padStart(3, '0')}`,
            WRBTR: (Math.random() * 3000).toFixed(2),
            WAERS: 'USD',
            ZFBDT: '20241201',
          });
          break;
        case 'COSP':
        case 'COSS':
          mockData.push({
            OBJNR: `CC${i.toString().padStart(4, '0')}`,
            WRT01: (Math.random() * 50000).toFixed(2),
            WAERS: 'USD',
            GJAHR: '2024',
          });
          break;
      }
    }
    
    return mockData;
  }
}

// Oracle Integration Connector
export class OracleConnector extends EventEmitter {
  private config: ERPConfig;
  private connection: any;
  private isConnected = false;

  constructor(config: ERPConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Oracle database connection
      this.connection = await this.createOracleConnection();
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  async syncFinancialData(): Promise<FinancialRecord[]> {
    if (!this.isConnected) {
      throw new Error('Oracle connection not established');
    }

    try {
      // Query Oracle EBS Financial modules
      const glData = await this.queryOracleGL();
      const arData = await this.queryOracleAR();
      const apData = await this.queryOracleAP();

      const financialRecords = [
        ...this.transformOracleGLData(glData),
        ...this.transformOracleARData(arData),
        ...this.transformOracleAPData(apData),
      ];

      this.emit('dataSynced', { type: 'financial', count: financialRecords.length });
      return financialRecords;
    } catch (error) {
      this.emit('syncError', error);
      throw error;
    }
  }

  private async createOracleConnection(): Promise<any> {
    // Oracle database connection - mock implementation
    return {
      execute: (sql: string, binds?: any[]) => this.mockOracleQuery(sql, binds),
      close: () => Promise.resolve(),
    };
  }

  private async queryOracleGL(): Promise<any[]> {
    const sql = `
      SELECT 
        gjh.je_header_id,
        gjh.je_source,
        gjl.code_combination_id,
        gjl.entered_dr,
        gjl.entered_cr,
        gjh.currency_code,
        gjh.default_effective_date
      FROM 
        gl_je_headers gjh,
        gl_je_lines gjl
      WHERE 
        gjh.je_header_id = gjl.je_header_id
        AND gjh.status = 'P'
        AND gjh.default_effective_date >= TRUNC(SYSDATE - 30)
      ORDER BY gjh.default_effective_date DESC
    `;
    
    return this.connection.execute(sql);
  }

  private async queryOracleAR(): Promise<any[]> {
    const sql = `
      SELECT 
        ct.customer_trx_id,
        ct.trx_number,
        ct.invoice_currency_code,
        ctl.extended_amount,
        ct.trx_date
      FROM 
        ra_customer_trx_all ct,
        ra_customer_trx_lines_all ctl
      WHERE 
        ct.customer_trx_id = ctl.customer_trx_id
        AND ct.complete_flag = 'Y'
        AND ct.trx_date >= TRUNC(SYSDATE - 30)
      ORDER BY ct.trx_date DESC
    `;
    
    return this.connection.execute(sql);
  }

  private async queryOracleAP(): Promise<any[]> {
    const sql = `
      SELECT 
        ai.invoice_id,
        ai.invoice_num,
        ai.invoice_currency_code,
        ai.invoice_amount,
        ai.invoice_date
      FROM 
        ap_invoices_all ai
      WHERE 
        ai.cancelled_date IS NULL
        AND ai.invoice_date >= TRUNC(SYSDATE - 30)
      ORDER BY ai.invoice_date DESC
    `;
    
    return this.connection.execute(sql);
  }

  private transformOracleGLData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `oracle-gl-${index}`,
      type: this.determineOracleRecordType(item),
      amount: parseFloat(item.entered_dr || item.entered_cr || '0'),
      currency: item.currency_code || 'USD',
      date: new Date(item.default_effective_date),
      description: `Oracle GL Entry ${item.je_header_id}`,
      accountCode: item.code_combination_id?.toString() || '',
      customFields: item,
    }));
  }

  private transformOracleARData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `oracle-ar-${index}`,
      type: 'ASSET' as const,
      amount: parseFloat(item.extended_amount || '0'),
      currency: item.invoice_currency_code || 'USD',
      date: new Date(item.trx_date),
      description: `Oracle AR Invoice ${item.trx_number}`,
      accountCode: '1200', // Accounts Receivable
      customFields: item,
    }));
  }

  private transformOracleAPData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `oracle-ap-${index}`,
      type: 'LIABILITY' as const,
      amount: parseFloat(item.invoice_amount || '0'),
      currency: item.invoice_currency_code || 'USD',
      date: new Date(item.invoice_date),
      description: `Oracle AP Invoice ${item.invoice_num}`,
      accountCode: '2100', // Accounts Payable
      customFields: item,
    }));
  }

  private determineOracleRecordType(item: any): 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY' {
    // Determine type based on debit/credit and account structure
    if (item.entered_dr && parseFloat(item.entered_dr) > 0) {
      return 'EXPENSE';
    } else if (item.entered_cr && parseFloat(item.entered_cr) > 0) {
      return 'REVENUE';
    }
    return 'ASSET';
  }

  private async mockOracleQuery(sql: string, binds?: any[]): Promise<any[]> {
    // Mock Oracle query for development
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Generate mock data based on SQL query
    const mockData = [];
    for (let i = 0; i < 5; i++) {
      if (sql.includes('gl_je_headers')) {
        mockData.push({
          je_header_id: 1000 + i,
          je_source: 'Manual',
          code_combination_id: 101 + i,
          entered_dr: Math.random() > 0.5 ? (Math.random() * 5000).toFixed(2) : null,
          entered_cr: Math.random() > 0.5 ? (Math.random() * 5000).toFixed(2) : null,
          currency_code: 'USD',
          default_effective_date: new Date(),
        });
      } else if (sql.includes('ra_customer_trx_all')) {
        mockData.push({
          customer_trx_id: 2000 + i,
          trx_number: `INV-${2000 + i}`,
          invoice_currency_code: 'USD',
          extended_amount: (Math.random() * 8000).toFixed(2),
          trx_date: new Date(),
        });
      } else if (sql.includes('ap_invoices_all')) {
        mockData.push({
          invoice_id: 3000 + i,
          invoice_num: `APINV-${3000 + i}`,
          invoice_currency_code: 'USD',
          invoice_amount: (Math.random() * 6000).toFixed(2),
          invoice_date: new Date(),
        });
      }
    }
    
    return mockData;
  }
}

// Microsoft Dynamics Integration Connector
export class DynamicsConnector extends EventEmitter {
  private config: ERPConfig;
  private accessToken?: string;
  private isConnected = false;

  constructor(config: ERPConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Dynamics 365 OAuth authentication
      this.accessToken = await this.authenticateDynamics();
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
    this.isConnected = false;
    this.emit('disconnected');
  }

  async syncFinancialData(): Promise<FinancialRecord[]> {
    if (!this.isConnected) {
      throw new Error('Dynamics connection not established');
    }

    try {
      // Query Dynamics 365 Finance entities
      const glData = await this.queryDynamicsEntity('generaljournacentries');
      const customerData = await this.queryDynamicsEntity('customers');
      const vendorData = await this.queryDynamicsEntity('vendors');

      const financialRecords = [
        ...this.transformDynamicsGLData(glData),
        ...this.transformDynamicsCustomerData(customerData),
        ...this.transformDynamicsVendorData(vendorData),
      ];

      this.emit('dataSynced', { type: 'financial', count: financialRecords.length });
      return financialRecords;
    } catch (error) {
      this.emit('syncError', error);
      throw error;
    }
  }

  private async authenticateDynamics(): Promise<string> {
    // Mock OAuth authentication for Dynamics 365
    await new Promise(resolve => setTimeout(resolve, 200));
    return 'mock-dynamics-token';
  }

  private async queryDynamicsEntity(entityName: string): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    // Mock Dynamics 365 Web API call
    const url = `${this.config.host}/api/data/v9.2/${entityName}`;
    
    // Mock response data
    return this.generateMockDynamicsData(entityName);
  }

  private transformDynamicsGLData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `dynamics-gl-${index}`,
      type: this.determineDynamicsRecordType(item),
      amount: parseFloat(item.amount || '0'),
      currency: item.currency || 'USD',
      date: new Date(item.postingDate || Date.now()),
      description: item.description || `Dynamics GL Entry`,
      accountCode: item.accountNumber || '',
      customFields: item,
    }));
  }

  private transformDynamicsCustomerData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `dynamics-ar-${index}`,
      type: 'ASSET' as const,
      amount: parseFloat(item.balance || '0'),
      currency: 'USD',
      date: new Date(),
      description: `Customer Balance ${item.name}`,
      accountCode: '1200',
      customFields: item,
    }));
  }

  private transformDynamicsVendorData(data: any[]): FinancialRecord[] {
    return data.map((item, index) => ({
      id: `dynamics-ap-${index}`,
      type: 'LIABILITY' as const,
      amount: parseFloat(item.balance || '0'),
      currency: 'USD',
      date: new Date(),
      description: `Vendor Balance ${item.name}`,
      accountCode: '2100',
      customFields: item,
    }));
  }

  private determineDynamicsRecordType(item: any): 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY' {
    const amount = parseFloat(item.amount || '0');
    return amount > 0 ? 'REVENUE' : 'EXPENSE';
  }

  private generateMockDynamicsData(entityName: string): any[] {
    const mockData = [];
    
    for (let i = 0; i < 8; i++) {
      switch (entityName) {
        case 'generaljournacentries':
          mockData.push({
            id: `${i + 1}`,
            amount: (Math.random() * 7000).toFixed(2),
            currency: 'USD',
            postingDate: new Date().toISOString(),
            description: `GL Entry ${i + 1}`,
            accountNumber: `${4000 + i}`,
          });
          break;
        case 'customers':
          mockData.push({
            id: `${i + 1}`,
            name: `Customer ${i + 1}`,
            balance: (Math.random() * 4000).toFixed(2),
            customerNumber: `CUST${String(i + 1).padStart(3, '0')}`,
          });
          break;
        case 'vendors':
          mockData.push({
            id: `${i + 1}`,
            name: `Vendor ${i + 1}`,
            balance: (Math.random() * 3500).toFixed(2),
            vendorNumber: `VEND${String(i + 1).padStart(3, '0')}`,
          });
          break;
      }
    }
    
    return mockData;
  }
}

// ERP Integration Service
export class ERPIntegrationService extends EventEmitter {
  private hub: IntegrationHubService;
  private connections: Map<string, ERPConnection> = new Map();
  private connectors: Map<string, SAPConnector | OracleConnector | DynamicsConnector> = new Map();

  constructor(hub: IntegrationHubService) {
    super();
    this.hub = hub;
  }

  async createERPConnection(config: Omit<ERPConnection, 'id' | 'status' | 'syncStats'>): Promise<string> {
    const id = this.generateId();
    const connection: ERPConnection = {
      ...config,
      id,
      status: 'DISCONNECTED',
      syncStats: {
        totalRecords: 0,
        lastSyncDuration: 0,
        errorCount: 0,
        successRate: 0,
        avgProcessingTime: 0,
      },
    };

    // Create appropriate connector
    let connector: SAPConnector | OracleConnector | DynamicsConnector;
    
    switch (config.system) {
      case 'SAP':
        connector = new SAPConnector(config.config);
        break;
      case 'ORACLE':
        connector = new OracleConnector(config.config);
        break;
      case 'DYNAMICS':
        connector = new DynamicsConnector(config.config);
        break;
      default:
        throw new Error(`Unsupported ERP system: ${config.system}`);
    }

    // Set up event listeners
    connector.on('connected', () => {
      connection.status = 'CONNECTED';
      this.emit('connectionEstablished', { connectionId: id });
    });

    connector.on('disconnected', () => {
      connection.status = 'DISCONNECTED';
      this.emit('connectionLost', { connectionId: id });
    });

    connector.on('error', (error) => {
      connection.status = 'ERROR';
      connection.syncStats.errorCount++;
      this.emit('connectionError', { connectionId: id, error });
    });

    connector.on('dataSynced', (data) => {
      connection.lastSync = new Date();
      connection.syncStats.totalRecords += data.count;
      this.emit('dataSynchronized', { connectionId: id, data });
    });

    this.connections.set(id, connection);
    this.connectors.set(id, connector);

    return id;
  }

  async connectToERP(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    const connector = this.connectors.get(connectionId);

    if (!connection || !connector) {
      throw new Error(`ERP connection ${connectionId} not found`);
    }

    await connector.connect();
  }

  async disconnectFromERP(connectionId: string): Promise<void> {
    const connector = this.connectors.get(connectionId);
    if (connector) {
      await connector.disconnect();
    }
  }

  async syncERPData(connectionId: string, dataType: 'financial' | 'budget' | 'compliance' = 'financial'): Promise<any[]> {
    const connection = this.connections.get(connectionId);
    const connector = this.connectors.get(connectionId);

    if (!connection || !connector) {
      throw new Error(`ERP connection ${connectionId} not found`);
    }

    const startTime = Date.now();
    connection.status = 'SYNCING';

    try {
      let data: any[] = [];

      if (connector instanceof SAPConnector) {
        switch (dataType) {
          case 'financial':
            data = await connector.syncFinancialData();
            break;
          case 'budget':
            data = await connector.syncBudgetData();
            break;
          case 'compliance':
            data = await connector.syncComplianceData();
            break;
        }
      } else if (connector instanceof OracleConnector || connector instanceof DynamicsConnector) {
        data = await connector.syncFinancialData();
      }

      const duration = Date.now() - startTime;
      connection.syncStats.lastSyncDuration = duration;
      connection.syncStats.avgProcessingTime = 
        (connection.syncStats.avgProcessingTime + duration) / 2;
      connection.status = 'CONNECTED';

      return data;
    } catch (error) {
      connection.status = 'ERROR';
      connection.syncStats.errorCount++;
      throw error;
    }
  }

  async startAutoSync(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`ERP connection ${connectionId} not found`);
    }

    // Start periodic sync based on sync interval
    const intervalId = setInterval(async () => {
      try {
        await this.syncERPData(connectionId, 'financial');
      } catch (error) {
        this.emit('autoSyncError', { connectionId, error });
      }
    }, connection.config.syncInterval);

    (connection as any)._autoSyncInterval = intervalId;
  }

  async stopAutoSync(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection && (connection as any)._autoSyncInterval) {
      clearInterval((connection as any)._autoSyncInterval);
      delete (connection as any)._autoSyncInterval;
    }
  }

  getConnection(connectionId: string): ERPConnection | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnections(): ERPConnection[] {
    return Array.from(this.connections.values());
  }

  async testConnection(connectionId: string): Promise<boolean> {
    const connector = this.connectors.get(connectionId);
    if (!connector) {
      throw new Error(`ERP connection ${connectionId} not found`);
    }

    try {
      await connector.connect();
      await connector.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }

  private generateId(): string {
    return `erp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ERPIntegrationService;