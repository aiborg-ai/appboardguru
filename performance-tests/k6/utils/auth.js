// Authentication utilities for K6 load testing
import http from 'k6/http';
import { check, fail } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const authFailureRate = new Rate('auth_failure_rate');

// Test user pools for different organizations
export const testUsers = {
  admin: [
    { email: 'admin1@test.boardguru.ai', password: 'TestPass123!', role: 'admin', orgId: 'org_1' },
    { email: 'admin2@test.boardguru.ai', password: 'TestPass123!', role: 'admin', orgId: 'org_2' },
    { email: 'admin3@test.boardguru.ai', password: 'TestPass123!', role: 'admin', orgId: 'org_3' }
  ],
  boardMembers: [
    { email: 'member1@test.boardguru.ai', password: 'TestPass123!', role: 'board_member', orgId: 'org_1' },
    { email: 'member2@test.boardguru.ai', password: 'TestPass123!', role: 'board_member', orgId: 'org_1' },
    { email: 'member3@test.boardguru.ai', password: 'TestPass123!', role: 'board_member', orgId: 'org_2' },
    { email: 'member4@test.boardguru.ai', password: 'TestPass123!', role: 'board_member', orgId: 'org_2' },
    { email: 'member5@test.boardguru.ai', password: 'TestPass123!', role: 'board_member', orgId: 'org_3' },
  ],
  observers: [
    { email: 'observer1@test.boardguru.ai', password: 'TestPass123!', role: 'observer', orgId: 'org_1' },
    { email: 'observer2@test.boardguru.ai', password: 'TestPass123!', role: 'observer', orgId: 'org_2' },
    { email: 'observer3@test.boardguru.ai', password: 'TestPass123!', role: 'observer', orgId: 'org_3' },
  ],
  secretaries: [
    { email: 'secretary1@test.boardguru.ai', password: 'TestPass123!', role: 'secretary', orgId: 'org_1' },
    { email: 'secretary2@test.boardguru.ai', password: 'TestPass123!', role: 'secretary', orgId: 'org_2' },
  ]
};

// Get a random user from a specific role
export function getRandomUser(role = 'boardMembers') {
  const users = testUsers[role];
  if (!users || users.length === 0) {
    fail(`No test users found for role: ${role}`);
  }
  return users[Math.floor(Math.random() * users.length)];
}

// Get a user by organization
export function getUserByOrg(orgId, role = 'boardMembers') {
  const users = testUsers[role];
  const orgUsers = users.filter(user => user.orgId === orgId);
  if (orgUsers.length === 0) {
    fail(`No test users found for org: ${orgId} and role: ${role}`);
  }
  return orgUsers[Math.floor(Math.random() * orgUsers.length)];
}

// Authenticate user and return session tokens
export function authenticateUser(baseUrl, user) {
  const loginUrl = `${baseUrl}/api/auth/signin`;
  
  const payload = {
    email: user.email,
    password: user.password
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(loginUrl, JSON.stringify(payload), params);
  
  const isSuccess = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => r.json() && r.json().token !== undefined,
    'login response time < 2s': (r) => r.timings.duration < 2000,
  });

  loginSuccessRate.add(isSuccess);
  authFailureRate.add(!isSuccess);

  if (!isSuccess) {
    console.error(`Login failed for ${user.email}: ${response.status} - ${response.body}`);
    return null;
  }

  const authData = response.json();
  
  return {
    token: authData.token,
    refreshToken: authData.refresh_token,
    user: {
      ...user,
      id: authData.user?.id,
      name: authData.user?.name,
      organizationId: authData.user?.organization_id
    },
    sessionId: authData.session_id,
    expiresAt: authData.expires_at
  };
}

