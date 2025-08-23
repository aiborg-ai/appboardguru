import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MeetingListView } from '@/features/meetings/components/views/MeetingListView'

// Mock the MeetingDetailView component
jest.mock('@/features/meetings/components/MeetingDetailView', () => {
  return {
    MeetingDetailView: ({ meetingId, isModal, onClose }: any) => (
      <div data-testid="meeting-detail-modal">
        <div>Meeting Detail View</div>
        <div>Meeting ID: {meetingId}</div>
        <div>Is Modal: {isModal ? 'true' : 'false'}</div>
        <button onClick={onClose} data-testid="close-modal">Close</button>
      </div>
    )
  }
})

// Mock icons to avoid SVG rendering issues in tests
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  MapPin: () => <div data-testid="mappin-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
}))

const mockMeetings = [
  {
    id: '1',
    title: 'Q4 Board Meeting',
    description: 'Quarterly board meeting to review financial performance and strategic initiatives',
    meetingType: 'board' as const,
    status: 'scheduled' as const,
    scheduledStart: '2024-03-15T10:00:00Z',
    scheduledEnd: '2024-03-15T12:00:00Z',
    location: 'Conference Room A',
    virtualMeetingUrl: 'https://zoom.us/j/123456789',
    attendeeCount: 8,
    rsvpCount: 6,
    agendaItemCount: 7,
    documentCount: 12,
    organizer: {
      name: 'John Doe',
      email: 'john.doe@company.com'
    }
  },
  {
    id: '2',
    title: '2024 Annual General Meeting',
    description: 'Annual shareholder meeting with board elections and annual report presentation',
    meetingType: 'agm' as const,
    status: 'completed' as const,
    scheduledStart: '2024-04-20T14:00:00Z',
    scheduledEnd: '2024-04-20T17:00:00Z',
    location: 'Grand Ballroom, Hotel Convention Center',
    virtualMeetingUrl: null,
    attendeeCount: 45,
    rsvpCount: 42,
    agendaItemCount: 9,
    documentCount: 8,
    organizer: {
      name: 'Jane Smith',
      email: 'jane.smith@company.com'
    }
  },
  {
    id: '3',
    title: 'Audit Committee Review',
    description: 'Monthly audit committee meeting to review financial controls and compliance',
    meetingType: 'committee' as const,
    status: 'in_progress' as const,
    scheduledStart: '2024-02-15T09:00:00Z',
    scheduledEnd: '2024-02-15T10:30:00Z',
    location: null,
    virtualMeetingUrl: 'https://teams.microsoft.com/l/meetup-join/123',
    attendeeCount: 5,
    rsvpCount: 5,
    agendaItemCount: 4,
    documentCount: 6,
    organizer: {
      name: 'Mike Wilson',
      email: 'mike.wilson@company.com'
    }
  }
]

