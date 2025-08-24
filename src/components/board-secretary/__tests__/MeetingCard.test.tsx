/**
 * MeetingCard Component Tests
 * Unit tests for the MeetingCard molecule component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingCard } from '../molecules/MeetingCard'
import type { MeetingStatus } from '../atoms/MeetingStatusBadge'

// Mock the UI components
jest.mock('@/features/shared/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}))

jest.mock('@/features/shared/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props} data-testid="button">
      {children}
    </button>
  )
}))

jest.mock('@/features/shared/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}))

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="dropdown-item">{children}</button>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}))

describe('MeetingCard', () => {
  const mockMeeting = {
    id: 'meeting-123',
    meeting_title: 'Q4 Board Meeting',
    meeting_type: 'regular' as const,
    scheduled_date: '2024-02-15T14:00:00Z',
    actual_start_time: '2024-02-15T14:05:00Z',
    actual_end_time: '2024-02-15T16:30:00Z',
    location: 'Conference Room A',
    is_virtual: false,
    status: 'completed' as MeetingStatus,
    agenda_id: 'agenda-123',
    minutes_id: 'minutes-123',
    recording_url: 'https://example.com/recording.mp4',
    created_by: 'user-123'
  }

  const defaultProps = {
    meeting: mockMeeting,
    onStartTranscription: jest.fn(),
    onGenerateMinutes: jest.fn(),
    onGenerateAgenda: jest.fn(),
    onExtractActionItems: jest.fn(),
    onViewDetails: jest.fn(),
    onEdit: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders meeting information correctly', () => {
    render(<MeetingCard {...defaultProps} />)

    expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
    expect(screen.getByText('Regular')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText(/Feb 15, 2024/)).toBeInTheDocument()
    expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    expect(screen.getByText(/2h 25m/)).toBeInTheDocument() // Duration calculation
  })

  it('displays virtual meeting indicator when is_virtual is true', () => {
    const virtualMeeting = {
      ...mockMeeting,
      is_virtual: true,
      virtual_meeting_url: 'https://zoom.us/meeting'
    }

    render(<MeetingCard {...defaultProps} meeting={virtualMeeting} />)

    expect(screen.getByText('Virtual Meeting')).toBeInTheDocument()
    expect(screen.getByText('Join')).toBeInTheDocument()
  })

  it('shows appropriate status badge for different statuses', () => {
    const scheduledMeeting = { ...mockMeeting, status: 'scheduled' as MeetingStatus }
    const { rerender } = render(<MeetingCard {...defaultProps} meeting={scheduledMeeting} />)

    expect(screen.getByText('Scheduled')).toBeInTheDocument()

    const inProgressMeeting = { ...mockMeeting, status: 'in_progress' as MeetingStatus }
    rerender(<MeetingCard {...defaultProps} meeting={inProgressMeeting} />)

    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('displays meeting type with appropriate styling', () => {
    const emergencyMeeting = {
      ...mockMeeting,
      meeting_type: 'emergency' as const
    }

    render(<MeetingCard {...defaultProps} meeting={emergencyMeeting} />)

    expect(screen.getByText('Emergency')).toBeInTheDocument()
  })

  it('shows indicators for available documents', () => {
    render(<MeetingCard {...defaultProps} />)

    // Should show indicators for agenda, minutes, and recording
    const indicators = screen.getAllByText(/Agenda|Minutes|Recording/)
    expect(indicators.length).toBeGreaterThan(0)
  })

  it('calls onViewDetails when clicking view details option', async () => {
    const user = userEvent.setup()
    render(<MeetingCard {...defaultProps} />)

    // Find and click the dropdown trigger (more options button)
    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    // Click view details option
    const viewDetailsButton = screen.getByText('View Details')
    await user.click(viewDetailsButton)

    expect(defaultProps.onViewDetails).toHaveBeenCalledWith('meeting-123')
  })

  it('calls onEdit when clicking edit option', async () => {
    const user = userEvent.setup()
    render(<MeetingCard {...defaultProps} />)

    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    const editButton = screen.getByText('Edit Meeting')
    await user.click(editButton)

    expect(defaultProps.onEdit).toHaveBeenCalledWith('meeting-123')
  })

  it('shows generate agenda option when no agenda exists', async () => {
    const meetingWithoutAgenda = { ...mockMeeting, agenda_id: undefined }
    const user = userEvent.setup()
    
    render(<MeetingCard {...defaultProps} meeting={meetingWithoutAgenda} />)

    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    expect(screen.getByText('Generate Agenda')).toBeInTheDocument()
  })

  it('shows transcription option for completed meetings', async () => {
    const user = userEvent.setup()
    render(<MeetingCard {...defaultProps} />)

    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    expect(screen.getByText('Start Transcription')).toBeInTheDocument()
  })

  it('calls onStartTranscription when clicking transcription option', async () => {
    const user = userEvent.setup()
    render(<MeetingCard {...defaultProps} />)

    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    const transcriptionButton = screen.getByText('Start Transcription')
    await user.click(transcriptionButton)

    expect(defaultProps.onStartTranscription).toHaveBeenCalledWith('meeting-123')
  })

  it('shows generate minutes option when no minutes exist', async () => {
    const meetingWithoutMinutes = { ...mockMeeting, minutes_id: undefined }
    const user = userEvent.setup()
    
    render(<MeetingCard {...defaultProps} meeting={meetingWithoutMinutes} />)

    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    expect(screen.getByText('Generate Minutes')).toBeInTheDocument()
  })

  it('calls onGenerateMinutes when clicking generate minutes option', async () => {
    const meetingWithoutMinutes = { ...mockMeeting, minutes_id: undefined }
    const user = userEvent.setup()
    
    render(<MeetingCard {...defaultProps} meeting={meetingWithoutMinutes} />)

    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    const generateMinutesButton = screen.getByText('Generate Minutes')
    await user.click(generateMinutesButton)

    expect(defaultProps.onGenerateMinutes).toHaveBeenCalledWith('meeting-123')
  })

  it('calls onExtractActionItems when clicking extract action items option', async () => {
    const user = userEvent.setup()
    render(<MeetingCard {...defaultProps} />)

    const dropdownTrigger = screen.getByTestId('dropdown-trigger')
    await user.click(dropdownTrigger)

    const extractButton = screen.getByText('Extract Action Items')
    await user.click(extractButton)

    expect(defaultProps.onExtractActionItems).toHaveBeenCalledWith('meeting-123')
  })

  it('renders in compact mode when compact prop is true', () => {
    render(<MeetingCard {...defaultProps} compact={true} />)

    // In compact mode, some elements should be hidden or styled differently
    expect(screen.getByTestId('card')).toHaveClass()
  })

  it('opens virtual meeting URL in new tab when clicking join button', async () => {
    const virtualMeeting = {
      ...mockMeeting,
      is_virtual: true,
      virtual_meeting_url: 'https://zoom.us/meeting'
    }

    // Mock window.open
    const mockOpen = jest.fn()
    Object.defineProperty(window, 'open', {
      writable: true,
      value: mockOpen
    })

    const user = userEvent.setup()
    render(<MeetingCard {...defaultProps} meeting={virtualMeeting} />)

    const joinButton = screen.getByText('Join')
    await user.click(joinButton)

    expect(mockOpen).toHaveBeenCalledWith('https://zoom.us/meeting', '_blank')
  })

  it('shows Join Meeting button for scheduled meetings', () => {
    const scheduledMeeting = { ...mockMeeting, status: 'scheduled' as MeetingStatus }
    render(<MeetingCard {...defaultProps} meeting={scheduledMeeting} />)

    expect(screen.getByText('Join Meeting')).toBeInTheDocument()
  })

  it('formats dates correctly for different timezones', () => {
    const meetingWithDifferentTimezone = {
      ...mockMeeting,
      scheduled_date: '2024-12-25T09:30:00Z'
    }

    render(<MeetingCard {...defaultProps} meeting={meetingWithDifferentTimezone} />)

    // Should format the date correctly (specific format may vary based on locale)
    expect(screen.getByText(/Dec 25, 2024/)).toBeInTheDocument()
  })

  it('handles missing optional data gracefully', () => {
    const minimalMeeting = {
      id: 'meeting-minimal',
      meeting_title: 'Minimal Meeting',
      meeting_type: 'regular' as const,
      scheduled_date: '2024-02-15T14:00:00Z',
      is_virtual: false,
      status: 'scheduled' as MeetingStatus,
      created_by: 'user-123'
    }

    expect(() => {
      render(<MeetingCard {...defaultProps} meeting={minimalMeeting} />)
    }).not.toThrow()

    expect(screen.getByText('Minimal Meeting')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    render(<MeetingCard {...defaultProps} className="custom-class" />)

    expect(screen.getByTestId('card')).toHaveClass('custom-class')
  })

  it('does not show action buttons when handlers are not provided', () => {
    const propsWithoutHandlers = {
      meeting: mockMeeting
    }

    render(<MeetingCard {...propsWithoutHandlers} />)

    // Should not show dropdown menu when no handlers provided
    expect(screen.queryByTestId('dropdown-trigger')).not.toBeInTheDocument()
  })
})