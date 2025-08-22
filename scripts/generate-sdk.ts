#!/usr/bin/env ts-node

/**
 * SDK Generation Script
 * Generates TypeScript/JavaScript SDKs from OpenAPI specifications
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { execSync } from 'child_process'

interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  servers: Array<{
    url: string
    description?: string
  }>
  paths: Record<string, any>
  components?: {
    schemas?: Record<string, any>
    securitySchemes?: Record<string, any>
  }
}

interface SDKConfig {
  packageName: string
  version: string
  description: string
  language: 'typescript' | 'javascript' | 'python' | 'go'
  outputDir: string
  includeTests: boolean
  includeExamples: boolean
}

class SDKGenerator {
  private spec: OpenAPISpec
  private config: SDKConfig

  constructor(spec: OpenAPISpec, config: SDKConfig) {
    this.spec = spec
    this.config = config
  }

  async generate(): Promise<void> {
    console.log(`Generating ${this.config.language} SDK for ${this.spec.info.title}...`)

    // Create output directory
    await fs.mkdir(this.config.outputDir, { recursive: true })

    switch (this.config.language) {
      case 'typescript':
        await this.generateTypeScriptSDK()
        break
      case 'javascript':
        await this.generateJavaScriptSDK()
        break
      case 'python':
        await this.generatePythonSDK()
        break
      case 'go':
        await this.generateGoSDK()
        break
      default:
        throw new Error(`Unsupported language: ${this.config.language}`)
    }

    console.log(`SDK generated successfully in ${this.config.outputDir}`)
  }

  private async generateTypeScriptSDK(): Promise<void> {
    // Generate TypeScript client using OpenAPI Generator
    await this.generateWithOpenAPIGenerator('typescript-fetch')

    // Generate custom wrapper
    await this.generateTypeScriptWrapper()

    // Generate package.json
    await this.generatePackageJson()

    // Generate TypeScript configuration
    await this.generateTsConfig()

    if (this.config.includeTests) {
      await this.generateTypeScriptTests()
    }

    if (this.config.includeExamples) {
      await this.generateTypeScriptExamples()
    }
  }

  private async generateJavaScriptSDK(): Promise<void> {
    // Generate JavaScript client
    await this.generateWithOpenAPIGenerator('javascript')

    // Generate ES6 wrapper
    await this.generateJavaScriptWrapper()

    // Generate package.json
    await this.generatePackageJson()

    if (this.config.includeTests) {
      await this.generateJavaScriptTests()
    }

    if (this.config.includeExamples) {
      await this.generateJavaScriptExamples()
    }
  }

  private async generatePythonSDK(): Promise<void> {
    // Generate Python client
    await this.generateWithOpenAPIGenerator('python')

    // Generate Python wrapper
    await this.generatePythonWrapper()

    // Generate setup.py
    await this.generatePythonSetup()

    if (this.config.includeTests) {
      await this.generatePythonTests()
    }

    if (this.config.includeExamples) {
      await this.generatePythonExamples()
    }
  }

  private async generateGoSDK(): Promise<void> {
    // Generate Go client
    await this.generateWithOpenAPIGenerator('go')

    // Generate Go module files
    await this.generateGoModule()

    if (this.config.includeTests) {
      await this.generateGoTests()
    }

    if (this.config.includeExamples) {
      await this.generateGoExamples()
    }
  }

  private async generateWithOpenAPIGenerator(generator: string): Promise<void> {
    // Save spec to temporary file
    const specPath = path.join(this.config.outputDir, 'openapi.yaml')
    await fs.writeFile(specPath, yaml.dump(this.spec), 'utf8')

    try {
      // Run OpenAPI Generator
      const cmd = [
        'npx',
        '@openapitools/openapi-generator-cli',
        'generate',
        `-i ${specPath}`,
        `-g ${generator}`,
        `-o ${this.config.outputDir}`,
        `--package-name ${this.config.packageName}`,
        '--skip-validate-spec'
      ].join(' ')

      console.log(`Running: ${cmd}`)
      execSync(cmd, { stdio: 'inherit' })

      // Clean up temporary spec file
      await fs.unlink(specPath)
    } catch (error) {
      console.error('OpenAPI Generator failed:', error)
      throw error
    }
  }

  private async generateTypeScriptWrapper(): Promise<void> {
    const wrapperContent = `/**
 * AppBoardGuru API SDK
 * Generated TypeScript client for AppBoardGuru API
 */

