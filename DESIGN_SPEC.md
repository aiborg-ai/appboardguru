# 🎨 AppBoardGuru Design Specification

## Executive Summary

This document defines the design patterns, visual standards, and UX principles for AppBoardGuru to ensure consistency across all pages and features. Based on successful patterns from Settings, Create Vault Wizard, Home Page, and Assets Cards, this specification serves as the single source of truth for UI/UX decisions.

---

## 🏗️ Core Design Principles

### 1. Visual Hierarchy
- **Clear navigation structure** with persistent left sidebar
- **Progressive disclosure** using tabs and expandable sections
- **Z-pattern reading flow** for key information
- **F-pattern scanning** for data-heavy interfaces

### 2. Consistency
- **Unified color palette** across all components
- **Standardized spacing** using 4px/8px grid system
- **Consistent iconography** from Lucide React
- **Harmonized typography** with clear hierarchy

### 3. User-Centric
- **Context-aware help** with InfoTooltips
- **Progressive enhancement** for complex workflows
- **Immediate feedback** for all user actions
- **Accessible design** meeting WCAG 2.1 AA standards

---

## 🎨 Visual Design System

### Color Palette

```scss
// Primary Colors
$primary-50: #eff6ff;   // Lightest blue for backgrounds
$primary-100: #dbeafe;  // Light blue for hover states
$primary-200: #bfdbfe;  // Accent backgrounds
$primary-500: #3b82f6;  // Primary links
$primary-600: #2563eb;  // Primary buttons
$primary-700: #1d4ed8;  // Primary hover
$primary-900: #1e3a8a;  // Dark blue for text

// Neutral Colors
$gray-50: #f9fafb;      // Light backgrounds
$gray-100: #f3f4f6;     // Card backgrounds
$gray-200: #e5e7eb;     // Borders
$gray-500: #6b7280;     // Secondary text
$gray-600: #4b5563;     // Primary text
$gray-900: #111827;     // Headers

// Semantic Colors
$success: #10b981;      // Green for success
$warning: #f59e0b;      // Orange for warnings
$error: #ef4444;        // Red for errors
$info: #3b82f6;         // Blue for information
```

### Typography

```scss
// Font Family
$font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

// Font Sizes
$text-xs: 0.75rem;      // 12px - badges, labels
$text-sm: 0.875rem;     // 14px - body text, descriptions
$text-base: 1rem;       // 16px - default text
$text-lg: 1.125rem;     // 18px - subheadings
$text-xl: 1.25rem;      // 20px - section titles
$text-2xl: 1.5rem;      // 24px - page titles
$text-3xl: 1.875rem;    // 30px - main headings

// Font Weights
$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
$font-bold: 700;
```

### Spacing System

```scss
// Base unit: 4px
$spacing-1: 0.25rem;    // 4px
$spacing-2: 0.5rem;     // 8px
$spacing-3: 0.75rem;    // 12px
$spacing-4: 1rem;       // 16px
$spacing-6: 1.5rem;     // 24px
$spacing-8: 2rem;       // 32px
$spacing-12: 3rem;      // 48px
```

### Border Radius

```scss
$rounded-sm: 0.125rem;  // 2px - subtle rounding
$rounded: 0.25rem;      // 4px - small elements
$rounded-md: 0.375rem;  // 6px - buttons, inputs
$rounded-lg: 0.5rem;    // 8px - cards, modals
$rounded-xl: 0.75rem;   // 12px - feature cards
$rounded-full: 9999px;  // Pills, avatars
```

---

## 📐 Layout Patterns

### 1. Dashboard Layout with Dual Navigation

**Used in:** Settings Page

```tsx
<DashboardLayout>
  <div className="p-6">
    {/* Page Header */}
    <div className="flex items-center space-x-3 mb-6">
      <Icon className="h-8 w-8 text-gray-600" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Page Title
          <InfoTooltip content={...} />
        </h1>
        <p className="text-gray-600">Page description</p>
      </div>
    </div>
    
    {/* Dual Navigation Layout */}
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Navigation */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <nav className="space-y-1 p-2">
            {/* Navigation items */}
          </nav>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1">
        {/* Dynamic content */}
      </div>
    </div>
  </div>
</DashboardLayout>
```

**Key Features:**
- Main sidebar remains visible (DashboardLayout)
- Secondary left navigation for page-specific sections
- Responsive breakpoint at `lg` (1024px)
- Clear visual hierarchy with shadows and borders

### 2. Step-by-Step Wizard

**Used in:** Create Vault, Create Meeting

