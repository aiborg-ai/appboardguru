/**
 * Crisis Command Center Component Tests
 * Test suite for the main Crisis Command Center React component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CrisisCommandCenter from '../CrisisCommandCenter';

// Mock the Next.js router
const mockPush = jest.fn();
const mockPathname = '/crisis-command-center';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: mockPathname
  }),
  usePathname: () => mockPathname
}));

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock data
const mockDashboardData = {
  summary: {
    active_incidents: 3,
    pending_communications: 2,
    upcoming_meetings: 1,
    active_alerts: 5
  },
  recent_incidents: [
    {
      id: 'incident-1',
      title: 'Trading System Outage',
      category: 'operational',
      severity_level: 'high',
      status: 'active',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 'incident-2',
      title: 'Data Security Alert',
      category: 'cybersecurity',
      severity_level: 'critical',
      status: 'under_investigation',
      created_at: '2024-01-15T09:15:00Z'
    }
  ],
  upcoming_meetings: [
    {
      id: 'meeting-1',
      incident_id: 'incident-1',
      meeting_type: 'emergency_board',
      scheduled_at: '2024-01-15T16:00:00Z',
      urgency_level: 'high'
    }
  ],
  active_alerts_sample: [
    {
      id: 'alert-1',
      alert_type: 'system_performance',
      severity: 'high',
      title: 'High CPU Usage',
      status: 'active'
    }
  ],
  pending_communications_sample: [
    {
      id: 'comm-1',
      message_type: 'stakeholder_update',
      subject: 'System Status Update',
      approval_status: 'pending_review',
      urgency_level: 'high'
    }
  ]
};

const mockAlerts = [
  {
    id: 'alert-1',
    alert_type: 'system_performance',
    severity: 'high',
    title: 'High CPU Usage Detected',
    description: 'CPU usage exceeded 80% threshold',
    status: 'active',
    detected_at: '2024-01-15T10:45:00Z'
  },
  {
    id: 'alert-2',
    alert_type: 'security',
    severity: 'critical',
    title: 'Suspicious Login Activity',
    description: 'Multiple failed login attempts detected',
    status: 'acknowledged',
    detected_at: '2024-01-15T10:30:00Z'
  }
];

describe('CrisisCommandCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/crisis/analytics?type=dashboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDashboardData)
        });
      }
      if (url.includes('/api/crisis/monitoring/alerts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockAlerts })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render the crisis command center', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      expect(screen.getByText('Crisis Command Center')).toBeInTheDocument();
      expect(screen.getByText('Secure crisis management and incident response coordination')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<CrisisCommandCenter />);
      
      expect(screen.getByText('Loading crisis data...')).toBeInTheDocument();
    });

    it('should display dashboard summary cards after loading', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Active Incidents')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Pending Communications')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should render tab navigation', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Active Incidents')).toBeInTheDocument();
        expect(screen.getByText('Monitoring Alerts')).toBeInTheDocument();
        expect(screen.getByText('Emergency Meetings')).toBeInTheDocument();
        expect(screen.getByText('Communications')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to Active Incidents tab', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const incidentsTab = screen.getByText('Active Incidents');
      fireEvent.click(incidentsTab);

      await waitFor(() => {
        expect(screen.getByText('Current Crisis Incidents')).toBeInTheDocument();
      });
    });

    it('should switch to Monitoring Alerts tab', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const alertsTab = screen.getByText('Monitoring Alerts');
      fireEvent.click(alertsTab);

      await waitFor(() => {
        expect(screen.getByText('Real-time System Alerts')).toBeInTheDocument();
        expect(screen.getByText('High CPU Usage Detected')).toBeInTheDocument();
      });
    });

    it('should switch to Emergency Meetings tab', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const meetingsTab = screen.getByText('Emergency Meetings');
      fireEvent.click(meetingsTab);

      await waitFor(() => {
        expect(screen.getByText('Emergency Board Meetings')).toBeInTheDocument();
      });
    });

    it('should switch to Communications tab', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const communicationsTab = screen.getByText('Communications');
      fireEvent.click(communicationsTab);

      await waitFor(() => {
        expect(screen.getByText('Crisis Communications')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Content', () => {
    it('should display recent incidents', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Incidents')).toBeInTheDocument();
        expect(screen.getByText('Trading System Outage')).toBeInTheDocument();
        expect(screen.getByText('Data Security Alert')).toBeInTheDocument();
      });
    });

    it('should show incident severity badges', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      });
    });

    it('should display upcoming meetings', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Upcoming Emergency Meetings')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    it('should toggle secure mode', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        const secureToggle = screen.getByLabelText('Secure Mode');
        expect(secureToggle).toBeInTheDocument();
        
        fireEvent.click(secureToggle);
        
        // Should show secure mode indicator
        expect(screen.getByText('SECURE')).toBeInTheDocument();
      });
    });

    it('should refresh dashboard data', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        const refreshButton = screen.getByLabelText('Refresh');
        expect(refreshButton).toBeInTheDocument();
        
        fireEvent.click(refreshButton);
        
        // Should call API again
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });

    it('should handle incident card clicks', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        const incidentCard = screen.getByText('Trading System Outage');
        fireEvent.click(incidentCard);
        
        // Should navigate to incident details
        expect(mockPush).toHaveBeenCalledWith('/crisis/incidents/incident-1');
      });
    });
  });

  describe('Alert Severity Display', () => {
    it('should display alert severity with appropriate colors', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      // Switch to alerts tab
      await waitFor(() => {
        const alertsTab = screen.getByText('Monitoring Alerts');
        fireEvent.click(alertsTab);
      });

      await waitFor(() => {
        const highSeverityAlert = screen.getByText('High CPU Usage Detected');
        expect(highSeverityAlert).toBeInTheDocument();
        
        const criticalSeverityAlert = screen.getByText('Suspicious Login Activity');
        expect(criticalSeverityAlert).toBeInTheDocument();
      });
    });

    it('should show alert acknowledgment status', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      // Switch to alerts tab
      await waitFor(() => {
        const alertsTab = screen.getByText('Monitoring Alerts');
        fireEvent.click(alertsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('ACKNOWLEDGED')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('Error loading crisis data')).toBeInTheDocument();
      });
    });

    it('should handle empty data states', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            summary: {
              active_incidents: 0,
              pending_communications: 0,
              upcoming_meetings: 0,
              active_alerts: 0
            },
            recent_incidents: [],
            upcoming_meetings: [],
            active_alerts_sample: [],
            pending_communications_sample: []
          })
        })
      );

      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByText('No recent incidents')).toBeInTheDocument();
      });
    });

    it('should show appropriate empty states for tabs', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/crisis/monitoring/alerts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDashboardData)
        });
      });

      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      // Switch to alerts tab
      await waitFor(() => {
        const alertsTab = screen.getByText('Monitoring Alerts');
        fireEvent.click(alertsTab);
      });

      await waitFor(() => {
        expect(screen.getByText('No active alerts')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time data updates', async () => {
      const originalSetInterval = global.setInterval;
      const mockSetInterval = jest.fn();
      global.setInterval = mockSetInterval;

      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
      });

      global.setInterval = originalSetInterval;
    });

    it('should clear intervals on component unmount', async () => {
      const originalClearInterval = global.clearInterval;
      const mockClearInterval = jest.fn();
      global.clearInterval = mockClearInterval;

      const { unmount } = render(<CrisisCommandCenter />);

      await waitFor(() => {
        unmount();
        expect(mockClearInterval).toHaveBeenCalled();
      });

      global.clearInterval = originalClearInterval;
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Secure Mode')).toBeInTheDocument();
        expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        const incidentsTab = screen.getByText('Active Incidents');
        
        // Focus and activate with keyboard
        incidentsTab.focus();
        fireEvent.keyDown(incidentsTab, { key: 'Enter', code: 'Enter' });
        
        expect(screen.getByText('Current Crisis Incidents')).toBeInTheDocument();
      });
    });

    it('should have proper heading hierarchy', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Crisis Command Center' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'System Overview' })).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not make excessive API calls', async () => {
      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        // Should only make initial API calls
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Switching tabs should not trigger new API calls for cached data
      const incidentsTab = screen.getByText('Active Incidents');
      fireEvent.click(incidentsTab);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle large datasets efficiently', async () => {
      const largeIncidentList = Array.from({ length: 100 }, (_, i) => ({
        id: `incident-${i}`,
        title: `Incident ${i}`,
        category: 'operational',
        severity_level: 'medium',
        status: 'active',
        created_at: new Date().toISOString()
      }));

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...mockDashboardData,
            recent_incidents: largeIncidentList
          })
        })
      );

      const startTime = performance.now();

      await act(async () => {
        render(<CrisisCommandCenter />);
      });

      await waitFor(() => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // Should render within reasonable time (< 1000ms for test environment)
        expect(renderTime).toBeLessThan(1000);
      });
    });
  });
});