import {
  Configuration,
  ConfigurationParameters,
  AuthenticationApi,
  AssetsApi,
  NotificationsApi,
  OrganizationsApi,
  VaultsApi,
  BoardMatesApi,
  CalendarApi,
  VoiceApi,
  ChatApi,
} from './generated'

export interface AppBoardGuruClientConfig extends ConfigurationParameters {
  apiKey?: string
  baseUrl?: string
  version?: 'v1' | 'v2'
}

export class AppBoardGuruClient {
  private configuration: Configuration
  
  // API clients
  public auth: AuthenticationApi
  public assets: AssetsApi
  public notifications: NotificationsApi
  public organizations: OrganizationsApi
  public vaults: VaultsApi
  public boardmates: BoardMatesApi
  public calendar: CalendarApi
  public voice: VoiceApi
  public chat: ChatApi

  constructor(config: AppBoardGuruClientConfig = {}) {
    // Set default configuration
    const defaultConfig: ConfigurationParameters = {
      basePath: config.baseUrl || 'https://api.appboardguru.com/v2',
      apiKey: config.apiKey,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AppBoardGuru-SDK-TS/${this.config.version}',
        ...(config.version && { 'API-Version': config.version })
      }
    }

    this.configuration = new Configuration({ ...defaultConfig, ...config })

    // Initialize API clients
    this.auth = new AuthenticationApi(this.configuration)
    this.assets = new AssetsApi(this.configuration)
    this.notifications = new NotificationsApi(this.configuration)
    this.organizations = new OrganizationsApi(this.configuration)
    this.vaults = new VaultsApi(this.configuration)
    this.boardmates = new BoardMatesApi(this.configuration)
    this.calendar = new CalendarApi(this.configuration)
    this.voice = new VoiceApi(this.configuration)
    this.chat = new ChatApi(this.configuration)
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.configuration = new Configuration({
      ...this.configuration,
      accessToken: token
    })
    
    // Update all API clients
    this.auth = new AuthenticationApi(this.configuration)
    this.assets = new AssetsApi(this.configuration)
    this.notifications = new NotificationsApi(this.configuration)
    this.organizations = new OrganizationsApi(this.configuration)
    this.vaults = new VaultsApi(this.configuration)
    this.boardmates = new BoardMatesApi(this.configuration)
    this.calendar = new CalendarApi(this.configuration)
    this.voice = new VoiceApi(this.configuration)
    this.chat = new ChatApi(this.configuration)
  }

  /**
   * Set API version
   */
  setVersion(version: 'v1' | 'v2'): void {
    const basePath = this.configuration.basePath?.replace(/\\/v[12]$/, '') + '/' + version
    
    this.configuration = new Configuration({
      ...this.configuration,
      basePath,
      headers: {
        ...this.configuration.headers,
        'API-Version': version
      }
    })
  }

  /**
   * Get current configuration
   */
  getConfig(): Configuration {
    return this.configuration
  }
}

// Export everything from generated client
export * from './generated'

// Export main client as default
export default AppBoardGuruClient
`

    await fs.writeFile(
      path.join(this.config.outputDir, 'index.ts'),
      wrapperContent,
      'utf8'
    )
  }

  private async generateJavaScriptWrapper(): Promise<void> {
    const wrapperContent = `/**
 * AppBoardGuru API SDK
 * Generated JavaScript client for AppBoardGuru API
 */

const {
  Configuration,
  AuthenticationApi,
  AssetsApi,
  NotificationsApi,
  OrganizationsApi,
  VaultsApi,
  BoardMatesApi,
  CalendarApi,
  VoiceApi,
  ChatApi,
} = require('./generated')