```tsx
<div className="modal-overlay">
  <div className="wizard-container">
    {/* Progress Bar */}
    <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between text-sm text-gray-600">
        <span>Step {currentStep + 1} of {totalSteps}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>
    </div>
    
    {/* Step Indicators */}
    <div className="px-6 py-4 border-b bg-gray-50">
      <div className="flex items-center justify-between">
        {steps.map(step => (
          <StepIndicator 
            key={step.id}
            active={step.id === currentStep}
            completed={step.completed}
          />
        ))}
      </div>
    </div>
    
    {/* Step Content */}
    <div className="flex-1 overflow-y-auto p-6">
      <AnimatePresence mode="wait">
        {/* Dynamic step content */}
      </AnimatePresence>
    </div>
    
    {/* Navigation Footer */}
    <div className="border-t bg-gray-50 px-6 py-4">
      <div className="flex items-center justify-between">
        <Button onClick={goToPrevious}>Previous</Button>
        <Button onClick={goToNext}>Next</Button>
      </div>
    </div>
  </div>
</div>
```

**Key Features:**
- Visual progress indicator
- Step status (pending/active/completed)
- Animated transitions between steps
- Clear navigation controls
- Validation before proceeding

### 3. Clean Navigation Header

**Used in:** Home Page

```tsx
<nav className="relative bg-white/80 backdrop-blur-md border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      {/* Logo */}
      <div className="flex items-center">
        <img src="/logo.svg" className="h-8 w-auto" />
      </div>
      
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <div className="ml-10 flex items-baseline space-x-4">
          <Link className="text-gray-600 hover:text-primary-600">Features</Link>
          <Link className="btn-ghost px-4 py-2">Sign In</Link>
          <Button className="btn-primary px-4 py-2">CTA</Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className="md:hidden">
        <MobileMenuButton />
      </div>
    </div>
  </div>
</nav>
```

**Key Features:**
- Transparent/blur background effect
- Responsive with mobile menu
- Clear CTA hierarchy
- Sticky positioning available
- Max-width container for large screens

### 4. Card Grid Layout

**Used in:** Assets, Meetings Cards View

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id} className="group hover:shadow-lg transition-all duration-200">
      {/* Thumbnail/Preview */}
      <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-t-lg">
        <img src={item.thumbnail} className="object-cover" />
      </div>
      
      {/* Card Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{item.date}</span>
          <Badge>{item.category}</Badge>
        </div>
        
        {/* Action Buttons (appear on hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
          <div className="flex gap-2">
            <Button size="sm">View</Button>
            <Button size="sm" variant="ghost">Share</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

**Key Features:**
- Responsive grid with breakpoints
- Hover effects for interactivity
- Consistent card dimensions
- Progressive disclosure of actions
- Visual hierarchy with typography

---

## 🧩 Component Standards

### Buttons

```tsx
// Primary Button
<Button className="btn-primary px-4 py-2">
  Primary Action
</Button>

// Secondary Button
<Button variant="outline" className="px-4 py-2">
  Secondary Action
</Button>

// Ghost Button
<Button variant="ghost" className="px-4 py-2">
  Tertiary Action
</Button>

// Icon Button
<Button variant="ghost" size="sm">
  <Icon className="h-4 w-4" />
</Button>

// Loading Button
<Button disabled className="px-4 py-2">
  <Loader2 className="h-4 w-4 animate-spin mr-2" />
  Loading...
</Button>
```

### Form Inputs

```tsx
// Text Input
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Label
  </label>
  <input 
    type="text"
    className="input w-full"
    placeholder="Placeholder text"
  />
  <p className="text-xs text-gray-500 mt-1">Helper text</p>
</div>

// Select Dropdown
<select className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option value="">Select option</option>
</select>

// Search Input
<SearchInput
  placeholder="Search..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

### Cards

```tsx
// Basic Card
<Card className="bg-white shadow-sm border">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Interactive Card
<Card className="hover:shadow-lg transition-shadow cursor-pointer">
  {/* Content */}
</Card>

// Status Card
<Card className="border-l-4 border-blue-500">
  {/* Content */}
</Card>
```

### Modals

```tsx
// Modal Structure
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
    {/* Header */}
    <div className="border-b px-6 py-4">
      <h2 className="text-xl font-semibold">Modal Title</h2>
    </div>
    
    {/* Content */}
    <div className="p-6">
      {/* Modal content */}
    </div>
    
    {/* Footer */}
    <div className="border-t px-6 py-4 flex justify-end gap-3">
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </div>
  </div>
</div>
```

### Tooltips

```tsx
<InfoTooltip
  content={
    <InfoSection
      title="Feature Name"
      description="Brief description of the feature"
      features={[
        "Key feature 1",
        "Key feature 2"
      ]}
      tips={[
        "Pro tip 1",
        "Pro tip 2"
      ]}
    />
  }
  side="right"
/>
```

---

## 📱 Responsive Design

### Breakpoints

```scss
$breakpoint-sm: 640px;   // Mobile landscape
$breakpoint-md: 768px;   // Tablet
$breakpoint-lg: 1024px;  // Desktop
$breakpoint-xl: 1280px;  // Large desktop
$breakpoint-2xl: 1536px; // Extra large
```

### Mobile-First Approach

```tsx
// Stack on mobile, side-by-side on desktop
<div className="flex flex-col lg:flex-row gap-6">
  {/* Content */}
