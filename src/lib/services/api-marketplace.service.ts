/**
 * API Marketplace Service
 * Third-party extension ecosystem with developer portal and revenue sharing
 */

import { IntegrationHubService, MarketplaceExtension, PricingModel, ExtensionManifest } from './integration-hub.service';
import { EventEmitter } from 'events';
import { z } from 'zod';

// Enhanced Marketplace Types
export interface DeveloperAccount {
  id: string;
  username: string;
  email: string;
  companyName?: string;
  profileImage?: string;
  bio?: string;
  website?: string;
  githubProfile?: string;
  linkedinProfile?: string;
  status: DeveloperStatus;
  verificationLevel: VerificationLevel;
  createdAt: Date;
  lastLoginAt?: Date;
  extensions: string[];
  earnings: DeveloperEarnings;
  preferences: DeveloperPreferences;
}

export type DeveloperStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'INACTIVE';
export type VerificationLevel = 'UNVERIFIED' | 'EMAIL_VERIFIED' | 'IDENTITY_VERIFIED' | 'PARTNER';

export interface DeveloperEarnings {
  totalEarned: number;
  currentMonthEarning: number;
  lastMonthEarning: number;
  pendingPayouts: number;
  currency: string;
  paymentMethod: PaymentMethod;
}

export interface PaymentMethod {
  type: 'PAYPAL' | 'STRIPE' | 'WIRE_TRANSFER' | 'CRYPTOCURRENCY';
  details: Record<string, string>;
  verified: boolean;
}

export interface DeveloperPreferences {
  emailNotifications: boolean;
  marketingEmails: boolean;
  reviewNotifications: boolean;
  paymentNotifications: boolean;
  publicProfile: boolean;
  language: string;
  timezone: string;
}

export interface ExtensionVersion {
  version: string;
  releaseDate: Date;
  changelog: string;
  downloadUrl: string;
  fileHash: string;
  size: number; // bytes
  status: VersionStatus;
  compatibility: CompatibilityInfo[];
  securityScan: SecurityScanResult;
}

export type VersionStatus = 'DRAFT' | 'REVIEW_PENDING' | 'APPROVED' | 'REJECTED' | 'DEPRECATED';

export interface CompatibilityInfo {
  platform: string;
  minVersion: string;
  maxVersion?: string;
  tested: boolean;
}

export interface SecurityScanResult {
  status: 'PASSED' | 'FAILED' | 'WARNING';
  scanDate: Date;
  vulnerabilities: SecurityVulnerability[];
  score: number; // 0-100
}

export interface SecurityVulnerability {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  description: string;
  location?: string;
  cve?: string;
}

export interface ExtensionReview {
  id: string;
  extensionId: string;
  userId: string;
  username: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  helpful: number;
  notHelpful: number;
  createdAt: Date;
  updatedAt?: Date;
  verified: boolean; // Verified purchase
  response?: DeveloperResponse;
}

export interface DeveloperResponse {
  message: string;
  respondedAt: Date;
  developerId: string;
}

export interface MarketplaceAnalytics {
  extensionId: string;
  downloads: DownloadMetrics;
  ratings: RatingMetrics;
  revenue: RevenueMetrics;
  engagement: EngagementMetrics;
  demographics: DemographicsData;
}

export interface DownloadMetrics {
  total: number;
  thisMonth: number;
  lastMonth: number;
  dailyTrend: DailyMetric[];
  byVersion: VersionMetric[];
  byCountry: CountryMetric[];
}

export interface DailyMetric {
  date: string;
  value: number;
}

export interface VersionMetric {
  version: string;
  downloads: number;
  percentage: number;
}

export interface CountryMetric {
  country: string;
  downloads: number;
  percentage: number;
}

export interface RatingMetrics {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [rating: number]: number };
  recentTrend: DailyMetric[];
}

export interface RevenueMetrics {
  totalRevenue: number;
  thisMonth: number;
  lastMonth: number;
  dailyTrend: DailyMetric[];
  subscriptionRevenue: number;
  oneTimeRevenue: number;
}