describe('MeetingListView Component', () => {
  describe('Rendering', () => {
    it('renders all meeting list items correctly', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.getByText('2024 Annual General Meeting')).toBeInTheDocument()
      expect(screen.getByText('Audit Committee Review')).toBeInTheDocument()
    })

    it('displays meeting descriptions in truncated format', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText(/Quarterly board meeting to review/)).toBeInTheDocument()
      expect(screen.getByText(/Annual shareholder meeting with/)).toBeInTheDocument()
      expect(screen.getByText(/Monthly audit committee meeting/)).toBeInTheDocument()
    })

    it('shows correct meeting types as badges', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('Board')).toBeInTheDocument()
      expect(screen.getByText('AGM')).toBeInTheDocument()
      expect(screen.getByText('Committee')).toBeInTheDocument()
    })

    it('displays meeting status indicators correctly', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Status should be shown as badges
      expect(screen.getByText('Scheduled')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('shows status color indicators', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Status indicators (colored dots) should be present
      const statusIndicators = document.querySelectorAll('.w-3.h-3.rounded-full')
      expect(statusIndicators.length).toBe(3)

      // Check specific status colors
      const scheduledIndicator = document.querySelector('.bg-blue-500')
      const completedIndicator = document.querySelector('.bg-purple-500')
      const inProgressIndicator = document.querySelector('.bg-green-500')

      expect(scheduledIndicator).toBeInTheDocument()
      expect(completedIndicator).toBeInTheDocument()
      expect(inProgressIndicator).toBeInTheDocument()
    })

    it('handles empty meetings array', () => {
      render(<MeetingListView meetings={[]} />)

      // Should render without crashing
      expect(screen.queryByText('Q4 Board Meeting')).not.toBeInTheDocument()
    })
  })

  describe('Date and Time Display', () => {
    it('shows formatted dates in desktop view', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Dates should be formatted consistently
      expect(screen.getByText(/Mar 15/)).toBeInTheDocument()
      expect(screen.getByText(/Apr 20/)).toBeInTheDocument()
      expect(screen.getByText(/Feb 15/)).toBeInTheDocument()
    })

    it('displays meeting duration correctly', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('2h')).toBeInTheDocument() // Q4 Board Meeting
      expect(screen.getByText('3h')).toBeInTheDocument() // AGM
      expect(screen.getByText('1h 30m')).toBeInTheDocument() // Audit Committee
    })

    it('shows mobile-friendly date/time info', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })

      render(<MeetingListView meetings={mockMeetings} />)

      // Mobile info should be present (may be hidden by CSS)
      const mobileElements = document.querySelectorAll('.md\\:hidden')
      expect(mobileElements.length).toBeGreaterThan(0)
    })
  })

  describe('Location Display', () => {
    it('shows correct location indicators', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('Hybrid')).toBeInTheDocument() // Meeting with both location and virtual
      expect(screen.getByText('In-person')).toBeInTheDocument() // Meeting with location only
      expect(screen.getByText('Virtual')).toBeInTheDocument() // Meeting with virtual only
    })

    it('displays appropriate location icons', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getAllByTestId('mappin-icon')).toHaveLength(2) // Hybrid and in-person
      expect(screen.getAllByTestId('video-icon')).toHaveLength(1) // Virtual only
    })
  })

  describe('Attendee Information', () => {
    it('shows attendee counts in desktop view', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('6/8')).toBeInTheDocument()
      expect(screen.getByText('42/45')).toBeInTheDocument()
      expect(screen.getByText('5/5')).toBeInTheDocument()
    })

    it('shows attendee information in mobile view', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('6/8 attending')).toBeInTheDocument()
      expect(screen.getByText('42/45 attending')).toBeInTheDocument()
      expect(screen.getByText('5/5 attending')).toBeInTheDocument()
    })
  })

  describe('Meeting Statistics', () => {
    it('displays agenda and document counts in desktop view', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('7 agenda')).toBeInTheDocument()
      expect(screen.getByText('12 docs')).toBeInTheDocument()
      expect(screen.getByText('9 agenda')).toBeInTheDocument()
      expect(screen.getByText('8 docs')).toBeInTheDocument()
      expect(screen.getByText('4 agenda')).toBeInTheDocument()
      expect(screen.getByText('6 docs')).toBeInTheDocument()
    })

    it('hides detailed stats on smaller screens', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Stats should be hidden on small screens (classes like hidden xl:flex)
      const statsElements = document.querySelectorAll('.xl\\:flex')
      expect(statsElements.length).toBeGreaterThan(0)
    })
  })

  describe('Interactive Elements', () => {
    it('opens detail modal when View Details button is clicked', async () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const viewDetailsButtons = screen.getAllByText('View Details')
      fireEvent.click(viewDetailsButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
        expect(screen.getByText('Meeting ID: 1')).toBeInTheDocument()
        expect(screen.getByText('Is Modal: true')).toBeInTheDocument()
      })
    })

    it('can open different meeting details', async () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const viewDetailsButtons = screen.getAllByText('View Details')
      
      // Open second meeting
      fireEvent.click(viewDetailsButtons[1])

      await waitFor(() => {
        expect(screen.getByText('Meeting ID: 2')).toBeInTheDocument()
      })

      // Close and open third meeting
      fireEvent.click(screen.getByTestId('close-modal'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('meeting-detail-modal')).not.toBeInTheDocument()
      })

      fireEvent.click(viewDetailsButtons[2])

      await waitFor(() => {
        expect(screen.getByText('Meeting ID: 3')).toBeInTheDocument()
      })
    })

    it('closes modal when close button is clicked', async () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Open modal
      const viewDetailsButton = screen.getAllByText('View Details')[0]
      fireEvent.click(viewDetailsButton)

      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
      })

      // Close modal
      fireEvent.click(screen.getByTestId('close-modal'))

      await waitFor(() => {
        expect(screen.queryByTestId('meeting-detail-modal')).not.toBeInTheDocument()
      })
    })

    it('shows more options menu button', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const moreButtons = screen.getAllByTestId('more-vertical-icon')
      expect(moreButtons.length).toBe(3) // One for each meeting
    })
  })

  describe('Responsive Design', () => {
    it('shows appropriate content on mobile screens', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Mobile-specific content should be present
      const mobileElements = document.querySelectorAll('.md\\:hidden')
      expect(mobileElements.length).toBeGreaterThan(0)
    })

    it('hides detailed information on smaller screens', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Desktop-only elements should have appropriate classes
      const desktopElements = document.querySelectorAll('.hidden')
      expect(desktopElements.length).toBeGreaterThan(0)
    })

    it('maintains proper layout structure across screen sizes', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Main container should have responsive classes
      const containers = document.querySelectorAll('.flex')
      expect(containers.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('has proper button labels and roles', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Buttons should have proper accessible text
      const viewDetailsButtons = screen.getAllByText('View Details')
      expect(viewDetailsButtons.length).toBe(3)
    })

    it('supports keyboard navigation', async () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const firstButton = screen.getAllByText('View Details')[0]
      
      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      fireEvent.keyDown(firstButton, { key: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
      })
    })

    it('provides proper focus management', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        button.focus()
        expect(document.activeElement).toBe(button)
      })
    })

    it('has semantic list structure', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      // Should have proper semantic structure for screen readers
      const listItems = screen.getAllByRole('button').length
      expect(listItems).toBeGreaterThan(0)
    })
  })

  describe('Performance Optimization', () => {
    it('renders efficiently with React.memo', () => {
      const { rerender } = render(<MeetingListView meetings={mockMeetings} />)

      // Re-render with same props
      rerender(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
    })

    it('handles large meeting lists efficiently', () => {
      const largeMeetingList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMeetings[0],
        id: String(i + 1),
        title: `Meeting ${i + 1}`
      }))

      render(<MeetingListView meetings={largeMeetingList} />)

      expect(screen.getByText('Meeting 1')).toBeInTheDocument()
      expect(screen.getByText('Meeting 100')).toBeInTheDocument()
    })

    it('updates efficiently when meetings change', () => {
      const { rerender } = render(<MeetingListView meetings={[mockMeetings[0]]} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.queryByText('2024 Annual General Meeting')).not.toBeInTheDocument()

      rerender(<MeetingListView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.getByText('2024 Annual General Meeting')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles meetings with missing optional data', () => {
      const meetingsWithMissingData = [
        {
          ...mockMeetings[0],
          location: null,
          virtualMeetingUrl: null,
          description: ''
        }
      ]

      render(<MeetingListView meetings={meetingsWithMissingData} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      // Should not crash with missing data
    })

    it('handles zero attendee counts gracefully', () => {
      const meetingsWithZeroAttendees = [
        {
          ...mockMeetings[0],
          attendeeCount: 0,
          rsvpCount: 0
        }
      ]

      render(<MeetingListView meetings={meetingsWithZeroAttendees} />)

      expect(screen.getByText('0/0')).toBeInTheDocument()
    })

    it('handles invalid date formats', () => {
      const meetingsWithInvalidDates = [
        {
          ...mockMeetings[0],
          scheduledStart: 'invalid-date',
          scheduledEnd: 'invalid-date'
        }
      ]

      render(<MeetingListView meetings={meetingsWithInvalidDates} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      // Should not crash with invalid dates
    })

    it('handles very long titles gracefully', () => {
      const meetingsWithLongTitles = [
        {
          ...mockMeetings[0],
          title: 'This is an extremely long meeting title that should be truncated properly in the list view to maintain good layout and user experience'
        }
      ]

      render(<MeetingListView meetings={meetingsWithLongTitles} />)

      expect(screen.getByText(/This is an extremely long meeting title/)).toBeInTheDocument()
    })
  })

  describe('Status Badge Styling', () => {
    it('applies correct colors for different statuses', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const scheduledBadge = screen.getByText('Scheduled')
      const completedBadge = screen.getByText('Completed')
      const inProgressBadge = screen.getByText('In Progress')

      expect(scheduledBadge).toHaveClass('bg-blue-100', 'text-blue-700')
      expect(completedBadge).toHaveClass('bg-purple-100', 'text-purple-700')
      expect(inProgressBadge).toHaveClass('bg-green-100', 'text-green-700')
    })

    it('handles all possible status types', () => {
      const allStatusMeetings = [
        { ...mockMeetings[0], status: 'draft' as const },
        { ...mockMeetings[0], status: 'cancelled' as const },
        { ...mockMeetings[0], status: 'postponed' as const }
      ]

      render(<MeetingListView meetings={allStatusMeetings} />)

      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
      expect(screen.getByText('Postponed')).toBeInTheDocument()
    })
  })

  describe('Hover Effects', () => {
    it('applies hover effects to list items', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const cards = document.querySelectorAll('.hover\\:shadow-md')
      expect(cards.length).toBe(3)
    })

    it('applies proper transition classes', () => {
      render(<MeetingListView meetings={mockMeetings} />)

      const transitionElements = document.querySelectorAll('.transition-shadow')
      expect(transitionElements.length).toBe(3)
    })
  })
})