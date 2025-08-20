'use client'

import React, { useState, useEffect } from 'react'
import { 
  Brain, 
  Key, 
  Globe, 
  Server, 
  Settings as SettingsIcon, 
  Save,
  TestTube,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card } from '@/features/shared/ui/card'
import { Input } from '@/features/shared/ui/input'
import { Select } from '@/features/shared/ui/select'
import { enhancedOpenRouterClient, type AISettings } from '@/lib/api/enhanced-openrouter-client'

const AI_MODELS = [
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Recommended)' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku (Fast)' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'google/gemini-pro', label: 'Google Gemini Pro' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { value: 'microsoft/wizardlm-2-7b', label: 'WizardLM 2 7B' },
]

interface AISettingsPanelProps {
  className?: string
}

export function AISettingsPanel({ className = '' }: AISettingsPanelProps) {
  const [settings, setSettings] = useState<AISettings>({
    model: 'anthropic/claude-3.5-sonnet',
    temperature: 0.7,
    maxTokens: 2000,
    useLocalLLM: false,
    webSearchEnabled: true
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    const currentSettings = enhancedOpenRouterClient.getSettings()
    setSettings(currentSettings)
  }, [])

  const handleSettingChange = (key: keyof AISettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      enhancedOpenRouterClient.updateSettings(settings)
      setIsDirty(false)
      setTestMessage('Settings saved successfully!')
      setTimeout(() => setTestMessage(''), 3000)
    } catch (error) {
      setTestMessage('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMessage('Testing AI connection...')
    
    try {
      const result = await enhancedOpenRouterClient.sendMessage({
        message: 'Hello! Please respond with a brief confirmation.',
        scope: {
          id: 'global',
          type: 'global',
          label: 'Global Knowledge'
        }
      })
      
      if (result.success) {
        setTestStatus('success')
        setTestMessage('AI connection test successful!')
      } else {
        setTestStatus('error')
        setTestMessage(result.error || 'Connection test failed')
      }
    } catch (error) {
      setTestStatus('error')
      setTestMessage('Connection test failed')
    }
    
    setTimeout(() => {
      setTestStatus('idle')
      setTestMessage('')
    }, 5000)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Model Configuration */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Model Configuration</h3>
            <p className="text-sm text-gray-600">Configure your preferred AI model and behavior</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={settings.model}
              onChange={(e) => handleSettingChange('model', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {AI_MODELS.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature ({settings.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens
              </label>
              <select
                value={settings.maxTokens}
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1000}>1,000 tokens</option>
                <option value={2000}>2,000 tokens</option>
                <option value={4000}>4,000 tokens</option>
                <option value={8000}>8,000 tokens</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* API Keys */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
            <p className="text-sm text-gray-600">Configure your AI service API keys</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenRouter API Key
            </label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey || ''}
                onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                placeholder="Enter your OpenRouter API key"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">OpenRouter.ai</a>
            </p>
          </div>

          <Button
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            variant="outline"
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>

          {testMessage && (
            <div className={`flex items-center space-x-2 text-sm ${
              testStatus === 'success' ? 'text-green-600' : 
              testStatus === 'error' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {testStatus === 'success' && <CheckCircle className="h-4 w-4" />}
              {testStatus === 'error' && <AlertCircle className="h-4 w-4" />}
              <span>{testMessage}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Web Search Settings */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Web Search</h3>
            <p className="text-sm text-gray-600">Configure web search capabilities</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable Web Search
              </label>
              <p className="text-xs text-gray-500">
                Allow AI to search the web for current information
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.webSearchEnabled}
                onChange={(e) => handleSettingChange('webSearchEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Local LLM Configuration */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Server className="h-6 w-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Local LLM</h3>
            <p className="text-sm text-gray-600">Connect to a local LLM instance</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Use Local LLM
              </label>
              <p className="text-xs text-gray-500">
                Connect to Ollama, LM Studio, or other local AI models
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.useLocalLLM}
                onChange={(e) => handleSettingChange('useLocalLLM', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {settings.useLocalLLM && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local LLM Endpoint
              </label>
              <Input
                type="url"
                value={settings.localLLMEndpoint || ''}
                onChange={(e) => handleSettingChange('localLLMEndpoint', e.target.value)}
                placeholder="http://localhost:11434/api/generate"
              />
              <p className="text-xs text-gray-500 mt-1">
                Common endpoints: Ollama (http://localhost:11434), LM Studio (http://localhost:1234)
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isLoading}
          className="px-6"
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}