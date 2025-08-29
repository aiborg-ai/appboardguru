'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Brain, 
  Shield, 
  Users, 
  BarChart3, 
  FileText, 
  Zap, 
  ArrowRight,
  Play,
  CheckCircle,
  Globe,
  Sparkles,
  Clock,
  Award
} from 'lucide-react'

export default function DemoEntryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(3)

  const startDemo = () => {
    setIsLoading(true)
    
    // Set demo mode in localStorage
    localStorage.setItem('boardguru_demo_mode', 'true')
    
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // Redirect to actual dashboard with demo mode active
          router.push('/dashboard?demo=true&tour=true')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Experience document summarization and insights',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      icon: BarChart3,
      title: 'Live Analytics',
      description: 'Interactive dashboards with real-time data',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      icon: Users,
      title: 'Collaboration Tools',
      description: 'See real-time editing and presence',
      color: 'bg-green-100 text-green-700'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Explore compliance and risk features',
      color: 'bg-red-100 text-red-700'
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Process and analyze board packs',
      color: 'bg-yellow-100 text-yellow-700'
    },
    {
      icon: Zap,
      title: 'Workflow Automation',
      description: 'Streamlined approval processes',
      color: 'bg-indigo-100 text-indigo-700'
    }
  ]

  const demoHighlights = [
    'No login or registration required',
    'Full platform access with sample data',
    'Interactive guided tour available',
    'Explore 100+ AI-powered features',
    'See real-time collaboration in action',
    'Test voice commands and natural language search'
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-32 h-32 mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <Brain className="h-16 w-16 text-purple-600 animate-pulse" />
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Preparing Your Demo Experience
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Loading BoardGuru with sample data...
          </p>
          
          <div className="flex items-center justify-center space-x-2">
            <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {countdown}
            </div>
          </div>
          
          <div className="mt-8 space-y-2">
            <div className="flex items-center justify-center text-gray-600">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span>Demo environment initialized</span>
            </div>
            <div className="flex items-center justify-center text-gray-600">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span>Sample data loaded</span>
            </div>
            {countdown < 2 && (
              <div className="flex items-center justify-center text-gray-600 animate-fadeIn">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Starting interactive tour...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-semibold mb-6">
              <Sparkles className="h-4 w-4 mr-2" />
              Interactive Demo - No Login Required
            </div>
            
            {/* Title */}
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Experience BoardGuru
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-2">
                Live Platform Demo
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Explore the full power of our AI-powered board management platform with real features, 
              sample data, and interactive demonstrations. No registration needed.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={startDemo}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-lg text-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Play className="h-6 w-6" />
                <span>Start Interactive Demo</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => router.push('/auth/signin')}
                className="bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200"
              >
                Sign In to Your Account
              </button>
            </div>
            
            {/* Demo Highlights */}
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              {demoHighlights.slice(0, 3).map((highlight, index) => (
                <div key={index} className="flex items-center text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12">
          <div className="w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        </div>
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12">
          <div className="w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            What You'll Experience
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Full access to all platform features with realistic sample data. 
            See how BoardGuru transforms board management.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 border border-gray-100"
            >
              <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Statistics */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">100+</div>
              <div className="text-blue-100">AI Features</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-100">Sample Documents</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">Real-time</div>
              <div className="text-blue-100">Collaboration</div>
            </div>
            <div className="text-white">
              <div className="text-4xl font-bold mb-2">5 min</div>
              <div className="text-blue-100">Guided Tour</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sample Data Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Rich Sample Data Included
              </h3>
              <p className="text-gray-600 mb-6">
                Our demo environment includes comprehensive sample data to showcase every feature:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ul className="space-y-2">
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    3 sample organizations
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    10+ board packs with AI summaries
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    Financial reports & analysis
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    Risk assessments & compliance data
                  </li>
                </ul>
                <ul className="space-y-2">
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    Meeting minutes & recordings
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    ESG metrics & dashboards
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    Board member profiles
                  </li>
                  <li className="flex items-center text-gray-700">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    Analytics & performance data
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer CTA */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Award className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Explore?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            See why leading organizations trust BoardGuru for their board management needs.
          </p>
          <button 
            onClick={startDemo}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-lg text-lg font-semibold transition-all duration-200 inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Play className="h-6 w-6" />
            <span>Launch Demo Now</span>
          </button>
          
          <div className="mt-6 flex items-center justify-center text-gray-500">
            <Clock className="h-5 w-5 mr-2" />
            <span>Takes only 5 minutes • No signup required</span>
          </div>
        </div>
      </div>
    </div>
  )
}