class AppBoardGuruClient {
  constructor(config = {}) {
    // Set default configuration
    const defaultConfig = {
      basePath: config.baseUrl || 'https://api.appboardguru.com/v2',
      apiKey: config.apiKey,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AppBoardGuru-SDK-JS/${this.constructor.version}',
        ...(config.version && { 'API-Version': config.version })
      }
    }

    this.configuration = new Configuration({ ...defaultConfig, ...config })

    // Initialize API clients
    this.auth = new AuthenticationApi(this.configuration)
    this.assets = new AssetsApi(this.configuration)
    this.notifications = new NotificationsApi(this.configuration)
    this.organizations = new OrganizationsApi(this.configuration)
    this.vaults = new VaultsApi(this.configuration)
    this.boardmates = new BoardMatesApi(this.configuration)
    this.calendar = new CalendarApi(this.configuration)
    this.voice = new VoiceApi(this.configuration)
    this.chat = new ChatApi(this.configuration)
  }

  setAuthToken(token) {
    this.configuration = new Configuration({
      ...this.configuration,
      accessToken: token
    })
    
    // Update all API clients
    this.auth = new AuthenticationApi(this.configuration)
    this.assets = new AssetsApi(this.configuration)
    this.notifications = new NotificationsApi(this.configuration)
    this.organizations = new OrganizationsApi(this.configuration)
    this.vaults = new VaultsApi(this.configuration)
    this.boardmates = new BoardMatesApi(this.configuration)
    this.calendar = new CalendarApi(this.configuration)
    this.voice = new VoiceApi(this.configuration)
    this.chat = new ChatApi(this.configuration)
  }

  setVersion(version) {
    const basePath = this.configuration.basePath.replace(/\\/v[12]$/, '') + '/' + version
    
    this.configuration = new Configuration({
      ...this.configuration,
      basePath,
      headers: {
        ...this.configuration.headers,
        'API-Version': version
      }
    })
  }

  getConfig() {
    return this.configuration
  }
}

AppBoardGuruClient.version = '${this.config.version}'

module.exports = AppBoardGuruClient
module.exports.AppBoardGuruClient = AppBoardGuruClient
module.exports.default = AppBoardGuruClient
`

    await fs.writeFile(
      path.join(this.config.outputDir, 'index.js'),
      wrapperContent,
      'utf8'
    )
  }

  private async generatePythonWrapper(): Promise<void> {
    const wrapperContent = `"""
AppBoardGuru API SDK
Generated Python client for AppBoardGuru API
"""

from typing import Optional, Dict, Any
from .generated import (
    Configuration,
    ApiClient,
    AuthenticationApi,
    AssetsApi,
    NotificationsApi,
    OrganizationsApi,
    VaultsApi,
    BoardMatesApi,
    CalendarApi,
    VoiceApi,
    ChatApi,
)

class AppBoardGuruClient:
    """Main client for AppBoardGuru API"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the AppBoardGuru client
        
        Args:
            config: Dictionary with configuration options:
                - api_key: API key for authentication
                - base_url: Base URL for the API (default: https://api.appboardguru.com/v2)
                - version: API version ('v1' or 'v2')
        """
        config = config or {}
        
        # Set default configuration
        default_config = {
            'host': config.get('base_url', 'https://api.appboardguru.com/v2'),
            'api_key': {'Authorization': f"Bearer {config.get('api_key', '')}"} if config.get('api_key') else {}
        }
        
        self.configuration = Configuration(**default_config)
        self.api_client = ApiClient(self.configuration)
        
        # Set custom headers
        self.api_client.default_headers['Content-Type'] = 'application/json'
        self.api_client.default_headers['User-Agent'] = f'AppBoardGuru-SDK-Python/{self.__class__.__version__}'
        
        if config.get('version'):
            self.api_client.default_headers['API-Version'] = config['version']
        
        # Initialize API clients
        self.auth = AuthenticationApi(self.api_client)
        self.assets = AssetsApi(self.api_client)
        self.notifications = NotificationsApi(self.api_client)
        self.organizations = OrganizationsApi(self.api_client)
        self.vaults = VaultsApi(self.api_client)
        self.boardmates = BoardMatesApi(self.api_client)
        self.calendar = CalendarApi(self.api_client)
        self.voice = VoiceApi(self.api_client)
        self.chat = ChatApi(self.api_client)
    
    def set_auth_token(self, token: str) -> None:
        """Set authentication token"""
        self.configuration.api_key = {'Authorization': f'Bearer {token}'}
        self.api_client = ApiClient(self.configuration)
        self._reinitialize_apis()
    
    def set_version(self, version: str) -> None:
        """Set API version"""
        host = self.configuration.host.rstrip('/v1').rstrip('/v2')
        self.configuration.host = f"{host}/{version}"
        self.api_client.default_headers['API-Version'] = version
    
    def _reinitialize_apis(self) -> None:
        """Reinitialize all API clients with new configuration"""
        self.auth = AuthenticationApi(self.api_client)
        self.assets = AssetsApi(self.api_client)
        self.notifications = NotificationsApi(self.api_client)
        self.organizations = OrganizationsApi(self.api_client)
        self.vaults = VaultsApi(self.api_client)
        self.boardmates = BoardMatesApi(self.api_client)
        self.calendar = CalendarApi(self.api_client)
        self.voice = VoiceApi(self.api_client)
        self.chat = ChatApi(self.api_client)