export interface EngagementMetrics {
  activeUsers: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  retentionRate: number;
}

export interface DemographicsData {
  userTypes: { type: string; count: number }[];
  industries: { industry: string; count: number }[];
  companySizes: { size: string; count: number }[];
}

export interface APIKey {
  id: string;
  name: string;
  keyValue: string;
  developerId: string;
  permissions: APIPermission[];
  rateLimits: RateLimitConfig;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  expiresAt?: Date;
  lastUsed?: Date;
  usageStats: APIUsageStats;
  createdAt: Date;
}

export interface APIPermission {
  resource: string;
  actions: string[];
  scopes?: string[];
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface APIUsageStats {
  totalRequests: number;
  thisMonth: number;
  lastMonth: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  parentId?: string;
  extensionCount: number;
  trending: boolean;
  featured: boolean;
}

export interface MarketplaceCuration {
  featuredExtensions: string[];
  trendingExtensions: string[];
  newExtensions: string[];
  topRated: string[];
  editorsChoice: string[];
  categoryHighlights: { categoryId: string; extensionIds: string[] }[];
}

// Validation Schemas
const ExtensionSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.enum(['INTEGRATION', 'ANALYTICS', 'COMPLIANCE', 'WORKFLOW', 'REPORTING', 'SECURITY']),
  pricing: z.object({
    type: z.enum(['FREE', 'PAID', 'SUBSCRIPTION', 'USAGE_BASED']),
    price: z.number().optional(),
    currency: z.string().optional(),
  }),
});

const DeveloperSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  companyName: z.string().max(100).optional(),
});

// API Marketplace Service
export class APIMarketplaceService extends EventEmitter {
  private hub: IntegrationHubService;
  private developers: Map<string, DeveloperAccount> = new Map();
  private extensions: Map<string, MarketplaceExtension> = new Map();
  private extensionVersions: Map<string, ExtensionVersion[]> = new Map();
  private reviews: Map<string, ExtensionReview[]> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private categories: Map<string, MarketplaceCategory> = new Map();
  private analytics: Map<string, MarketplaceAnalytics> = new Map();
  private curation: MarketplaceCuration;

  constructor(hub: IntegrationHubService) {
    super();
    this.hub = hub;
    this.curation = {
      featuredExtensions: [],
      trendingExtensions: [],
      newExtensions: [],
      topRated: [],
      editorsChoice: [],
      categoryHighlights: [],
    };
    
    this.initializeCategories();
    this.startAnalyticsCollection();
  }

