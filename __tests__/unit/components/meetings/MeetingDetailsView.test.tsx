import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MeetingDetailsView } from '@/features/meetings/components/views/MeetingDetailsView'

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

// Mock icons
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
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Building: () => <div data-testid="building-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Award: () => <div data-testid="award-icon" />,
  Gauge: () => <div data-testid="gauge-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  PieChart: () => <div data-testid="pie-chart-icon" />,
  LineChart: () => <div data-testid="line-chart-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  BookOpen: () => <div data-testid="book-open-icon" />
}))

const mockMeetings = [
  {
    id: '1',
    title: 'Q4 Board Meeting',
    description: 'Quarterly board meeting to review financial performance and strategic initiatives for the upcoming year',
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

describe('MeetingDetailsView Component', () => {
  describe('Rendering and Layout', () => {
    it('renders all meeting detail cards correctly', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.getByText('2024 Annual General Meeting')).toBeInTheDocument()
      expect(screen.getByText('Audit Committee Review')).toBeInTheDocument()
    })

    it('displays comprehensive meeting information in expanded format', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      // Should show full descriptions
      expect(screen.getByText(/Quarterly board meeting to review financial performance and strategic initiatives/)).toBeInTheDocument()
      expect(screen.getByText(/Annual shareholder meeting with board elections/)).toBeInTheDocument()
      expect(screen.getByText(/Monthly audit committee meeting to review financial controls/)).toBeInTheDocument()
    })

    it('shows meeting headers with proper styling', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      // Headers should have gray background
      const headers = document.querySelectorAll('.bg-gray-50')
      expect(headers.length).toBeGreaterThan(0)
    })

    it('displays status and type badges prominently', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Scheduled')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()

      expect(screen.getByText('Board Meeting')).toBeInTheDocument()
      expect(screen.getByText('Annual General Meeting')).toBeInTheDocument()
      expect(screen.getByText('Committee Meeting')).toBeInTheDocument()
    })

    it('handles empty meetings array gracefully', () => {
      render(<MeetingDetailsView meetings={[]} />)

      // Should render without crashing
      expect(screen.queryByText('Q4 Board Meeting')).not.toBeInTheDocument()
    })
  })

  describe('Schedule Information Section', () => {
    it('displays detailed schedule information', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Schedule Details')).toBeInTheDocument()
      
      // Should show start and end times
      expect(screen.getByText(/Friday, March 15, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Saturday, April 20, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Thursday, February 15, 2024/)).toBeInTheDocument()
    })

    it('shows meeting duration correctly', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText(/Duration: 2 hours/)).toBeInTheDocument() // Q4 Board Meeting
      expect(screen.getByText(/Duration: 3 hours/)).toBeInTheDocument() // AGM
      expect(screen.getByText(/Duration: 1 hour 30 minutes/)).toBeInTheDocument() // Audit Committee
    })

    it('formats times with proper AM/PM indicators', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      // Times should include AM/PM
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2} (AM|PM)/i)
      expect(timeElements.length).toBeGreaterThan(0)
    })

    it('highlights schedule section with blue styling', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const scheduleContainers = document.querySelectorAll('.bg-blue-50')
      expect(scheduleContainers.length).toBe(3) // One for each meeting
    })
  })

  describe('Location and Access Section', () => {
    it('displays location information correctly for hybrid meetings', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Location & Access')).toBeInTheDocument()
      expect(screen.getByText('Physical Location')).toBeInTheDocument()
      expect(screen.getByText('Virtual Meeting')).toBeInTheDocument()
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })

    it('shows in-person only meetings correctly', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('In-Person Meeting')).toBeInTheDocument()
      expect(screen.getByText('Grand Ballroom, Hotel Convention Center')).toBeInTheDocument()
    })

    it('shows virtual only meetings correctly', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Virtual Meeting Only')).toBeInTheDocument()
    })

    it('displays clickable virtual meeting links', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const virtualLinks = screen.getAllByText('Join virtual meeting')
      expect(virtualLinks.length).toBeGreaterThan(0)
      
      virtualLinks.forEach(link => {
        expect(link).toHaveClass('text-blue-600', 'cursor-pointer', 'hover:underline')
      })
    })
  })

  describe('Organizer Information Section', () => {
    it('displays meeting organizer details', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Meeting Organizer')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument()
      expect(screen.getByText('mike.wilson@company.com')).toBeInTheDocument()
    })

    it('shows organizer avatars with initials', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      // Avatar containers should have gradient backgrounds
      const avatars = document.querySelectorAll('.bg-gradient-to-r.from-blue-500.to-purple-600')
      expect(avatars.length).toBe(3)
    })

    it('includes contact information for organizers', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument()
      expect(screen.getByText('mike.wilson@company.com')).toBeInTheDocument()
    })
  })

  describe('Attendance Section', () => {
    it('shows attendance statistics correctly', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Attendance')).toBeInTheDocument()
      expect(screen.getByText('6/8')).toBeInTheDocument() // Q4 Board Meeting
      expect(screen.getByText('42/45')).toBeInTheDocument() // AGM
      expect(screen.getByText('5/5')).toBeInTheDocument() // Audit Committee
    })

    it('displays attendance rates as percentages', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('75% attendance rate')).toBeInTheDocument() // 6/8
      expect(screen.getByText('93% attendance rate')).toBeInTheDocument() // 42/45  
      expect(screen.getByText('100% attendance rate')).toBeInTheDocument() // 5/5
    })

    it('shows visual attendance progress bars', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const progressBars = document.querySelectorAll('.bg-green-500')
      expect(progressBars.length).toBe(3) // One for each meeting
    })

    it('uses green color scheme for attendance section', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const attendanceContainers = document.querySelectorAll('.bg-green-50')
      expect(attendanceContainers.length).toBe(3)
    })
  })

  describe('Content Overview Section', () => {
    it('displays agenda and document counts', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Content Overview')).toBeInTheDocument()
      expect(screen.getByText('Agenda Items')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
    })

    it('shows correct counts for each meeting', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('7')).toBeInTheDocument() // Q4 agenda items
      expect(screen.getByText('12')).toBeInTheDocument() // Q4 documents
      expect(screen.getByText('9')).toBeInTheDocument() // AGM agenda items
      expect(screen.getByText('8')).toBeInTheDocument() // AGM documents
      expect(screen.getByText('4')).toBeInTheDocument() // Audit agenda items
      expect(screen.getByText('6')).toBeInTheDocument() // Audit documents
    })

    it('uses color-coded sections for different content types', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const blueContainers = document.querySelectorAll('.bg-blue-50')
      const purpleContainers = document.querySelectorAll('.bg-purple-50')
      
      expect(blueContainers.length).toBeGreaterThan(0)
      expect(purpleContainers.length).toBeGreaterThan(0)
    })
  })

  describe('Quick Actions Section', () => {
    it('displays quick action buttons', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getAllByText('Open Full View')).toHaveLength(3)
      expect(screen.getAllByText('View Agenda')).toHaveLength(3)
      expect(screen.getAllByText('Manage Attendees')).toHaveLength(3)
      expect(screen.getAllByText('Meeting Notes')).toHaveLength(3)
    })

    it('opens full detail modal when Open Full View is clicked', async () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const openFullViewButtons = screen.getAllByText('Open Full View')
      fireEvent.click(openFullViewButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
        expect(screen.getByText('Meeting ID: 1')).toBeInTheDocument()
        expect(screen.getByText('Is Modal: true')).toBeInTheDocument()
      })
    })

    it('closes modal when close button is clicked', async () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      // Open modal
      const openFullViewButton = screen.getAllByText('Open Full View')[0]
      fireEvent.click(openFullViewButton)

      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
      })

      // Close modal
      fireEvent.click(screen.getByTestId('close-modal'))

      await waitFor(() => {
        expect(screen.queryByTestId('meeting-detail-modal')).not.toBeInTheDocument()
      })
    })

    it('can open different meeting modals', async () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const openFullViewButtons = screen.getAllByText('Open Full View')
      
      // Open second meeting
      fireEvent.click(openFullViewButtons[1])

      await waitFor(() => {
        expect(screen.getByText('Meeting ID: 2')).toBeInTheDocument()
      })

      // Close and open third meeting
      fireEvent.click(screen.getByTestId('close-modal'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('meeting-detail-modal')).not.toBeInTheDocument()
      })

      fireEvent.click(openFullViewButtons[2])

      await waitFor(() => {
        expect(screen.getByText('Meeting ID: 3')).toBeInTheDocument()
      })
    })
  })

  describe('Status-Specific Styling', () => {
    it('applies correct status badge colors', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const scheduledBadge = screen.getByText('Scheduled')
      const completedBadge = screen.getByText('Completed')
      const inProgressBadge = screen.getByText('In Progress')

      expect(scheduledBadge).toHaveClass('bg-blue-100', 'text-blue-700')
      expect(completedBadge).toHaveClass('bg-purple-100', 'text-purple-700')
      expect(inProgressBadge).toHaveClass('bg-green-100', 'text-green-700')
    })

    it('handles all possible meeting statuses', () => {
      const allStatusMeetings = [
        { ...mockMeetings[0], status: 'draft' as const },
        { ...mockMeetings[0], status: 'cancelled' as const },
        { ...mockMeetings[0], status: 'postponed' as const }
      ]

      render(<MeetingDetailsView meetings={allStatusMeetings} />)

      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
      expect(screen.getByText('Postponed')).toBeInTheDocument()
    })
  })

  describe('Grid Layout', () => {
    it('uses proper responsive grid layout', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const gridContainers = document.querySelectorAll('.grid.grid-cols-1.lg\\:grid-cols-3')
      expect(gridContainers.length).toBe(3) // One for each meeting
    })

    it('spans content correctly across grid columns', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const leftColumns = document.querySelectorAll('.lg\\:col-span-2')
      expect(leftColumns.length).toBe(3) // Main content spans 2/3 columns
    })
  })

  describe('Performance and Optimization', () => {
    it('renders efficiently with React.memo', () => {
      const { rerender } = render(<MeetingDetailsView meetings={mockMeetings} />)

      rerender(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
    })

    it('handles large datasets efficiently', () => {
      const largeMeetingSet = Array.from({ length: 20 }, (_, i) => ({
        ...mockMeetings[0],
        id: String(i + 1),
        title: `Meeting ${i + 1}`
      }))

      render(<MeetingDetailsView meetings={largeMeetingSet} />)

      expect(screen.getByText('Meeting 1')).toBeInTheDocument()
      expect(screen.getByText('Meeting 20')).toBeInTheDocument()
    })

    it('updates efficiently when meetings change', () => {
      const { rerender } = render(<MeetingDetailsView meetings={[mockMeetings[0]]} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.queryByText('2024 Annual General Meeting')).not.toBeInTheDocument()

      rerender(<MeetingDetailsView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.getByText('2024 Annual General Meeting')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const mainHeadings = screen.getAllByRole('heading', { level: 4 })
      expect(mainHeadings.length).toBeGreaterThan(0)
    })

    it('provides accessible button labels', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/View Details|Open Full View|View Agenda|Manage Attendees|Meeting Notes/)
      })
    })

    it('supports keyboard navigation', async () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      const firstButton = screen.getAllByText('Open Full View')[0]
      
      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      fireEvent.keyDown(firstButton, { key: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
      })
    })

    it('provides semantic structure for screen readers', () => {
      render(<MeetingDetailsView meetings={mockMeetings} />)

      // Should have proper sections and landmarks
      const sections = document.querySelectorAll('section, [role="region"]')
      expect(sections.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('handles meetings with missing optional fields', () => {
      const meetingsWithMissingFields = [
        {
          ...mockMeetings[0],
          location: null,
          virtualMeetingUrl: null,
          description: ''
        }
      ]

      render(<MeetingDetailsView meetings={meetingsWithMissingFields} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
    })

    it('handles zero attendee counts', () => {
      const meetingsWithZeroAttendees = [
        {
          ...mockMeetings[0],
          attendeeCount: 0,
          rsvpCount: 0
        }
      ]

      render(<MeetingDetailsView meetings={meetingsWithZeroAttendees} />)

      expect(screen.getByText('0/0')).toBeInTheDocument()
      expect(screen.getByText('0% attendance rate')).toBeInTheDocument()
    })

    it('handles invalid date formats', () => {
      const meetingsWithInvalidDates = [
        {
          ...mockMeetings[0],
          scheduledStart: 'invalid-date',
          scheduledEnd: 'invalid-date'
        }
      ]

      render(<MeetingDetailsView meetings={meetingsWithInvalidDates} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      // Should not crash with invalid dates
    })

    it('handles very long content gracefully', () => {
      const meetingsWithLongContent = [
        {
          ...mockMeetings[0],
          title: 'This is an extremely long meeting title that should be displayed properly without breaking the layout',
          description: 'This is a very long description that should wrap properly and maintain readability in the detailed view'
        }
      ]

      render(<MeetingDetailsView meetings={meetingsWithLongContent} />)

      expect(screen.getByText(/This is an extremely long meeting title/)).toBeInTheDocument()
      expect(screen.getByText(/This is a very long description/)).toBeInTheDocument()
    })
  })
})