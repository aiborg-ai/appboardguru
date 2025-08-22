# Atomic Design Components for Meetings

This directory contains a complete atomic design component system for the meetings functionality, providing reusable, composable, and maintainable components.

## Architecture Overview

The atomic design methodology organizes components into five distinct levels:

### 🔬 Atoms (Basic Building Blocks)
Located in `/atoms/`

**VoteIndicator** - Visual vote count display  
- Features: Type-based styling, percentage/count modes, size variants  
- Props: `count`, `total`, `voteType`, `size`, `showPercentage`, `animated`  
- Usage: `<VoteIndicator count={25} total={100} voteType="for" showPercentage />`

**StatusBadge** - Status indicators for resolutions/actionables  
- Features: Consistent styling, icons, interactive behavior  
- Props: `status`, `size`, `showIcon`, `interactive`, `onStatusClick`  
- Usage: `<StatusBadge status="passed" size="md" showIcon />`

**ProgressBar** - Progress visualization with status-based coloring  
- Features: Animated progress, status-based colors, accessibility  
- Props: `value`, `max`, `status`, `showLabel`, `animated`  
- Usage: `<ProgressBar value={75} status="in_progress" showLabel animated />`

**PriorityIndicator** - Priority level display  
- Features: Multiple variants (badge, dot, bar, flag), size options  
- Props: `priority`, `size`, `showLabel`, `variant`  
- Usage: `<PriorityIndicator priority="high" variant="badge" />`

**QuorumMeter** - Voting quorum visualization  
- Features: Quorum tracking, participation metrics, accessibility  
- Props: `current`, `required`, `total`, `showDetails`, `animated`  
- Usage: `<QuorumMeter current={8} required={10} total={15} showDetails />`

### 🧩 Molecules (Simple Combinations)
Located in `/molecules/`

**ResolutionCard** - Individual resolution display  
- Features: Comprehensive resolution info, voting results, compliance indicators  
- Props: `id`, `title`, `description`, `status`, `votingResults`, `actions`  
- Usage: `<ResolutionCard {...resolutionData} canManage={true} />`

**ActionableItem** - Individual actionable display  
- Features: Progress tracking, assignee info, due date indicators  
- Props: `id`, `title`, `status`, `progress`, `assignee`, `viewMode`  
- Usage: `<ActionableItem {...actionableData} viewMode="card" />`

**VotingControls** - Complete voting interface  
- Features: Method selection, vote casting, session management  
- Props: `resolutionId`, `isActive`, `userVote`, `canVote`, `onVote`  
- Usage: `<VotingControls resolutionId="123" isActive canVote onVote={handleVote} />`

**ProgressUpdate** - Interactive progress management  
- Features: Progress editing, quick controls, notes support  
- Props: `value`, `editable`, `onUpdate`, `showControls`, `notes`  
- Usage: `<ProgressUpdate value={60} editable onUpdate={handleUpdate} />`

**AssignmentBadge** - Assignee information display  
- Features: Avatar display, detailed tooltips, reassignment  
- Props: `assignee`, `size`, `showDetails`, `editable`, `onReassign`  
- Usage: `<AssignmentBadge assignee={user} showDetails editable />`

### 🏢 Organisms (Complex Components)
Located in `/organisms/`

**ResolutionList** - Complete resolution management  
- Features: Multiple view modes, filtering, sorting, bulk actions  
- Props: `resolutions`, `selectable`, `sort`, `pagination`, `viewMode`  
- Usage: `<ResolutionList resolutions={data} viewMode="card" selectable />`

**ActionableBoard** - Kanban-style actionable management  
- Features: Drag & drop, status columns, real-time updates  
- Props: `actionables`, `dragEnabled`, `layout`, `columns`  
- Usage: `<ActionableBoard actionables={data} dragEnabled layout="horizontal" />`

**VotingPanel** - Comprehensive voting session management  
- Features: Real-time voting, quorum tracking, session controls  
- Props: `resolution`, `votingState`, `userVoting`, `actions`, `realTime`  
- Usage: `<VotingPanel resolution={data} votingState={state} realTime />`

**ProgressTracker** - Complete progress tracking interface  
- Features: Progress history, status management, detailed tracking  
- Props: `actionable`, `history`, `actions`, `canUpdate`, `showHistory`  
- Usage: `<ProgressTracker actionable={data} showHistory canUpdate />`

## Integration Examples

### Refactored Section Components

**ResolutionsSection.tsx** - Now uses atomic design:
```tsx
import { ResolutionList } from './atomic/organisms'

export function ResolutionsSection({ resolutions, canManage }) {
  const resolutionCards = resolutions.map(resolution => ({
    ...resolution,
    actions: {
      onView: () => viewResolution(resolution),
      onEdit: canManage ? () => editResolution(resolution) : undefined,
      onDelete: canManage ? () => deleteResolution(resolution.id) : undefined
    }
  }))

  return (
    <ResolutionList 
      resolutions={resolutionCards}
      viewMode="card"
      actions={{ onCreate: canManage ? createResolution : undefined }}
    />
  )
}
```

