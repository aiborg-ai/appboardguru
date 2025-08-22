'use client'

import React, { useState } from 'react'
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  Edit3,
  Save,
  X,
  Calendar,
  Users,
  Award,
  LinkedinIcon
} from 'lucide-react'

interface ProfileField {
  id: string
  label: string
  value: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select'
  options?: string[]
  required?: boolean
  editable?: boolean
}

export function CorporateProfile() {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [profileData, setProfileData] = useState({
    // Personal Information
    fullName: 'John Michael Smith',
    email: 'john.smith@acmecorp.com',
    alternateEmail: 'j.smith@board.acmecorp.com',
    directPhone: '+1 (555) 123-4567',
    mobile: '+1 (555) 987-6543',
    extension: '4567',
    
    // Corporate Information
    employeeId: 'EMP001234',
    badgeNumber: 'B789456',
    title: 'Chief Financial Officer',
    department: 'Executive Leadership',
    costCenter: 'CC-001',
    officeLocation: 'New York HQ - Floor 42',
    manager: 'Jane Doe (CEO)',
    directReports: '12 employees',
    
    // Professional Details
    company: 'Acme Corporation',
    division: 'Corporate Executive',
    tenure: '8 years, 3 months',
    startDate: '2016-03-15',
    biography: 'Experienced financial executive with over 15 years in corporate finance, specializing in strategic planning, mergers & acquisitions, and regulatory compliance.',
    
    // Certifications & Skills
    certifications: 'CPA, CFA, FRM',
    languages: 'English (Native), Spanish (Fluent), French (Conversational)',
    expertise: 'Financial Strategy, Risk Management, Regulatory Compliance, M&A',
    
    // Board & Committee Information
    boardPositions: 'CFO - Acme Corp, Audit Committee Chair - Industry Association',
    committees: 'Audit Committee (Chair), Risk Committee, Compensation Committee',
    
    // External Links
    linkedinProfile: 'https://linkedin.com/in/johnsmith',
  })

  const personalFields: ProfileField[] = [
    { id: 'fullName', label: 'Full Legal Name', value: profileData.fullName, type: 'text', required: true, editable: true },
    { id: 'email', label: 'Primary Email', value: profileData.email, type: 'email', required: true, editable: false },
    { id: 'alternateEmail', label: 'Alternate Email', value: profileData.alternateEmail, type: 'email', editable: true },
    { id: 'directPhone', label: 'Direct Phone', value: profileData.directPhone, type: 'tel', editable: true },
    { id: 'mobile', label: 'Mobile Phone', value: profileData.mobile, type: 'tel', editable: true },
    { id: 'extension', label: 'Extension', value: profileData.extension, type: 'text', editable: true },
  ]

  const corporateFields: ProfileField[] = [
    { id: 'employeeId', label: 'Employee ID', value: profileData.employeeId, type: 'text', editable: false },
    { id: 'badgeNumber', label: 'Badge Number', value: profileData.badgeNumber, type: 'text', editable: false },
    { id: 'title', label: 'Job Title', value: profileData.title, type: 'text', required: true, editable: true },
    { id: 'department', label: 'Department', value: profileData.department, type: 'select', options: ['Executive Leadership', 'Finance', 'Operations', 'Legal', 'HR'], editable: true },
    { id: 'costCenter', label: 'Cost Center', value: profileData.costCenter, type: 'text', editable: false },
    { id: 'officeLocation', label: 'Office Location', value: profileData.officeLocation, type: 'text', editable: true },
    { id: 'manager', label: 'Reports To', value: profileData.manager, type: 'text', editable: false },
    { id: 'directReports', label: 'Direct Reports', value: profileData.directReports, type: 'text', editable: false },
  ]

  const professionalFields: ProfileField[] = [
    { id: 'company', label: 'Company', value: profileData.company, type: 'text', editable: false },
    { id: 'division', label: 'Division', value: profileData.division, type: 'text', editable: true },
    { id: 'tenure', label: 'Tenure', value: profileData.tenure, type: 'text', editable: false },
    { id: 'startDate', label: 'Start Date', value: profileData.startDate, type: 'text', editable: false },
    { id: 'biography', label: 'Professional Biography', value: profileData.biography, type: 'textarea', editable: true },
    { id: 'certifications', label: 'Certifications', value: profileData.certifications, type: 'text', editable: true },
    { id: 'languages', label: 'Languages', value: profileData.languages, type: 'text', editable: true },
    { id: 'expertise', label: 'Areas of Expertise', value: profileData.expertise, type: 'textarea', editable: true },
  ]

  const governanceFields: ProfileField[] = [
    { id: 'boardPositions', label: 'Board Positions', value: profileData.boardPositions, type: 'textarea', editable: true },
    { id: 'committees', label: 'Committees', value: profileData.committees, type: 'textarea', editable: true },
    { id: 'linkedinProfile', label: 'LinkedIn Profile', value: profileData.linkedinProfile, type: 'text', editable: true },
  ]

  const handleEdit = (fieldId: string) => {
    setEditingField(fieldId)
  }

  const handleSave = (fieldId: string, newValue: string) => {
    setProfileData(prev => ({ ...prev, [fieldId]: newValue }))
    setEditingField(null)
  }

  const handleCancel = () => {
    setEditingField(null)
  }

  const ProfileSection = ({ 
    title, 
    fields, 
    icon: Icon 
  }: { 
    title: string
    fields: ProfileField[]
    icon: React.ComponentType<any>
  }) => (
    <div className="bg-white border rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(field => (
            <ProfileFieldComponent
              key={field.id}
              field={field}
              isEditing={editingField === field.id}
              onEdit={() => field.editable && handleEdit(field.id)}
              onSave={(value) => handleSave(field.id, value)}
              onCancel={handleCancel}
            />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <User className="h-10 w-10" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{profileData.fullName}</h2>
            <p className="text-blue-100 text-lg">{profileData.title}</p>
            <p className="text-blue-200">{profileData.company} • {profileData.department}</p>
          </div>
          <div className="text-right">
            <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
              <div className="text-sm text-blue-100">Employee ID</div>
              <div className="font-mono font-medium">{profileData.employeeId}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4 text-center">
          <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{profileData.tenure}</div>
          <div className="text-sm text-gray-600">Tenure</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{profileData.directReports}</div>
          <div className="text-sm text-gray-600">Direct Reports</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">3</div>
          <div className="text-sm text-gray-600">Certifications</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <Briefcase className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">5</div>
          <div className="text-sm text-gray-600">Committees</div>
        </div>
      </div>

      {/* Profile Sections */}
      <ProfileSection 
        title="Personal Information" 
        fields={personalFields} 
        icon={User}
      />
      
      <ProfileSection 
        title="Corporate Information" 
        fields={corporateFields} 
        icon={Building2}
      />
      
      <ProfileSection 
        title="Professional Details" 
        fields={professionalFields} 
        icon={Briefcase}
      />
      
      <ProfileSection 
        title="Governance & Leadership" 
        fields={governanceFields} 
        icon={Users}
      />
    </div>
  )
}

function ProfileFieldComponent({ 
  field, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel 
}: {
  field: ProfileField
  isEditing: boolean
  onEdit: () => void
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const [editValue, setEditValue] = useState(field.value)

  React.useEffect(() => {
    if (isEditing) {
      setEditValue(field.value)
    }
  }, [isEditing, field.value])

  const handleSave = () => {
    onSave(editValue)
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        ) : field.type === 'select' && field.options ? (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {field.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : (
          <input
            type={field.type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Save className="h-3 w-3" />
            <span>Save</span>
          </button>
          <button
            onClick={onCancel}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            <X className="h-3 w-3" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.editable && (
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-700"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className={`text-sm ${field.editable ? 'text-gray-900' : 'text-gray-600'}`}>
        {field.type === 'textarea' ? (
          <div className="whitespace-pre-wrap">{field.value || 'Not provided'}</div>
        ) : field.id === 'linkedinProfile' && field.value ? (
          <a 
            href={field.value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <LinkedinIcon className="h-4 w-4" />
            <span>View Profile</span>
          </a>
        ) : (
          field.value || 'Not provided'
        )}
      </div>
    </div>
  )
}