  // Developer Management
  async createDeveloperAccount(data: Omit<DeveloperAccount, 'id' | 'status' | 'createdAt' | 'extensions' | 'earnings' | 'verificationLevel' | 'preferences'>): Promise<string> {
    const validation = DeveloperSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Invalid developer data: ${validation.error.issues.map(i => i.message).join(', ')}`);
    }

    // Check if username/email already exists
    const existingDeveloper = Array.from(this.developers.values())
      .find(dev => dev.username === data.username || dev.email === data.email);
    
    if (existingDeveloper) {
      throw new Error('Username or email already exists');
    }

    const id = this.generateId();
    const developer: DeveloperAccount = {
      ...data,
      id,
      status: 'PENDING_VERIFICATION',
      verificationLevel: 'UNVERIFIED',
      createdAt: new Date(),
      extensions: [],
      earnings: {
        totalEarned: 0,
        currentMonthEarning: 0,
        lastMonthEarning: 0,
        pendingPayouts: 0,
        currency: 'USD',
        paymentMethod: {
          type: 'PAYPAL',
          details: {},
          verified: false,
        },
      },
      preferences: {
        emailNotifications: true,
        marketingEmails: false,
        reviewNotifications: true,
        paymentNotifications: true,
        publicProfile: true,
        language: 'en',
        timezone: 'UTC',
      },
    };

    this.developers.set(id, developer);
    
    // Send verification email
    await this.sendVerificationEmail(developer);
    
    this.emit('developerRegistered', { developerId: id, developer });
    
    return id;
  }

  async verifyDeveloper(developerId: string, verificationToken: string): Promise<void> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    // Verify token (mock implementation)
    if (verificationToken === 'valid-token') {
      developer.status = 'ACTIVE';
      developer.verificationLevel = 'EMAIL_VERIFIED';
      
      this.emit('developerVerified', { developerId });
    } else {
      throw new Error('Invalid verification token');
    }
  }

  async updateDeveloperProfile(developerId: string, updates: Partial<DeveloperAccount>): Promise<void> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    Object.assign(developer, updates);
    
    this.emit('developerUpdated', { developerId, updates });
  }

  // Extension Management
  async publishExtension(developerId: string, extensionData: Omit<MarketplaceExtension, 'id' | 'downloadCount' | 'status' | 'ratings'>): Promise<string> {
    const developer = this.developers.get(developerId);
    if (!developer || developer.status !== 'ACTIVE') {
      throw new Error('Developer account not active');
    }

    const validation = ExtensionSchema.safeParse(extensionData);
    if (!validation.success) {
      throw new Error(`Invalid extension data: ${validation.error.issues.map(i => i.message).join(', ')}`);
    }

    const id = this.generateId();
    const extension: MarketplaceExtension = {
      ...extensionData,
      id,
      publisher: developer.username,
      downloadCount: 0,
      status: 'DRAFT',
      ratings: [],
    };

    // Validate manifest
    await this.validateExtensionManifest(extension.manifest);
    
    // Security scan
    const scanResult = await this.performSecurityScan(extension);
    
    // Create initial version
    const initialVersion: ExtensionVersion = {
      version: extension.version,
      releaseDate: new Date(),
      changelog: 'Initial release',
      downloadUrl: `https://marketplace.example.com/download/${id}`,
      fileHash: this.generateFileHash(),
      size: Math.floor(Math.random() * 1000000) + 100000, // Mock size
      status: scanResult.status === 'PASSED' ? 'REVIEW_PENDING' : 'REJECTED',
      compatibility: [
        { platform: 'web', minVersion: '1.0.0', tested: true },
      ],
      securityScan: scanResult,
    };

    this.extensions.set(id, extension);
    this.extensionVersions.set(id, [initialVersion]);
    this.reviews.set(id, []);
    
    developer.extensions.push(id);

    // Initialize analytics
    this.initializeExtensionAnalytics(id);
    
    this.emit('extensionPublished', { extensionId: id, developerId, extension });
    