**ActionablesSection.tsx** - Now uses atomic design:
```tsx
import { ActionableBoard } from './atomic/organisms'

export function ActionablesSection({ actionables, canManage }) {
  const groupedActionables = groupByStatus(actionables)

  return (
    <ActionableBoard
      actionables={groupedActionables}
      dragEnabled={canManage}
      actions={{
        onCreate: canManage ? createActionable : undefined,
        onStatusChange: canManage ? updateStatus : undefined
      }}
    />
  )
}
```

## Key Features

### 🎯 Accessibility
- Comprehensive ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support

### 🎨 Design System
- Consistent size variants (`xs`, `sm`, `md`, `lg`, `xl`)
- Unified color schemes and status indicators
- Responsive design patterns
- Animation and interaction states

### 🔧 Developer Experience
- TypeScript generics for reusability
- Comprehensive prop validation
- Storybook-ready components
- Error boundaries and loading states
- Performance optimized

### 🚀 Performance
- React.memo optimization
- Virtualization support for large lists
- Optimistic updates with Zustand
- Efficient re-rendering patterns

## State Management Integration

Components integrate seamlessly with Zustand stores:

```tsx
import { useResolutions } from '@/lib/stores/meeting-resolutions.store'

function ResolutionDashboard() {
  const { resolutions, createResolution, updateResolution } = useResolutions()
  
  return (
    <ResolutionList
      resolutions={resolutions}
      actions={{
        onCreate: createResolution,
        onUpdate: updateResolution
      }}
    />
  )
}
```

## Customization

### Theming
Components use CSS custom properties for easy theming:

```css
:root {
  --meeting-primary: #3b82f6;
  --meeting-success: #10b981;
  --meeting-warning: #f59e0b;
  --meeting-error: #ef4444;
}
```

### Variants
Create custom variants by extending base components:

```tsx
const CriticalResolutionCard = styled(ResolutionCard)`
  border: 2px solid var(--meeting-error);
  background: #fef2f2;
`
```

## Testing

Each component includes comprehensive test coverage:

```tsx
import { render, screen } from '@testing-library/react'
import { VoteIndicator } from './VoteIndicator'

test('displays vote percentage correctly', () => {
  render(<VoteIndicator count={25} total={100} voteType="for" showPercentage />)
  expect(screen.getByText('25%')).toBeInTheDocument()
})
```

## Migration Guide

### From Monolithic to Atomic

1. **Replace direct component usage:**
   ```tsx
   // Before
   <div className="resolution-card">...</div>
   
   // After
   <ResolutionCard {...resolutionData} />
   ```

2. **Extract component logic:**
   ```tsx
   // Before: Inline voting logic
   const handleVote = (choice) => { /* complex logic */ }
   
   // After: Use VotingControls
   <VotingControls onVote={handleVote} />
   ```

3. **Leverage composition:**
   ```tsx
   // Before: Monolithic component
   <MassiveResolutionComponent />
   
   // After: Composed organisms
   <ResolutionList>
     <ResolutionCard />
   </ResolutionList>
   ```

## Future Enhancements

- **Storybook Integration**: Add stories for all components
- **Advanced Filtering**: More sophisticated filter organisms
- **Real-time Sync**: WebSocket integration for live updates
- **Mobile Optimization**: Touch-friendly interactions
- **Offline Support**: Progressive web app capabilities

## Contributing

When adding new components:

1. Follow the atomic design hierarchy
2. Include comprehensive TypeScript types
3. Add accessibility features
4. Write unit tests
5. Document props and usage examples
6. Consider performance implications

## Files Structure

```
atomic/
├── types.ts                 # Shared types and interfaces
├── atoms/                   # Basic building blocks
│   ├── VoteIndicator.tsx
│   ├── StatusBadge.tsx
│   ├── ProgressBar.tsx
│   ├── PriorityIndicator.tsx
│   ├── QuorumMeter.tsx
│   └── index.ts
├── molecules/               # Simple combinations
│   ├── ResolutionCard.tsx
│   ├── ActionableItem.tsx
│   ├── VotingControls.tsx
│   ├── ProgressUpdate.tsx
│   ├── AssignmentBadge.tsx
│   └── index.ts
├── organisms/               # Complex components
│   ├── ResolutionList.tsx
│   ├── ActionableBoard.tsx
│   ├── VotingPanel.tsx
│   ├── ProgressTracker.tsx
│   └── index.ts
├── index.ts                 # Main exports
└── README.md               # This file
```

This atomic design system provides a solid foundation for scalable, maintainable, and reusable meeting components that can grow with the application's needs.