</div>

// Hide on mobile, show on desktop
<div className="hidden lg:block">
  {/* Desktop only */}
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

---

## 🎯 Interactive States

### Hover States

```scss
// Buttons
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

// Cards
.card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

// Links
.link:hover {
  color: $primary-700;
  text-decoration: underline;
}
```

### Focus States

```scss
// Inputs
.input:focus {
  outline: none;
  ring: 2px solid $primary-500;
  border-color: $primary-500;
}

// Buttons
.btn:focus-visible {
  outline: 2px solid $primary-500;
  outline-offset: 2px;
}
```

### Loading States

```tsx
// Page Loading
<div className="flex items-center justify-center min-h-[400px]">
  <div className="flex flex-col items-center space-y-4">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <p className="text-gray-600">Loading...</p>
  </div>
</div>

// Inline Loading
<span className="inline-flex items-center">
  <Loader2 className="h-4 w-4 animate-spin mr-2" />
  Processing...
</span>
```

### Error States

```tsx
// Error Card
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
  <div className="flex items-start space-x-3">
    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
    <div>
      <h4 className="text-sm font-medium text-red-800">Error Title</h4>
      <p className="text-sm text-red-600 mt-1">Error description</p>
    </div>
  </div>
</div>

// Input Error
<input className="input border-red-500" />
<p className="text-red-600 text-sm mt-1">Error message</p>
```

---

## 🌟 Animation Guidelines

### Transitions

```scss
// Default transition
.transition-default {
  transition: all 0.2s ease;
}

// Smooth hover
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// Page transitions
.page-enter {
  opacity: 0;
  transform: translateY(10px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease;
}
```

### Micro-animations

```tsx
// Button press
<Button className="active:scale-95 transition-transform">
  Click me
</Button>

// Icon rotation
<ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />

// Fade in
<div className="animate-fadeIn">
  Content
</div>
```

---

## 📋 Implementation Checklist

### For New Pages

- [ ] Use DashboardLayout wrapper for authenticated pages
- [ ] Include page header with icon and InfoTooltip
- [ ] Implement responsive design with mobile-first approach
- [ ] Add loading and error states
- [ ] Use consistent spacing and typography
- [ ] Include breadcrumbs for deep navigation
- [ ] Add keyboard navigation support
- [ ] Test on mobile devices

### For New Components

- [ ] Follow naming conventions (PascalCase for components)
- [ ] Use TypeScript interfaces for props
- [ ] Include hover and focus states
- [ ] Add proper ARIA labels
- [ ] Use semantic HTML elements
- [ ] Implement loading states
- [ ] Handle error cases gracefully
- [ ] Document with comments

### For Forms

- [ ] Use consistent input styling
- [ ] Include field labels and helper text
- [ ] Add validation with clear error messages
- [ ] Implement proper tab order
- [ ] Show loading state during submission
- [ ] Display success feedback
- [ ] Handle API errors gracefully

---

## 🚀 Best Practices

### Performance

1. **Lazy load heavy components** using dynamic imports
2. **Optimize images** with next/image
3. **Minimize re-renders** with React.memo
4. **Use virtualization** for long lists
5. **Implement pagination** for data tables

### Accessibility

1. **Use semantic HTML** elements
2. **Include ARIA labels** for interactive elements
3. **Ensure keyboard navigation** works
4. **Maintain color contrast** ratios (4.5:1 minimum)
5. **Add skip navigation** links
6. **Include alt text** for images
7. **Test with screen readers**

### Code Quality

1. **Follow TypeScript** strict mode
2. **Use ESLint** and Prettier
3. **Write unit tests** for components
4. **Document complex logic** with comments
5. **Keep components small** and focused
6. **Extract reusable logic** into hooks
7. **Use consistent naming** conventions

---

## 📚 Component Library

### Core Components
- `DashboardLayout` - Main layout wrapper
- `Card` - Content container
- `Button` - Interactive button
- `Input` - Form input field
- `Select` - Dropdown selection
- `Modal` - Overlay dialog
- `InfoTooltip` - Contextual help
- `Badge` - Status indicator
- `Progress` - Progress bar
- `ViewToggle` - View mode switcher

### Complex Components
- `CreateWizard` - Multi-step form
- `AssetList` - File list/grid view
- `SearchInput` - Search with icon
- `StepIndicator` - Wizard step display
- `NavigationSidebar` - Left navigation

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Aug 2025 | Initial design specification |

---

## 📞 Questions?

For questions about this design specification or implementation guidance, please contact the development team or refer to the component examples in the codebase.

---

*This document is a living specification and will be updated as the design system evolves.*