# Set version
AppBoardGuruClient.__version__ = '${this.config.version}'
`

    await fs.writeFile(
      path.join(this.config.outputDir, '__init__.py'),
      wrapperContent,
      'utf8'
    )
  }

  private async generatePackageJson(): Promise<void> {
    const packageJson = {
      name: this.config.packageName,
      version: this.config.version,
      description: this.config.description,
      main: this.config.language === 'typescript' ? 'dist/index.js' : 'index.js',
      types: this.config.language === 'typescript' ? 'dist/index.d.ts' : undefined,
      scripts: {
        build: this.config.language === 'typescript' ? 'tsc' : undefined,
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        prepare: this.config.language === 'typescript' ? 'npm run build' : undefined
      },
      keywords: [
        'appboardguru',
        'api',
        'sdk',
        'board-management',
        'governance',
        'typescript',
        'javascript'
      ],
      author: 'AppBoardGuru Team',
      license: 'MIT',
      dependencies: this.config.language === 'typescript' ? {
        'node-fetch': '^3.0.0'
      } : {
        'node-fetch': '^3.0.0'
      },
      devDependencies: this.config.language === 'typescript' ? {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0',
        '@types/jest': '^29.0.0',
        'jest': '^29.0.0',
        'ts-jest': '^29.0.0'
      } : {
        '@types/jest': '^29.0.0',
        'jest': '^29.0.0'
      },
      files: this.config.language === 'typescript' ? [
        'dist/**/*',
        'src/**/*'
      ] : [
        '*.js',
        'generated/**/*'
      ],
      repository: {
        type: 'git',
        url: 'https://github.com/appboardguru/sdk-typescript.git'
      },
      bugs: {
        url: 'https://github.com/appboardguru/sdk-typescript/issues'
      },
      homepage: 'https://docs.appboardguru.com/sdk'
    }

    // Remove undefined values
    Object.keys(packageJson).forEach(key => {
      if ((packageJson as any)[key] === undefined) {
        delete (packageJson as any)[key]
      }
    })

    await fs.writeFile(
      path.join(this.config.outputDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf8'
    )
  }

  private async generateTsConfig(): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2018',
        module: 'commonjs',
        lib: ['ES2018'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false,
        noImplicitAny: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        resolveJsonModule: true
      },
      include: [
        'src/**/*',
        'index.ts'
      ],
      exclude: [
        'node_modules',
        'dist',
        '**/*.spec.ts',
        '**/*.test.ts'
      ]
    }

    await fs.writeFile(
      path.join(this.config.outputDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2),
      'utf8'
    )
  }

  private async generatePythonSetup(): Promise<void> {
    const setupPy = `"""
Setup script for AppBoardGuru Python SDK
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="${this.config.packageName}",
    version="${this.config.version}",
    description="${this.config.description}",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="AppBoardGuru Team",
    author_email="sdk@appboardguru.com",
    url="https://github.com/appboardguru/sdk-python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.7",
    install_requires=[
        "urllib3>=1.25.3",
        "python-dateutil",
        "certifi",
        "six>=1.10",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-cov",
            "black",
            "isort",
            "mypy",
        ]
    },
    keywords="appboardguru api sdk board governance management",
    project_urls={
        "Bug Reports": "https://github.com/appboardguru/sdk-python/issues",
        "Source": "https://github.com/appboardguru/sdk-python",
        "Documentation": "https://docs.appboardguru.com/sdk/python",
    },
)
`

    await fs.writeFile(
      path.join(this.config.outputDir, 'setup.py'),
      setupPy,
      'utf8'
    )
  }

  private async generateGoModule(): Promise<void> {
    const goMod = `module github.com/appboardguru/sdk-go

go 1.19

require (
    golang.org/x/oauth2 v0.0.0-20210323180902-22b0adad7558
)
`

    await fs.writeFile(
      path.join(this.config.outputDir, 'go.mod'),
      goMod,
      'utf8'
    )
  }

  private async generateTypeScriptExamples(): Promise<void> {
    const examplesDir = path.join(this.config.outputDir, 'examples')
    await fs.mkdir(examplesDir, { recursive: true })

    const basicExample = `import AppBoardGuruClient from '../index'

async function basicUsage() {
  // Initialize client
  const client = new AppBoardGuruClient({
    apiKey: 'your-api-key-here',
    baseUrl: 'https://api.appboardguru.com/v2'
  })

  try {
    // List assets
    const assets = await client.assets.listAssets()
    console.log('Assets:', assets.data)

    // Get notifications
    const notifications = await client.notifications.listNotifications()
    console.log('Notifications:', notifications.data)

    // Create an organization
    const newOrg = await client.organizations.createOrganization({
      name: 'My Organization',
      description: 'A sample organization'
    })
    console.log('Created organization:', newOrg.data)

  } catch (error) {
    console.error('API Error:', error)
  }
}

basicUsage()
`

    await fs.writeFile(
      path.join(examplesDir, 'basic-usage.ts'),
      basicExample,
      'utf8'
    )

    const authExample = `import AppBoardGuruClient from '../index'

async function authenticationExample() {
  const client = new AppBoardGuruClient()

  try {
    // Request magic link
    await client.auth.requestMagicLink({
      email: 'user@example.com'
    })
    console.log('Magic link sent!')

    // Verify OTP (when received)
    const verification = await client.auth.verifyOtp({
      email: 'user@example.com',
      otpCode: '123456',
      purpose: 'first_login'
    })

    if (verification.data.setupLink) {
      console.log('Password setup required:', verification.data.setupLink)
    }

  } catch (error) {
    console.error('Auth Error:', error)
  }
}

authenticationExample()
`

    await fs.writeFile(
      path.join(examplesDir, 'authentication.ts'),
      authExample,
      'utf8'
    )
  }

  private async generateTypeScriptTests(): Promise<void> {
    const testsDir = path.join(this.config.outputDir, '__tests__')
    await fs.mkdir(testsDir, { recursive: true })

    const clientTest = `import AppBoardGuruClient from '../index'

describe('AppBoardGuruClient', () => {
  let client: AppBoardGuruClient

  beforeEach(() => {
    client = new AppBoardGuruClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api-test.appboardguru.com/v2'
    })
  })

  test('should initialize with default config', () => {
    const defaultClient = new AppBoardGuruClient()
    expect(defaultClient.getConfig().basePath).toBe('https://api.appboardguru.com/v2')
  })

  test('should set auth token', () => {
    const token = 'test-token'
    client.setAuthToken(token)
    expect(client.getConfig().accessToken).toBe(token)
  })

  test('should set API version', () => {
    client.setVersion('v1')
    expect(client.getConfig().basePath).toContain('/v1')
  })

  test('should have all API clients initialized', () => {
    expect(client.auth).toBeDefined()
    expect(client.assets).toBeDefined()
    expect(client.notifications).toBeDefined()
    expect(client.organizations).toBeDefined()
    expect(client.vaults).toBeDefined()
    expect(client.boardmates).toBeDefined()
    expect(client.calendar).toBeDefined()
    expect(client.voice).toBeDefined()
    expect(client.chat).toBeDefined()
  })
})
`

    await fs.writeFile(
      path.join(testsDir, 'client.test.ts'),
      clientTest,
      'utf8'
    )

    // Jest configuration
    const jestConfig = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/__tests__'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest'
      },
      collectCoverageFrom: [
        'index.ts',
        'src/**/*.ts',
        '!src/**/*.d.ts'
      ],
      coverageDirectory: 'coverage',
      coverageReporters: [
        'text',
        'lcov',
        'html'
      ]
    }

    await fs.writeFile(
      path.join(this.config.outputDir, 'jest.config.js'),
      `module.exports = ${JSON.stringify(jestConfig, null, 2)}`,
      'utf8'
    )
  }

  private async generateJavaScriptTests(): Promise<void> {
    // Similar to TypeScript tests but in JavaScript
    const testsDir = path.join(this.config.outputDir, '__tests__')
    await fs.mkdir(testsDir, { recursive: true })

    const clientTest = `const AppBoardGuruClient = require('../index')

describe('AppBoardGuruClient', () => {
  let client

  beforeEach(() => {
    client = new AppBoardGuruClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api-test.appboardguru.com/v2'
    })
  })

  test('should initialize with default config', () => {
    const defaultClient = new AppBoardGuruClient()
    expect(defaultClient.getConfig().basePath).toBe('https://api.appboardguru.com/v2')
  })

  test('should set auth token', () => {
    const token = 'test-token'
    client.setAuthToken(token)
    expect(client.getConfig().accessToken).toBe(token)
  })

  test('should have all API clients initialized', () => {
    expect(client.auth).toBeDefined()
    expect(client.assets).toBeDefined()
    expect(client.notifications).toBeDefined()
    expect(client.organizations).toBeDefined()
    expect(client.vaults).toBeDefined()
    expect(client.boardmates).toBeDefined()
    expect(client.calendar).toBeDefined()
    expect(client.voice).toBeDefined()
    expect(client.chat).toBeDefined()
  })
})
`

    await fs.writeFile(
      path.join(testsDir, 'client.test.js'),
      clientTest,
      'utf8'
    )
  }

  private async generateJavaScriptExamples(): Promise<void> {
    const examplesDir = path.join(this.config.outputDir, 'examples')
    await fs.mkdir(examplesDir, { recursive: true })

    const basicExample = `const AppBoardGuruClient = require('../index')

async function basicUsage() {
  // Initialize client
  const client = new AppBoardGuruClient({
    apiKey: 'your-api-key-here',
    baseUrl: 'https://api.appboardguru.com/v2'
  })

  try {
    // List assets
    const assets = await client.assets.listAssets()
    console.log('Assets:', assets.data)

    // Get notifications
    const notifications = await client.notifications.listNotifications()
    console.log('Notifications:', notifications.data)

  } catch (error) {
    console.error('API Error:', error)
  }
}

basicUsage()
`

    await fs.writeFile(
      path.join(examplesDir, 'basic-usage.js'),
      basicExample,
      'utf8'
    )
  }

  private async generatePythonTests(): Promise<void> {
    const testsDir = path.join(this.config.outputDir, 'tests')
    await fs.mkdir(testsDir, { recursive: true })

    const clientTest = `import unittest
from appboardguru import AppBoardGuruClient

class TestAppBoardGuruClient(unittest.TestCase):
    
    def setUp(self):
        self.client = AppBoardGuruClient({
            'api_key': 'test-api-key',
            'base_url': 'https://api-test.appboardguru.com/v2'
        })
    
    def test_client_initialization(self):
        client = AppBoardGuruClient()
        self.assertEqual(client.configuration.host, 'https://api.appboardguru.com/v2')
    
    def test_set_auth_token(self):
        token = 'test-token'
        self.client.set_auth_token(token)
        self.assertIn('Authorization', self.client.configuration.api_key)
    
    def test_api_clients_initialized(self):
        self.assertIsNotNone(self.client.auth)
        self.assertIsNotNone(self.client.assets)
        self.assertIsNotNone(self.client.notifications)
        self.assertIsNotNone(self.client.organizations)

if __name__ == '__main__':
    unittest.main()
`

    await fs.writeFile(
      path.join(testsDir, 'test_client.py'),
      clientTest,
      'utf8'
    )
  }

  private async generatePythonExamples(): Promise<void> {
    const examplesDir = path.join(this.config.outputDir, 'examples')
    await fs.mkdir(examplesDir, { recursive: true })

    const basicExample = `"""