    return id;
  }

  async updateExtension(extensionId: string, developerId: string, updates: Partial<MarketplaceExtension>): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error('Extension not found');
    }

    const developer = this.developers.get(developerId);
    if (!developer || extension.publisher !== developer.username) {
      throw new Error('Unauthorized to update this extension');
    }

    Object.assign(extension, updates);
    
    this.emit('extensionUpdated', { extensionId, updates });
  }

  async addExtensionVersion(extensionId: string, developerId: string, versionData: Omit<ExtensionVersion, 'releaseDate' | 'status' | 'securityScan'>): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error('Extension not found');
    }

    const developer = this.developers.get(developerId);
    if (!developer || extension.publisher !== developer.username) {
      throw new Error('Unauthorized to update this extension');
    }

    const versions = this.extensionVersions.get(extensionId) || [];
    
    // Check if version already exists
    if (versions.some(v => v.version === versionData.version)) {
      throw new Error('Version already exists');
    }

    // Security scan
    const scanResult = await this.performSecurityScan(extension);
    
    const newVersion: ExtensionVersion = {
      ...versionData,
      releaseDate: new Date(),
      status: scanResult.status === 'PASSED' ? 'REVIEW_PENDING' : 'REJECTED',
      securityScan: scanResult,
    };

    versions.push(newVersion);
    this.extensionVersions.set(extensionId, versions);
    
    this.emit('extensionVersionAdded', { extensionId, version: newVersion.version });
  }

  async approveExtensionVersion(extensionId: string, version: string): Promise<void> {
    const versions = this.extensionVersions.get(extensionId);
    if (!versions) {
      throw new Error('Extension not found');
    }

    const versionData = versions.find(v => v.version === version);
    if (!versionData) {
      throw new Error('Version not found');
    }

    if (versionData.securityScan.status !== 'PASSED') {
      throw new Error('Cannot approve version with security issues');
    }

    versionData.status = 'APPROVED';
    
    // Update extension status
    const extension = this.extensions.get(extensionId);
    if (extension) {
      extension.status = 'PUBLISHED';
    }
    
    this.emit('extensionVersionApproved', { extensionId, version });
  }

  // Review Management
  async addReview(extensionId: string, userId: string, username: string, reviewData: Omit<ExtensionReview, 'id' | 'extensionId' | 'userId' | 'username' | 'createdAt' | 'helpful' | 'notHelpful' | 'verified'>): Promise<string> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error('Extension not found');
    }

    const reviews = this.reviews.get(extensionId) || [];
    
    // Check if user already reviewed
    const existingReview = reviews.find(r => r.userId === userId);
    if (existingReview) {
      throw new Error('User has already reviewed this extension');
    }

    const reviewId = this.generateId();
    const review: ExtensionReview = {
      id: reviewId,
      extensionId,
      userId,
      username,
      ...reviewData,
      helpful: 0,
      notHelpful: 0,
      createdAt: new Date(),
      verified: await this.isVerifiedPurchase(userId, extensionId),
    };

    reviews.push(review);
    this.reviews.set(extensionId, reviews);
    
    // Update extension ratings
    extension.ratings.push({
      userId,
      score: reviewData.rating,
      comment: reviewData.comment,
      createdAt: new Date(),
    });

    // Update analytics
    await this.updateRatingAnalytics(extensionId);
    
    this.emit('reviewAdded', { extensionId, reviewId, review });
    
    return reviewId;
  }

  async respondToReview(reviewId: string, developerId: string, response: string): Promise<void> {
    let review: ExtensionReview | undefined;
    let extensionId: string | undefined;
    
    // Find the review
    for (const [extId, reviewList] of this.reviews.entries()) {
      const found = reviewList.find(r => r.id === reviewId);
      if (found) {
        review = found;
        extensionId = extId;
        break;
      }
    }

    if (!review || !extensionId) {
      throw new Error('Review not found');
    }

    const extension = this.extensions.get(extensionId);
    const developer = this.developers.get(developerId);
    
    if (!extension || !developer || extension.publisher !== developer.username) {
      throw new Error('Unauthorized to respond to this review');
    }

    review.response = {
      message: response,
      respondedAt: new Date(),
      developerId,
    };
    
    this.emit('reviewResponded', { reviewId, extensionId, response });
  }

  // API Key Management
  async createAPIKey(developerId: string, keyData: Omit<APIKey, 'id' | 'keyValue' | 'status' | 'createdAt' | 'usageStats'>): Promise<string> {
    const developer = this.developers.get(developerId);
    if (!developer || developer.status !== 'ACTIVE') {
      throw new Error('Developer account not active');
    }

    const id = this.generateId();
    const keyValue = this.generateAPIKey();
    
    const apiKey: APIKey = {
      ...keyData,
      id,
      keyValue,
      developerId,
      status: 'ACTIVE',
      createdAt: new Date(),
      usageStats: {
        totalRequests: 0,
        thisMonth: 0,
        lastMonth: 0,
        errorRate: 0,
        averageResponseTime: 0,
      },
    };

    this.apiKeys.set(id, apiKey);
    
    this.emit('apiKeyCreated', { keyId: id, developerId });
    
    return keyValue; // Return the actual key value
  }

  async revokeAPIKey(keyId: string, developerId: string): Promise<void> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    if (apiKey.developerId !== developerId) {
      throw new Error('Unauthorized to revoke this API key');
    }

    apiKey.status = 'REVOKED';
    
    this.emit('apiKeyRevoked', { keyId, developerId });
  }

  // Search and Discovery
  async searchExtensions(query: string, filters?: {
    category?: string;
    pricing?: string;
    rating?: number;
    publisher?: string;
  }): Promise<MarketplaceExtension[]> {
    let results = Array.from(this.extensions.values())
      .filter(ext => ext.status === 'PUBLISHED');

    // Text search
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(ext => 
        ext.name.toLowerCase().includes(searchTerm) ||
        ext.description.toLowerCase().includes(searchTerm) ||
        ext.publisher.toLowerCase().includes(searchTerm)
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter(ext => ext.category === filters.category);
      }
      
      if (filters.pricing) {
        results = results.filter(ext => ext.pricing.type === filters.pricing);
      }
      
      if (filters.rating) {
        results = results.filter(ext => {
          const avgRating = this.calculateAverageRating(ext.ratings);
          return avgRating >= filters.rating!;
        });
      }
      
      if (filters.publisher) {
        results = results.filter(ext => ext.publisher === filters.publisher);
      }
    }

    // Sort by relevance/popularity
    results.sort((a, b) => {
      const aRating = this.calculateAverageRating(a.ratings);
      const bRating = this.calculateAverageRating(b.ratings);
      const aPopularity = a.downloadCount + (aRating * 100);
      const bPopularity = b.downloadCount + (bRating * 100);
      return bPopularity - aPopularity;
    });

    return results;
  }

  async getFeaturedExtensions(): Promise<MarketplaceExtension[]> {
    return this.curation.featuredExtensions
      .map(id => this.extensions.get(id))
      .filter((ext): ext is MarketplaceExtension => ext !== undefined);
  }

  async getTrendingExtensions(): Promise<MarketplaceExtension[]> {
    // Calculate trending based on download velocity
    const extensions = Array.from(this.extensions.values())
      .filter(ext => ext.status === 'PUBLISHED');
    
    const trending = extensions
      .map(ext => {
        const analytics = this.analytics.get(ext.id);
        const recentGrowth = analytics ? 
          analytics.downloads.thisMonth - analytics.downloads.lastMonth : 0;
        return { extension: ext, growth: recentGrowth };
      })
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 10)
      .map(item => item.extension);

    this.curation.trendingExtensions = trending.map(ext => ext.id);
    
    return trending;
  }

  // Analytics
  async getExtensionAnalytics(extensionId: string, developerId: string): Promise<MarketplaceAnalytics | undefined> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error('Extension not found');
    }

    const developer = this.developers.get(developerId);
    if (!developer || extension.publisher !== developer.username) {
      throw new Error('Unauthorized to view analytics');
    }

    return this.analytics.get(extensionId);
  }

  async getDeveloperAnalytics(developerId: string): Promise<{
    totalDownloads: number;
    totalRevenue: number;
    extensionCount: number;
    averageRating: number;
    topExtensions: { name: string; downloads: number }[];
  }> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    const developerExtensions = developer.extensions
      .map(id => this.extensions.get(id))
      .filter((ext): ext is MarketplaceExtension => ext !== undefined);

    const totalDownloads = developerExtensions.reduce((sum, ext) => sum + ext.downloadCount, 0);
    const totalRevenue = developer.earnings.totalEarned;
    const extensionCount = developerExtensions.length;
    
    const allRatings = developerExtensions.flatMap(ext => ext.ratings);
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((sum, rating) => sum + rating.score, 0) / allRatings.length
      : 0;

    const topExtensions = developerExtensions
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 5)
      .map(ext => ({ name: ext.name, downloads: ext.downloadCount }));

    return {
      totalDownloads,
      totalRevenue,
      extensionCount,
      averageRating,
      topExtensions,
    };
  }

  // Installation Management
  async installExtension(extensionId: string, userId: string, organizationId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension || extension.status !== 'PUBLISHED') {
      throw new Error('Extension not available for installation');
    }

    // Check pricing and process payment
    if (extension.pricing.type !== 'FREE') {
      await this.processPayment(extension, userId, organizationId);
    }

    // Install extension
    await this.hub.installExtension(extensionId, organizationId);
    
    // Update analytics
    const analytics = this.analytics.get(extensionId);
    if (analytics) {
      analytics.downloads.total++;
      analytics.downloads.thisMonth++;
    }

    extension.downloadCount++;
    
    // Update developer earnings
    if (extension.pricing.type !== 'FREE') {
      await this.updateDeveloperEarnings(extension);
    }
    
    this.emit('extensionInstalled', { extensionId, userId, organizationId });
  }

  async uninstallExtension(extensionId: string, organizationId: string): Promise<void> {
    // Uninstall through hub
    // Implementation would depend on hub's uninstall method
    
    this.emit('extensionUninstalled', { extensionId, organizationId });
  }

  // Private Helper Methods
  private async validateExtensionManifest(manifest: ExtensionManifest): Promise<void> {
    // Validate manifest structure
    if (!manifest.endpoints || manifest.endpoints.length === 0) {
      throw new Error('Extension manifest must define at least one endpoint');
    }

    // Validate endpoints
    for (const endpoint of manifest.endpoints) {
      if (!endpoint.path || !endpoint.method) {
        throw new Error('Each endpoint must have path and method');
      }
    }

    // Additional validation...
  }

  private async performSecurityScan(extension: MarketplaceExtension): Promise<SecurityScanResult> {
    // Mock security scan - in production, use actual security scanning tools
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Random vulnerability generation for demo
    if (Math.random() < 0.1) { // 10% chance of vulnerability
      vulnerabilities.push({
        severity: 'MEDIUM',
        type: 'Potential XSS',
        description: 'Input validation may be insufficient',
        location: 'endpoint:/api/data',
      });
    }

    const status = vulnerabilities.some(v => v.severity === 'HIGH' || v.severity === 'CRITICAL') ? 'FAILED' : 'PASSED';
    
    return {
      status,
      scanDate: new Date(),
      vulnerabilities,
      score: vulnerabilities.length === 0 ? 100 : Math.max(0, 100 - (vulnerabilities.length * 20)),
    };
  }

  private async sendVerificationEmail(developer: DeveloperAccount): Promise<void> {
    // Mock email sending
    this.emit('verificationEmailSent', { developerId: developer.id, email: developer.email });
  }

  private async isVerifiedPurchase(userId: string, extensionId: string): Promise<boolean> {
    // Check if user has actually purchased/installed the extension
    // Mock implementation
    return Math.random() > 0.5;
  }

  private calculateAverageRating(ratings: any[]): number {
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;
  }

  private async updateRatingAnalytics(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) return;

    const analytics = this.analytics.get(extensionId);
    if (!analytics) return;

    const ratings = extension.ratings;
    analytics.ratings.totalRatings = ratings.length;
    analytics.ratings.averageRating = this.calculateAverageRating(ratings);
    
    // Update rating distribution
    const distribution: { [rating: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = ratings.filter(r => r.score === i).length;
    }
    analytics.ratings.ratingDistribution = distribution;
  }

  private async processPayment(extension: MarketplaceExtension, userId: string, organizationId: string): Promise<void> {
    // Mock payment processing
    const amount = extension.pricing.price || 0;
    
    this.emit('paymentProcessed', {
      extensionId: extension.id,
      userId,
      organizationId,
      amount,
      currency: extension.pricing.currency || 'USD',
    });
  }

  private async updateDeveloperEarnings(extension: MarketplaceExtension): Promise<void> {
    const developer = Array.from(this.developers.values())
      .find(dev => dev.username === extension.publisher);
    
    if (!developer) return;

    const amount = extension.pricing.price || 0;
    const platformFee = amount * 0.3; // 30% platform fee
    const developerEarning = amount - platformFee;

    developer.earnings.currentMonthEarning += developerEarning;
    developer.earnings.totalEarned += developerEarning;
    developer.earnings.pendingPayouts += developerEarning;
  }

  private initializeExtensionAnalytics(extensionId: string): void {
    const analytics: MarketplaceAnalytics = {
      extensionId,
      downloads: {
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
        dailyTrend: [],
        byVersion: [],
        byCountry: [],
      },
      ratings: {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {},
        recentTrend: [],
      },
      revenue: {
        totalRevenue: 0,
        thisMonth: 0,
        lastMonth: 0,
        dailyTrend: [],
        subscriptionRevenue: 0,
        oneTimeRevenue: 0,
      },
      engagement: {
        activeUsers: 0,
        dailyActiveUsers: 0,
        monthlyActiveUsers: 0,
        averageSessionDuration: 0,
        retentionRate: 0,
      },
      demographics: {
        userTypes: [],
        industries: [],
        companySizes: [],
      },
    };

    this.analytics.set(extensionId, analytics);
  }

  private initializeCategories(): void {
    const categories: MarketplaceCategory[] = [
      {
        id: 'integration',
        name: 'Integration',
        description: 'Connect with external systems and APIs',
        icon: 'link',
        extensionCount: 0,
        trending: true,
        featured: true,
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description: 'Data analysis and reporting tools',
        icon: 'chart-bar',
        extensionCount: 0,
        trending: false,
        featured: true,
      },
      {
        id: 'compliance',
        name: 'Compliance',
        description: 'Regulatory compliance and governance tools',
        icon: 'shield-check',
        extensionCount: 0,
        trending: true,
        featured: false,
      },
      {
        id: 'workflow',
        name: 'Workflow',
        description: 'Process automation and workflow tools',
        icon: 'cog',
        extensionCount: 0,
        trending: false,
        featured: true,
      },
      {
        id: 'security',
        name: 'Security',
        description: 'Security and access control extensions',
        icon: 'lock',
        extensionCount: 0,
        trending: true,
        featured: false,
      },
    ];

    categories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  private startAnalyticsCollection(): void {
    // Update analytics periodically
    setInterval(() => {
      this.updateAnalyticsData();
    }, 3600000); // Every hour

    // Monthly rollover
    setInterval(() => {
      this.performMonthlyRollover();
    }, 86400000); // Daily check for month rollover
  }

  private updateAnalyticsData(): void {
    // Update analytics for all extensions
    for (const [extensionId, analytics] of this.analytics.entries()) {
      // Simulate engagement metrics
      analytics.engagement.dailyActiveUsers = Math.floor(Math.random() * 1000);
      analytics.engagement.monthlyActiveUsers = Math.floor(Math.random() * 5000);
      analytics.engagement.averageSessionDuration = Math.floor(Math.random() * 3600); // seconds
      analytics.engagement.retentionRate = Math.random() * 100;
    }
  }

  private performMonthlyRollover(): void {
    const now = new Date();
    if (now.getDate() !== 1) return; // Only on first day of month

    // Rollover download stats
    for (const analytics of this.analytics.values()) {
      analytics.downloads.lastMonth = analytics.downloads.thisMonth;
      analytics.downloads.thisMonth = 0;
      
      analytics.revenue.lastMonth = analytics.revenue.thisMonth;
      analytics.revenue.thisMonth = 0;
    }

    // Rollover developer earnings
    for (const developer of this.developers.values()) {
      developer.earnings.lastMonthEarning = developer.earnings.currentMonthEarning;
      developer.earnings.currentMonthEarning = 0;
    }
  }

  private generateFileHash(): string {
    return 'sha256:' + Math.random().toString(36).substr(2, 64);
  }

  private generateAPIKey(): string {
    return 'mk_' + Math.random().toString(36).substr(2, 32);
  }

  private generateId(): string {
    return `mp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public Query Methods
  getDeveloper(id: string): DeveloperAccount | undefined {
    return this.developers.get(id);
  }

  getExtension(id: string): MarketplaceExtension | undefined {
    return this.extensions.get(id);
  }

  getExtensionVersions(id: string): ExtensionVersion[] {
    return this.extensionVersions.get(id) || [];
  }

  getExtensionReviews(id: string): ExtensionReview[] {
    return this.reviews.get(id) || [];
  }

  getCategories(): MarketplaceCategory[] {
    return Array.from(this.categories.values());
  }

  getCuration(): MarketplaceCuration {
    return this.curation;
  }
}

export default APIMarketplaceService;