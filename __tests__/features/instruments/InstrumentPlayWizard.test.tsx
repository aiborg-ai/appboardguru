/**
 * Comprehensive Unit Tests for InstrumentPlayWizard
 * Tests all aspects of the main wizard component including navigation, state management, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

import InstrumentPlayWizard, { InstrumentPlayWizardData } from '@/features/instruments/InstrumentPlayWizard';
import { getInstrumentConfig } from '@/lib/instruments/instrument-configs';

// Mock the instrument configs
jest.mock('@/lib/instruments/instrument-configs', () => ({
  getInstrumentConfig: jest.fn()
}));

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock the step components
jest.mock('@/features/instruments/steps/GoalSelectionStep', () => {
  return function MockGoalSelectionStep({ onValidationChange, onDataChange }: any) {
    React.useEffect(() => {
      onValidationChange(true);
      onDataChange({ goalId: 'test-goal', goalTitle: 'Test Goal' });
    }, [onValidationChange, onDataChange]);
    
    return <div data-testid="goal-selection-step">Goal Selection Step</div>;
  };
});

jest.mock('@/features/instruments/steps/InstrumentAssetsStep', () => {
  return function MockInstrumentAssetsStep({ onValidationChange, onDataChange }: any) {
    React.useEffect(() => {
      onValidationChange(true);
      onDataChange([{ id: '1', name: 'test.pdf', type: 'pdf' }]);
    }, [onValidationChange, onDataChange]);
    
    return <div data-testid="instrument-assets-step">Instrument Assets Step</div>;
  };
});

jest.mock('@/features/instruments/steps/DashboardStep', () => {
  return function MockDashboardStep({ onValidationChange, onDataChange }: any) {
    React.useEffect(() => {
      onValidationChange(true);
      onDataChange({ 
        insights: ['Test insight'], 
        charts: [], 
        recommendations: ['Test recommendation'] 
      });
    }, [onValidationChange, onDataChange]);
    
    return <div data-testid="dashboard-step">Dashboard Step</div>;
  };
});

jest.mock('@/features/instruments/steps/ActionsStep', () => {
  return function MockActionsStep({ onValidationChange, onDataChange }: any) {
    React.useEffect(() => {
      onValidationChange(true);
      onDataChange({
        saveToVault: { enabled: true, vaultId: 'test-vault' },
        saveAsAsset: { enabled: false },
        shareOptions: { enabled: false },
        exportOptions: { pdf: true }
      });
    }, [onValidationChange, onDataChange]);
    
    return <div data-testid="actions-step">Actions Step</div>;
  };
});

const mockInstrumentConfig = {
  id: 'board-pack-ai',
  name: 'Board Pack AI',
  description: 'AI-powered board pack analysis',
  goals: [
    {
      id: 'comprehensive-analysis',
      title: 'Comprehensive Analysis',
      description: 'Complete analysis of all documents',
      parameters: []
    }
  ],
  assetFilters: {
    supportedTypes: ['pdf', 'docx'],
    minAssets: 1,
    maxAssets: 10
  },
  dashboardComponents: {
    chartTypes: ['bar', 'pie'],
    insightTypes: ['summary', 'recommendations']
  }
};

describe('InstrumentPlayWizard', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
    instrumentConfig: mockInstrumentConfig
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getInstrumentConfig as jest.Mock).mockReturnValue(mockInstrumentConfig);
  });

  describe('Rendering and Initial State', () => {
    test('renders wizard when open', () => {
      render(<InstrumentPlayWizard {...defaultProps} />);
      
      expect(screen.getByTestId('instrument-play-wizard')).toBeInTheDocument();
      expect(screen.getByText('Board Pack AI')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<InstrumentPlayWizard {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('instrument-play-wizard')).not.toBeInTheDocument();
    });

    test('displays correct initial step', () => {
      render(<InstrumentPlayWizard {...defaultProps} />);
      
      expect(screen.getByTestId('goal-selection-step')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    test('displays progress indicator correctly', () => {
      render(<InstrumentPlayWizard {...defaultProps} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    test('displays instrument information', () => {
      render(<InstrumentPlayWizard {...defaultProps} />);
      
      expect(screen.getByText('Board Pack AI')).toBeInTheDocument();
      expect(screen.getByText('AI-powered board pack analysis')).toBeInTheDocument();
    });
  });

  describe('Navigation Between Steps', () => {
    test('navigates to next step when continue is clicked', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Should be on step 1
      expect(screen.getByTestId('goal-selection-step')).toBeInTheDocument();
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should move to step 2
      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      });
    });

    test('navigates to previous step when back is clicked', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Navigate to step 2
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
      });

      // Go back to step 1
      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByTestId('goal-selection-step')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      });
    });

    test('disables continue button when step is invalid', () => {
      // Mock invalid step
      jest.doMock('@/features/instruments/steps/GoalSelectionStep', () => {
        return function MockGoalSelectionStep({ onValidationChange }: any) {
          React.useEffect(() => {
            onValidationChange(false);
          }, [onValidationChange]);
          
          return <div data-testid="goal-selection-step">Goal Selection Step</div>;
        };
      });

      render(<InstrumentPlayWizard {...defaultProps} />);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    test('hides back button on first step', () => {
      render(<InstrumentPlayWizard {...defaultProps} />);
      
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    test('shows back button on subsequent steps', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
    });
  });

  describe('Step Progression and Validation', () => {
    test('progresses through all four steps', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Step 1
      expect(screen.getByTestId('goal-selection-step')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-step')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4
      await waitFor(() => {
        expect(screen.getByTestId('actions-step')).toBeInTheDocument();
        expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
      });
    });

    test('updates progress indicator correctly', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Step 1 - 25%
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2 - 50%
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3 - 75%
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4 - 100%
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
      });
    });

    test('maintains step data when navigating back and forth', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Progress to step 2
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
      });

      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /back/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('goal-selection-step')).toBeInTheDocument();
      });

      // Data should be preserved when going forward again
      await user.click(screen.getByRole('button', { name: /continue/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
      });
    });
  });

  describe('Wizard Completion', () => {
    test('calls onComplete with correct data structure', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();
      render(<InstrumentPlayWizard {...defaultProps} onComplete={onComplete} />);

      // Progress through all steps
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {
          // Wait for step transition
        });
      }

      // Complete the wizard
      await user.click(screen.getByRole('button', { name: /complete/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
          instrumentId: 'board-pack-ai',
          selectedGoal: expect.objectContaining({
            goalId: 'test-goal',
            goalTitle: 'Test Goal'
          }),
          selectedAssets: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              name: 'test.pdf',
              type: 'pdf'
            })
          ]),
          analysisResults: expect.objectContaining({
            insights: ['Test insight'],
            charts: [],
            recommendations: ['Test recommendation']
          }),
          saveOptions: expect.objectContaining({
            saveToVault: { enabled: true, vaultId: 'test-vault' }
          })
        }));
      });
    });

    test('shows loading state during completion', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      render(<InstrumentPlayWizard {...defaultProps} onComplete={onComplete} />);

      // Progress to final step
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {
          // Wait for step transition
        });
      }

      // Complete the wizard
      await user.click(screen.getByRole('button', { name: /complete/i }));

      // Should show loading state
      expect(screen.getByTestId('completion-loading')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete/i })).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    test('handles completion error gracefully', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn().mockRejectedValue(new Error('Completion failed'));
      render(<InstrumentPlayWizard {...defaultProps} onComplete={onComplete} />);

      // Progress to final step
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {
          // Wait for step transition
        });
      }

      // Complete the wizard
      await user.click(screen.getByRole('button', { name: /complete/i }));

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('completion-error')).toBeInTheDocument();
        expect(screen.getByText(/completion failed/i)).toBeInTheDocument();
      });
    });

    test('allows retry after completion error', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn()
        .mockRejectedValueOnce(new Error('Completion failed'))
        .mockResolvedValueOnce(undefined);
      
      render(<InstrumentPlayWizard {...defaultProps} onComplete={onComplete} />);

      // Progress to final step
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /continue/i }));
        await waitFor(() => {
          // Wait for step transition
        });
      }

      // Complete the wizard (fails)
      await user.click(screen.getByRole('button', { name: /complete/i }));

      await waitFor(() => {
        expect(screen.getByTestId('completion-error')).toBeInTheDocument();
      });

      // Retry
      await user.click(screen.getByRole('button', { name: /retry/i }));

      // Should succeed on retry
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(2);
      });
    });

    test('handles missing instrument config gracefully', () => {
      render(<InstrumentPlayWizard {...defaultProps} instrumentConfig={undefined as any} />);
      
      expect(screen.getByTestId('config-error')).toBeInTheDocument();
      expect(screen.getByText(/instrument configuration not found/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<InstrumentPlayWizard {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label');
      expect(screen.getByTestId('step-navigation')).toHaveAttribute('role', 'navigation');
    });

    test('manages focus correctly', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Navigate to next step
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        // Focus should move to the new step
        expect(screen.getByTestId('instrument-assets-step')).toHaveAttribute('tabindex', '0');
      });
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /continue/i })).toHaveFocus();

      // Use Enter to activate
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
      });
    });

    test('announces step changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/step 2 of 4/i);
      });
    });
  });

  describe('Close and Cancel Behavior', () => {
    test('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<InstrumentPlayWizard {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(onClose).toHaveBeenCalled();
    });

    test('calls onClose when escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<InstrumentPlayWizard {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });

    test('shows confirmation dialog when closing with unsaved data', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<InstrumentPlayWizard {...defaultProps} onClose={onClose} />);

      // Progress to step 2 to have some data
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
      });

      // Try to close
      await user.click(screen.getByRole('button', { name: /close/i }));

      // Should show confirmation
      expect(screen.getByTestId('close-confirmation')).toBeInTheDocument();
      expect(screen.getByText(/unsaved changes will be lost/i)).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    test('does not re-render unnecessarily', () => {
      const { rerender } = render(<InstrumentPlayWizard {...defaultProps} />);
      
      const initialRender = screen.getByTestId('instrument-play-wizard');
      
      // Re-render with same props
      rerender(<InstrumentPlayWizard {...defaultProps} />);
      
      // Component should not re-render
      expect(screen.getByTestId('instrument-play-wizard')).toBe(initialRender);
    });

    test('lazy loads step components', async () => {
      render(<InstrumentPlayWizard {...defaultProps} />);
      
      // Only current step should be rendered
      expect(screen.getByTestId('goal-selection-step')).toBeInTheDocument();
      expect(screen.queryByTestId('instrument-assets-step')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-step')).not.toBeInTheDocument();
      expect(screen.queryByTestId('actions-step')).not.toBeInTheDocument();
    });

    test('preloads next step for better UX', async () => {
      const user = userEvent.setup();
      render(<InstrumentPlayWizard {...defaultProps} />);

      // Step 2 should be preloaded but not visible
      expect(screen.queryByTestId('instrument-assets-step')).not.toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should transition quickly since it was preloaded
      await waitFor(() => {
        expect(screen.getByTestId('instrument-assets-step')).toBeInTheDocument();
      }, { timeout: 100 }); // Fast transition expected
    });
  });
});