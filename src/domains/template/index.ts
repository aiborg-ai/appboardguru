/**
 * Domain Module Template
 * Copy this template to create new domain modules
 * 
 * Replace 'Template' with your domain name throughout this file
 */

// Types
export * from './types/entity.types'
export * from './types/dto.types'
// export * from './types/api.types'

// Repository
export { TemplateRepository } from './repository/template.repository'

// Service
export { TemplateService } from './services/template.service'

// API Handlers
// export * from './api/handlers'

// React Hooks
// export * from './hooks/useList'
// export * from './hooks/useDetail'
// export * from './hooks/useCreate'
// export * from './hooks/useUpdate'
// export * from './hooks/useDelete'

// Components
// export { TemplateList } from './components/List'
// export { TemplateDetail } from './components/Detail'
// export { TemplateForm } from './components/Form'
// export { TemplateCard } from './components/Card'

// Utils
// export * from './utils/template.utils'

// Domain Module Interface (Template - uncomment when implementing)
/*
export interface TemplateDomainModule {
  // Repository
  repository: typeof import('./repository/template.repository').TemplateRepository
  
  // Service
  service: typeof import('./services/template.service').TemplateService
  
  // API Handlers
  handlers: typeof import('./api/handlers')
  
  // React Hooks
  hooks: {
    useList: typeof import('./hooks/useList').useTemplateList
    useDetail: typeof import('./hooks/useDetail').useTemplateDetail
    useCreate: typeof import('./hooks/useCreate').useCreateTemplate
    useUpdate: typeof import('./hooks/useUpdate').useUpdateTemplate
    useDelete: typeof import('./hooks/useDelete').useDeleteTemplate
  }
  
  // Components
  components: {
    List: typeof import('./components/List').TemplateList
    Detail: typeof import('./components/Detail').TemplateDetail
    Form: typeof import('./components/Form').TemplateForm
    Card: typeof import('./components/Card').TemplateCard
  }
  
  // Types
  types: {
    Entity: import('./types/entity.types').TemplateEntity
    CreateDTO: import('./types/dto.types').CreateTemplateDTO
    UpdateDTO: import('./types/dto.types').UpdateTemplateDTO
    ListFilters: import('./types/dto.types').TemplateListFilters
  }
}

// Export the complete domain module (Template - uncomment when implementing)
export const templateDomain: TemplateDomainModule = {
  repository: require('./repository/template.repository').TemplateRepository,
  service: require('./services/template.service').TemplateService,
  handlers: require('./api/handlers'),
  hooks: {
    useList: require('./hooks/useList').useTemplateList,
    useDetail: require('./hooks/useDetail').useTemplateDetail,
    useCreate: require('./hooks/useCreate').useCreateTemplate,
    useUpdate: require('./hooks/useUpdate').useUpdateTemplate,
    useDelete: require('./hooks/useDelete').useDeleteTemplate,
  },
  components: {
    List: require('./components/List').TemplateList,
    Detail: require('./components/Detail').TemplateDetail,
    Form: require('./components/Form').TemplateForm,
    Card: require('./components/Card').TemplateCard,
  },
  types: {} as any // Types are compile-time only
}
*/