Basic usage example for AppBoardGuru Python SDK
"""

from appboardguru import AppBoardGuruClient

def basic_usage():
    # Initialize client
    client = AppBoardGuruClient({
        'api_key': 'your-api-key-here',
        'base_url': 'https://api.appboardguru.com/v2'
    })
    
    try:
        # List assets
        assets = client.assets.list_assets()
        print(f"Assets: {assets}")
        
        # Get notifications
        notifications = client.notifications.list_notifications()
        print(f"Notifications: {notifications}")
        
    except Exception as error:
        print(f"API Error: {error}")

if __name__ == "__main__":
    basic_usage()
`

    await fs.writeFile(
      path.join(examplesDir, 'basic_usage.py'),
      basicExample,
      'utf8'
    )
  }

  private async generateGoTests(): Promise<void> {
    const clientTest = `package main

import (
    "testing"
)

func TestClientInitialization(t *testing.T) {
    client := NewAppBoardGuruClient(&Config{
        APIKey:  "test-api-key",
        BaseURL: "https://api-test.appboardguru.com/v2",
    })
    
    if client == nil {
        t.Error("Client should not be nil")
    }
}

func TestSetAuthToken(t *testing.T) {
    client := NewAppBoardGuruClient(&Config{})
    token := "test-token"
    
    client.SetAuthToken(token)
    
    // Add assertions based on your Go client implementation
}
`

    await fs.writeFile(
      path.join(this.config.outputDir, 'client_test.go'),
      clientTest,
      'utf8'
    )
  }

  private async generateGoExamples(): Promise<void> {
    const examplesDir = path.join(this.config.outputDir, 'examples')
    await fs.mkdir(examplesDir, { recursive: true })

    const basicExample = `package main

import (
    "fmt"
    "log"
)

func basicUsage() {
    client := NewAppBoardGuruClient(&Config{
        APIKey:  "your-api-key-here",
        BaseURL: "https://api.appboardguru.com/v2",
    })
    
    // List assets
    assets, err := client.Assets.ListAssets()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Assets: %v\\n", assets)
    
    // Get notifications
    notifications, err := client.Notifications.ListNotifications()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Notifications: %v\\n", notifications)
}

func main() {
    basicUsage()
}
`

    await fs.writeFile(
      path.join(examplesDir, 'basic_usage.go'),
      basicExample,
      'utf8'
    )
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const specFile = args[0] || '../docs/api/openapi.yaml'
  const language = (args[1] as any) || 'typescript'
  const outputDir = args[2] || `./sdk-${language}`

  try {
    // Load OpenAPI specification
    const specContent = await fs.readFile(specFile, 'utf8')
    const spec = yaml.load(specContent) as OpenAPISpec

    // Generate SDK
    const config: SDKConfig = {
      packageName: `@appboardguru/sdk-${language}`,
      version: '1.0.0',
      description: `AppBoardGuru API SDK for ${language}`,
      language: language as any,
      outputDir,
      includeTests: true,
      includeExamples: true
    }

    const generator = new SDKGenerator(spec, config)
    await generator.generate()

    console.log('\\n✅ SDK generation completed successfully!')
    console.log(`📦 Package: ${config.packageName}`)
    console.log(`📁 Output: ${outputDir}`)
    console.log(`🔧 Language: ${language}`)

  } catch (error) {
    console.error('❌ SDK generation failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { SDKGenerator, SDKConfig, OpenAPISpec }