// Refresh authentication token
export function refreshAuth(baseUrl, refreshToken) {
  const refreshUrl = `${baseUrl}/api/auth/refresh`;
  
  const payload = {
    refresh_token: refreshToken
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(refreshUrl, JSON.stringify(payload), params);
  
  const isSuccess = check(response, {
    'refresh status is 200': (r) => r.status === 200,
    'refresh response has token': (r) => r.json() && r.json().token !== undefined,
  });

  if (!isSuccess) {
    return null;
  }

  return response.json();
}

// Get authorization headers for API requests
export function getAuthHeaders(authSession) {
  if (!authSession || !authSession.token) {
    fail('No valid authentication session provided');
  }

  return {
    'Authorization': `Bearer ${authSession.token}`,
    'Content-Type': 'application/json',
    'X-Organization-Id': authSession.user.organizationId || '',
  };
}

// Logout user
export function logoutUser(baseUrl, authSession) {
  const logoutUrl = `${baseUrl}/api/auth/signout`;
  
  const params = {
    headers: getAuthHeaders(authSession),
  };

  const response = http.post(logoutUrl, null, params);
  
  check(response, {
    'logout status is 200': (r) => r.status === 200,
  });

  return response.status === 200;
}

// Create multiple authenticated sessions for load testing
export function createAuthPool(baseUrl, userCount = 10, role = 'boardMembers') {
  const authPool = [];
  
  for (let i = 0; i < userCount; i++) {
    const user = getRandomUser(role);
    const authSession = authenticateUser(baseUrl, user);
    
    if (authSession) {
      authPool.push(authSession);
    }
  }
  
  console.log(`Created auth pool with ${authPool.length} authenticated users`);
  return authPool;
}

// Simulate realistic user distribution across organizations
export function createRealisticAuthPool(baseUrl) {
  const authPool = [];
  
  // Organization 1: 50 users (Large enterprise)
  for (let i = 0; i < 20; i++) {
    const user = getUserByOrg('org_1', 'boardMembers');
    const auth = authenticateUser(baseUrl, user);
    if (auth) authPool.push(auth);
  }
  
  for (let i = 0; i < 15; i++) {
    const user = getUserByOrg('org_1', 'observers');
    const auth = authenticateUser(baseUrl, user);
    if (auth) authPool.push(auth);
  }
  
  // Add admins and secretaries
  const admin1 = getUserByOrg('org_1', 'admin');
  const secretary1 = getUserByOrg('org_1', 'secretaries');
  
  const adminAuth = authenticateUser(baseUrl, admin1);
  const secretaryAuth = authenticateUser(baseUrl, secretary1);
  
  if (adminAuth) authPool.push(adminAuth);
  if (secretaryAuth) authPool.push(secretaryAuth);
  
  return authPool;
}

// Helper to simulate session management
export class AuthSession {
  constructor(baseUrl, user) {
    this.baseUrl = baseUrl;
    this.user = user;
    this.authData = null;
    this.lastActivity = Date.now();
  }
  
  async login() {
    this.authData = authenticateUser(this.baseUrl, this.user);
    this.lastActivity = Date.now();
    return this.authData !== null;
  }
  
  getHeaders() {
    this.lastActivity = Date.now();
    return getAuthHeaders(this.authData);
  }
  
  isExpired() {
    if (!this.authData || !this.authData.expiresAt) {
      return true;
    }
    return new Date(this.authData.expiresAt) < new Date();
  }
  
  needsRefresh() {
    // Refresh if token expires in next 5 minutes
    if (!this.authData || !this.authData.expiresAt) {
      return true;
    }
    const expiresIn = new Date(this.authData.expiresAt) - new Date();
    return expiresIn < 300000; // 5 minutes
  }
  
  async refresh() {
    if (this.authData && this.authData.refreshToken) {
      const refreshed = refreshAuth(this.baseUrl, this.authData.refreshToken);
      if (refreshed) {
        this.authData.token = refreshed.token;
        this.authData.expiresAt = refreshed.expires_at;
        this.lastActivity = Date.now();
        return true;
      }
    }
    return false;
  }
  
  logout() {
    if (this.authData) {
      logoutUser(this.baseUrl, this.authData);
      this.authData = null;
    }
  }
}