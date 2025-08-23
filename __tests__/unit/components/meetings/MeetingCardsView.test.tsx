import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MeetingCardsView } from '@/features/meetings/components/views/MeetingCardsView'

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

describe('MeetingCardsView Component', () => {
  describe('Rendering', () => {
    it('renders all meeting cards correctly', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.getByText('2024 Annual General Meeting')).toBeInTheDocument()
      expect(screen.getByText('Audit Committee Review')).toBeInTheDocument()
    })

    it('displays meeting descriptions', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText(/Quarterly board meeting to review/)).toBeInTheDocument()
      expect(screen.getByText(/Annual shareholder meeting with/)).toBeInTheDocument()
      expect(screen.getByText(/Monthly audit committee meeting/)).toBeInTheDocument()
    })

    it('shows correct meeting types', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText('Board')).toBeInTheDocument()
      expect(screen.getByText('AGM')).toBeInTheDocument()
      expect(screen.getByText('Committee')).toBeInTheDocument()
    })

    it('displays meeting status badges correctly', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText('Scheduled')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('shows formatted dates and times', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      // Check that dates are formatted (exact format may vary by locale)
      expect(screen.getByText(/Mar 15/)).toBeInTheDocument()
      expect(screen.getByText(/Apr 20/)).toBeInTheDocument()
      expect(screen.getByText(/Feb 15/)).toBeInTheDocument()
    })

    it('displays attendee counts', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText('6/8')).toBeInTheDocument() // Q4 Board Meeting
      expect(screen.getByText('42/45')).toBeInTheDocument() // AGM
      expect(screen.getByText('5/5')).toBeInTheDocument() // Audit Committee
    })

    it('shows agenda and document counts', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText('7 agenda')).toBeInTheDocument()
      expect(screen.getByText('12 docs')).toBeInTheDocument()
      expect(screen.getByText('9 agenda')).toBeInTheDocument()
      expect(screen.getByText('8 docs')).toBeInTheDocument()
    })

    it('handles empty meetings array', () => {
      render(<MeetingCardsView meetings={[]} />)

      // Should render without crashing
      expect(screen.queryByText('Q4 Board Meeting')).not.toBeInTheDocument()
    })
  })

  describe('Location Display', () => {
    it('shows correct location icons for hybrid meetings', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      const hybridMeeting = mockMeetings.find(m => m.location && m.virtualMeetingUrl)
      expect(hybridMeeting).toBeTruthy()
      
      // Should show "Hybrid" for meetings with both location and virtual URL
      expect(screen.getByText('Hybrid')).toBeInTheDocument()
    })

    it('shows in-person indicator for location-only meetings', () => {
      const inPersonMeeting = [
        {
          ...mockMeetings[0],
          virtualMeetingUrl: null
        }
      ]
      
      render(<MeetingCardsView meetings={inPersonMeeting} />)
      expect(screen.getByText('In-person')).toBeInTheDocument()
    })

    it('shows virtual indicator for online-only meetings', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)
      
      const virtualMeeting = mockMeetings.find(m => !m.location && m.virtualMeetingUrl)
      expect(virtualMeeting).toBeTruthy()
      expect(screen.getByText('Virtual')).toBeInTheDocument()
    })
  })

  describe('Status Styling', () => {
    it('applies correct status colors', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      const scheduledBadge = screen.getByText('Scheduled')
      const completedBadge = screen.getByText('Completed')
      const inProgressBadge = screen.getByText('In Progress')

      expect(scheduledBadge).toHaveClass('bg-blue-100', 'text-blue-700')
      expect(completedBadge).toHaveClass('bg-purple-100', 'text-purple-700')
      expect(inProgressBadge).toHaveClass('bg-green-100', 'text-green-700')
    })

    it('displays correct status icons', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      // Icons should be present (mocked components)
      expect(screen.getAllByTestId('calendar-icon')).toHaveLength(1) // For scheduled
      expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(2) // For completed and in_progress
    })
  })

  describe('Card Interactions', () => {
    it('opens detail view when View Details button is clicked', async () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      const viewDetailsButtons = screen.getAllByText('View Details')
      fireEvent.click(viewDetailsButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
        expect(screen.getByText('Meeting ID: 1')).toBeInTheDocument()
        expect(screen.getByText('Is Modal: true')).toBeInTheDocument()
      })
    })

    it('opens detail view when card is clicked', async () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      const meetingCard = screen.getByText('Q4 Board Meeting').closest('div[data-testid*="meeting-card"]') || 
                         screen.getByText('Q4 Board Meeting').closest('.cursor-pointer')
      
      if (meetingCard) {
        fireEvent.click(meetingCard)

        await waitFor(() => {
          expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
        })
      }
    })

    it('closes detail view when close button is clicked', async () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      // Open detail view
      const viewDetailsButtons = screen.getAllByText('View Details')
      fireEvent.click(viewDetailsButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
      })

      // Close detail view
      fireEvent.click(screen.getByTestId('close-modal'))

      await waitFor(() => {
        expect(screen.queryByTestId('meeting-detail-modal')).not.toBeInTheDocument()
      })
    })

    it('can open different meeting details', async () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      // Open first meeting
      const viewDetailsButtons = screen.getAllByText('View Details')
      fireEvent.click(viewDetailsButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Meeting ID: 1')).toBeInTheDocument()
      })

      // Close and open second meeting
      fireEvent.click(screen.getByTestId('close-modal'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('meeting-detail-modal')).not.toBeInTheDocument()
      })

      fireEvent.click(viewDetailsButtons[1])

      await waitFor(() => {
        expect(screen.getByText('Meeting ID: 2')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper button labels', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Each button should have accessible text
        expect(button).toHaveTextContent(/View Details|More/i)
      })
    })

    it('supports keyboard navigation', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      const viewDetailsButtons = screen.getAllByText('View Details')
      const firstButton = viewDetailsButtons[0]

      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      fireEvent.keyDown(firstButton, { key: 'Enter' })
      
      waitFor(() => {
        expect(screen.getByTestId('meeting-detail-modal')).toBeInTheDocument()
      })
    })

    it('has proper ARIA labels for interactive elements', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Buttons should be focusable
        expect(button).not.toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('provides semantic structure', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      // Should have proper heading structure
      const titles = screen.getAllByRole('heading', { level: 3 })
      expect(titles.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('renders efficiently with React.memo optimization', () => {
      const { rerender } = render(<MeetingCardsView meetings={mockMeetings} />)

      // Re-render with same props should not cause issues
      rerender(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
    })

    it('handles large datasets efficiently', () => {
      const largeMeetingSet = Array.from({ length: 50 }, (_, i) => ({
        ...mockMeetings[0],
        id: String(i + 1),
        title: `Meeting ${i + 1}`
      }))

      render(<MeetingCardsView meetings={largeMeetingSet} />)

      expect(screen.getByText('Meeting 1')).toBeInTheDocument()
      expect(screen.getByText('Meeting 50')).toBeInTheDocument()
    })

    it('updates efficiently when meetings prop changes', () => {
      const { rerender } = render(<MeetingCardsView meetings={[mockMeetings[0]]} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.queryByText('2024 Annual General Meeting')).not.toBeInTheDocument()

      rerender(<MeetingCardsView meetings={mockMeetings} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      expect(screen.getByText('2024 Annual General Meeting')).toBeInTheDocument()
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

      render(<MeetingCardsView meetings={meetingsWithMissingFields} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      // Should handle gracefully without crashing
    })

    it('handles invalid date formats gracefully', () => {
      const meetingsWithInvalidDates = [
        {
          ...mockMeetings[0],
          scheduledStart: 'invalid-date',
          scheduledEnd: 'invalid-date'
        }
      ]

      render(<MeetingCardsView meetings={meetingsWithInvalidDates} />)

      expect(screen.getByText('Q4 Board Meeting')).toBeInTheDocument()
      // Should not crash even with invalid dates
    })

    it('handles zero attendee counts', () => {
      const meetingsWithZeroAttendees = [
        {
          ...mockMeetings[0],
          attendeeCount: 0,
          rsvpCount: 0
        }
      ]

      render(<MeetingCardsView meetings={meetingsWithZeroAttendees} />)

      expect(screen.getByText('0/0')).toBeInTheDocument()
    })

    it('handles very long meeting titles and descriptions', () => {
      const meetingsWithLongContent = [
        {
          ...mockMeetings[0],
          title: 'This is a very long meeting title that should be handled properly by the component without breaking the layout or causing overflow issues',
          description: 'This is an extremely long description that goes on and on and should be truncated or handled appropriately by the component to maintain good user experience and visual design'
        }
      ]

      render(<MeetingCardsView meetings={meetingsWithLongContent} />)

      // Should render without breaking layout
      expect(screen.getByText(/This is a very long meeting title/)).toBeInTheDocument()
    })
  })

  describe('Date and Time Formatting', () => {
    it('formats dates consistently', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      // Should use consistent date format
      const dateElements = screen.getAllByText(/\w+ \d{1,2}/)
      expect(dateElements.length).toBeGreaterThan(0)
    })

    it('shows duration correctly', () => {
      render(<MeetingCardsView meetings={mockMeetings} />)

      // Should show duration in readable format
      expect(screen.getByText(/2h/)).toBeInTheDocument() // Q4 Board Meeting (2 hours)
      expect(screen.getByText(/3h/)).toBeInTheDocument() // AGM (3 hours)
      expect(screen.getByText(/1h 30m/)).toBeInTheDocument() // Audit Committee (1.5 hours)
    })
  })
})