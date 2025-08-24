'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, FileText, Brain, Users, Lock, BarChart3, CheckCircle, ArrowRight, Menu, X, Upload, AlertCircle } from 'lucide-react'
import { RegistrationModal } from '@/features/shared/forms/RegistrationModal'
import { UploadModal } from '@/features/shared/forms/UploadModal'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const router = useRouter()

  const features = [
    {
      icon: <Shield className="h-8 w-8 text-primary-600" />,
      title: "Enterprise Security",
      description: "Bank-grade encryption, role-based access control, and comprehensive audit trails for complete peace of mind."
    },
    {
      icon: <Brain className="h-8 w-8 text-primary-600" />,
      title: "AI-Powered Analysis",
      description: "Intelligent document summarization with OpenRouter AI integration for efficient board preparation."
    },
    {
      icon: <FileText className="h-8 w-8 text-primary-600" />,
      title: "Smart Document Management",
      description: "Multi-format support with automated processing, watermarking, and secure export capabilities."
    },
    {
      icon: <Users className="h-8 w-8 text-primary-600" />,
      title: "Collaborative Platform",
      description: "Interactive chatbot for board pack analysis and real-time collaboration tools for directors."
    },
    {
      icon: <Lock className="h-8 w-8 text-primary-600" />,
      title: "Compliance Ready",
      description: "Built-in governance features ensuring regulatory compliance and corporate governance best practices."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary-600" />,
      title: "Audit & Reporting",
      description: "Comprehensive audit trails and detailed reporting for transparency and accountability."
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="relative bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <img 
                    src="/boardguru-logo.svg" 
                    alt="BoardGuru" 
                    className="h-8 w-auto"
                  />
                </div>
              </div>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="#features" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Features
                </Link>
                <Link href="#security" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Security
                </Link>
                <Link href="/demo" className="text-orange-600 hover:text-orange-700 px-3 py-2 rounded-md text-sm font-medium transition-colors font-semibold">
                  🚀 Live Demo
                </Link>
                <Link href="/auth/signin" className="btn-ghost px-4 py-2">
                  Sign In
                </Link>
                <button 
                  onClick={() => setIsRegistrationOpen(true)}
                  className="btn-primary px-4 py-2"
                >
                  Request Access
                </button>
              </div>
            </div>
            
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="#features" className="block px-3 py-2 text-gray-600 hover:text-primary-600">Features</Link>
              <Link href="#security" className="block px-3 py-2 text-gray-600 hover:text-primary-600">Security</Link>
              <Link href="/demo" className="block px-3 py-2 text-orange-600 hover:text-orange-700 font-semibold">🚀 Live Demo</Link>
              <Link href="/auth/signin" className="block px-3 py-2 text-gray-600 hover:text-primary-600">Sign In</Link>
              <button 
                onClick={() => setIsRegistrationOpen(true)}
                className="w-full text-left px-3 py-2 text-primary-600 font-medium"
              >
                Request Access
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              The Future of
              <span className="text-primary-600 block">Board Management</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Secure, AI-powered board pack management with intelligent summarization, 
              interactive analysis, and enterprise-grade security for modern board directors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/demo"
                className="btn-primary px-8 py-3 text-lg flex items-center space-x-2"
              >
                <span>🚀 Try Live Demo</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button 
                onClick={() => {
                  setIsUploadModalOpen(true)
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <Upload className="h-5 w-5" />
                <span>Upload Board Pack</span>
              </button>
              <button 
                onClick={() => setIsRegistrationOpen(true)}
                className="btn-secondary px-8 py-3 text-lg"
              >
                Request Full Access
              </button>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-75"></div>
        </div>
      </section>

      {/* Board Pack AI Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Brain className="h-4 w-4" />
              <span>AI-Powered Board Pack Analysis</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Transform Your Board Packs with AI
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Upload your board pack documents and get intelligent summaries, risk assessments, 
              and actionable insights powered by advanced AI technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Upload CTA */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Get Started in Minutes</h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">1</span>
                  </div>
                  <span className="text-gray-700">Upload your board pack (PDF, Word, PowerPoint)</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">2</span>
                  </div>
                  <span className="text-gray-700">AI processes and analyzes your documents</span>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">3</span>
                  </div>
                  <span className="text-gray-700">Get comprehensive insights and summaries</span>
                </li>
              </ul>
              
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Upload className="h-5 w-5" />
                <span>Upload Your Board Pack</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            {/* Right: Features */}
            <div className="grid gap-6">
              <div className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <Brain className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Summarization</h4>
                    <p className="text-gray-600">Automatically extract key insights, decisions, and action items from your board documents.</p>
                  </div>
                </div>
              </div>

              <div className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Risk Analysis</h4>
                    <p className="text-gray-600">Identify potential risks and compliance issues mentioned across all documents.</p>
                  </div>
                </div>
              </div>

              <div className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Interactive Dashboard</h4>
                    <p className="text-gray-600">Visual dashboards with charts, metrics, and actionable insights for better decision-making.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Board Management
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive platform designed for modern board governance with security, efficiency, and intelligence at its core.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24 bg-gradient-to-br from-gray-50 to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Security You Can Trust
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Built with enterprise-grade security from the ground up, ensuring your sensitive board materials are protected with the highest standards.
              </p>
              
              <ul className="space-y-4">
                {[
                  "End-to-end encryption for all documents",
                  "Role-based access control with granular permissions",
                  "Comprehensive audit trails and compliance reporting",
                  "Secure watermarking and export controls",
                  "Multi-factor authentication and SSO integration",
                  "GDPR and SOC 2 compliance ready"
                ].map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-12 lg:mt-0">
              <div className="card p-8 bg-white shadow-xl">
                <div className="text-center">
                  <Shield className="h-16 w-16 text-primary-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise Security</h3>
                  <p className="text-gray-600 mb-6">
                    Bank-grade security infrastructure protecting your most sensitive board materials.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="font-semibold text-green-800">256-bit AES</div>
                      <div className="text-green-600">Encryption</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="font-semibold text-blue-800">SOC 2</div>
                      <div className="text-blue-600">Compliance</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="font-semibold text-purple-800">Zero Trust</div>
                      <div className="text-purple-600">Architecture</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="font-semibold text-orange-800">24/7</div>
                      <div className="text-orange-600">Monitoring</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Board Management?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join leading organizations already using BoardGuru to streamline their board processes with security and intelligence.
          </p>
          <button 
            onClick={() => setIsRegistrationOpen(true)}
            className="bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 rounded-lg text-lg font-semibold transition-colors inline-flex items-center space-x-2"
          >
            <span>Request Access Today</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img 
                src="/boardguru-logo.svg" 
                alt="BoardGuru" 
                className="h-8 w-auto"
              />
            </div>
            <p className="text-gray-400 mb-4">
              Enterprise Board Management Platform
            </p>
            <p className="text-sm text-gray-500">
              © 2024 BoardGuru. All rights reserved. Built with security and compliance in mind.
            </p>
          </div>
        </div>
      </footer>

      {/* Registration Modal */}
      <RegistrationModal 
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
      />

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          setIsUploadModalOpen(false)
          // Navigate to Board Pack AI page
          router.push('/dashboard/board-pack-ai')
        }}
      />
    </div>
  )
}