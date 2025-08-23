/**
 * Comprehensive Unit Tests for GoalSelectionStep
 * Tests goal selection UI, parameter configuration, validation, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import GoalSelectionStep from '@/features/instruments/steps/GoalSelectionStep';

const mockInstrumentConfig = {
  id: 'board-pack-ai',
  name: 'Board Pack AI',
  goals: [
    {
      id: 'comprehensive-analysis',
      title: 'Comprehensive Analysis',
      description: 'Complete analysis of all documents with insights and recommendations',
      icon: 'Brain',
      estimatedTime: '5-10 minutes',
      parameters: [
        {
          id: 'analysis-depth',
          type: 'select' as const,
          label: 'Analysis Depth',
          required: true,
          options: [
            { value: 'shallow', label: 'Quick Overview' },
            { value: 'deep', label: 'Detailed Analysis' },
            { value: 'comprehensive', label: 'Complete Review' }
          ]
        },
        {
          id: 'include-sentiment',
          type: 'toggle' as const,
          label: 'Include Sentiment Analysis',
          required: false,
          defaultValue: true
        },
        {
          id: 'confidence-threshold',
          type: 'slider' as const,
          label: 'Confidence Threshold',
          required: false,
          min: 0,
          max: 100,
          defaultValue: 75,
          step: 5
        }
      ]
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment',
      description: 'Focus on identifying potential risks and compliance issues',
      icon: 'AlertTriangle',
      estimatedTime: '3-5 minutes',
      parameters: [
        {
          id: 'risk-categories',
          type: 'multiselect' as const,
          label: 'Risk Categories',
          required: true,
          options: [
            { value: 'financial', label: 'Financial Risk' },
            { value: 'operational', label: 'Operational Risk' },
            { value: 'compliance', label: 'Compliance Risk' },
            { value: 'strategic', label: 'Strategic Risk' }
          ]
        }
      ]
    },
    {
      id: 'quick-summary',
      title: 'Quick Summary',
      description: 'Fast overview with key points and action items',
      icon: 'Zap',
      estimatedTime: '1-2 minutes',
      parameters: []
    }
  ]
};

const defaultProps = {
  instrumentConfig: mockInstrumentConfig,
  selectedGoal: null,
  onGoalSelect: jest.fn(),
  onParameterChange: jest.fn(),
  onValidationChange: jest.fn(),
  onDataChange: jest.fn()
};

describe('GoalSelectionStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Goal Display and Selection', () => {
    test('renders all available goals', () => {
      render(<GoalSelectionStep {...defaultProps} />);
      
      expect(screen.getByText('Comprehensive Analysis')).toBeInTheDocument();
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText('Quick Summary')).toBeInTheDocument();
    });

    test('displays goal descriptions and estimated times', () => {
      render(<GoalSelectionStep {...defaultProps} />);
      
      expect(screen.getByText(/complete analysis of all documents/i)).toBeInTheDocument();
      expect(screen.getByText('5-10 minutes')).toBeInTheDocument();
      expect(screen.getByText('3-5 minutes')).toBeInTheDocument();
      expect(screen.getByText('1-2 minutes')).toBeInTheDocument();
    });

    test('calls onGoalSelect when goal is clicked', async () => {
      const user = userEvent.setup();
      const onGoalSelect = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onGoalSelect={onGoalSelect} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      expect(onGoalSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'comprehensive-analysis',
          title: 'Comprehensive Analysis'
        })
      );
    });

    test('highlights selected goal', () => {
      const selectedGoal = mockInstrumentConfig.goals[0];
      
      render(<GoalSelectionStep {...defaultProps} selectedGoal={selectedGoal} />);
      
      const selectedCard = screen.getByTestId('goal-card-comprehensive-analysis');
      expect(selectedCard).toHaveClass('selected', 'border-blue-500');
    });

    test('shows goal icons when available', () => {
      render(<GoalSelectionStep {...defaultProps} />);
      
      expect(screen.getByTestId('goal-icon-comprehensive-analysis')).toBeInTheDocument();
      expect(screen.getByTestId('goal-icon-risk-assessment')).toBeInTheDocument();
      expect(screen.getByTestId('goal-icon-quick-summary')).toBeInTheDocument();
    });

    test('handles goals without parameters', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      await user.click(screen.getByText('Quick Summary'));
      
      // Should be valid immediately as no parameters are required
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Parameter Configuration', () => {
    test('shows parameters when goal with parameters is selected', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByText('Analysis Depth')).toBeInTheDocument();
        expect(screen.getByText('Include Sentiment Analysis')).toBeInTheDocument();
        expect(screen.getByText('Confidence Threshold')).toBeInTheDocument();
      });
    });

    test('renders select parameter correctly', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        const select = screen.getByLabelText('Analysis Depth');
        expect(select).toBeInTheDocument();
        expect(screen.getByText('Quick Overview')).toBeInTheDocument();
        expect(screen.getByText('Detailed Analysis')).toBeInTheDocument();
        expect(screen.getByText('Complete Review')).toBeInTheDocument();
      });
    });

    test('renders toggle parameter correctly', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        const toggle = screen.getByLabelText('Include Sentiment Analysis');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toHaveAttribute('type', 'checkbox');
        expect(toggle).toBeChecked(); // Default value is true
      });
    });

    test('renders slider parameter correctly', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        const slider = screen.getByLabelText('Confidence Threshold');
        expect(slider).toBeInTheDocument();
        expect(slider).toHaveAttribute('type', 'range');
        expect(slider).toHaveAttribute('min', '0');
        expect(slider).toHaveAttribute('max', '100');
        expect(slider).toHaveValue('75'); // Default value
      });
    });

    test('renders multiselect parameter correctly', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Risk Assessment'));
      
      await waitFor(() => {
        expect(screen.getByText('Risk Categories')).toBeInTheDocument();
        expect(screen.getByText('Financial Risk')).toBeInTheDocument();
        expect(screen.getByText('Operational Risk')).toBeInTheDocument();
        expect(screen.getByText('Compliance Risk')).toBeInTheDocument();
        expect(screen.getByText('Strategic Risk')).toBeInTheDocument();
      });
    });

    test('calls onParameterChange when parameter value changes', async () => {
      const user = userEvent.setup();
      const onParameterChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onParameterChange={onParameterChange} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Analysis Depth')).toBeInTheDocument();
      });
      
      const select = screen.getByLabelText('Analysis Depth');
      await user.selectOptions(select, 'deep');
      
      expect(onParameterChange).toHaveBeenCalledWith('analysis-depth', 'deep');
    });

    test('handles toggle parameter changes', async () => {
      const user = userEvent.setup();
      const onParameterChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onParameterChange={onParameterChange} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Include Sentiment Analysis')).toBeInTheDocument();
      });
      
      const toggle = screen.getByLabelText('Include Sentiment Analysis');
      await user.click(toggle);
      
      expect(onParameterChange).toHaveBeenCalledWith('include-sentiment', false);
    });

    test('handles slider parameter changes', async () => {
      const user = userEvent.setup();
      const onParameterChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Confidence Threshold')).toBeInTheDocument();
      });
      
      const slider = screen.getByLabelText('Confidence Threshold');
      fireEvent.change(slider, { target: { value: '85' } });
      
      expect(onParameterChange).toHaveBeenCalledWith('confidence-threshold', 85);
    });

    test('handles multiselect parameter changes', async () => {
      const user = userEvent.setup();
      const onParameterChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onParameterChange={onParameterChange} />);
      
      await user.click(screen.getByText('Risk Assessment'));
      
      await waitFor(() => {
        expect(screen.getByText('Financial Risk')).toBeInTheDocument();
      });
      
      const financialRisk = screen.getByText('Financial Risk');
      await user.click(financialRisk);
      
      expect(onParameterChange).toHaveBeenCalledWith('risk-categories', ['financial']);
    });
  });

  describe('Validation Logic', () => {
    test('validates required select parameters', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      // Should be invalid initially as required parameter is not set
      expect(onValidationChange).toHaveBeenCalledWith(false);
      
      // Set required parameter
      await waitFor(() => {
        expect(screen.getByLabelText('Analysis Depth')).toBeInTheDocument();
      });
      
      const select = screen.getByLabelText('Analysis Depth');
      await user.selectOptions(select, 'deep');
      
      // Should become valid
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });

    test('validates required multiselect parameters', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      await user.click(screen.getByText('Risk Assessment'));
      
      // Should be invalid initially
      expect(onValidationChange).toHaveBeenCalledWith(false);
      
      await waitFor(() => {
        expect(screen.getByText('Financial Risk')).toBeInTheDocument();
      });
      
      // Select at least one option
      await user.click(screen.getByText('Financial Risk'));
      
      // Should become valid
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });

    test('handles optional parameters correctly', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      // Set only the required parameter
      await waitFor(() => {
        expect(screen.getByLabelText('Analysis Depth')).toBeInTheDocument();
      });
      
      const select = screen.getByLabelText('Analysis Depth');
      await user.selectOptions(select, 'deep');
      
      // Should be valid even without optional parameters
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });

    test('maintains validation state when switching goals', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      // Select first goal and configure it
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Analysis Depth')).toBeInTheDocument();
      });
      
      await user.selectOptions(screen.getByLabelText('Analysis Depth'), 'deep');
      
      // Switch to goal without parameters
      await user.click(screen.getByText('Quick Summary'));
      
      // Should be valid immediately
      expect(onValidationChange).toHaveBeenLastCalledWith(true);
    });
  });

  describe('Search and Filtering', () => {
    test('filters goals based on search input', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search goals/i);
      await user.type(searchInput, 'risk');
      
      // Should only show Risk Assessment goal
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.queryByText('Comprehensive Analysis')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Summary')).not.toBeInTheDocument();
    });

    test('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search goals/i);
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText(/no goals match your search/i)).toBeInTheDocument();
    });

    test('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search goals/i);
      await user.type(searchInput, 'risk');
      
      // Clear search
      await user.click(screen.getByTestId('clear-search'));
      
      // All goals should be visible again
      expect(screen.getByText('Comprehensive Analysis')).toBeInTheDocument();
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText('Quick Summary')).toBeInTheDocument();
    });

    test('filters by estimated time', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      // Filter by quick tasks (< 5 minutes)
      const quickFilter = screen.getByText('Quick (< 5 min)');
      await user.click(quickFilter);
      
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument(); // 3-5 minutes
      expect(screen.getByText('Quick Summary')).toBeInTheDocument(); // 1-2 minutes
      expect(screen.queryByText('Comprehensive Analysis')).not.toBeInTheDocument(); // 5-10 minutes
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for goals', () => {
      render(<GoalSelectionStep {...defaultProps} />);
      
      const goalCards = screen.getAllByRole('button', { name: /select goal/i });
      expect(goalCards).toHaveLength(3);
      
      goalCards.forEach(card => {
        expect(card).toHaveAttribute('aria-describedby');
      });
    });

    test('has proper labels for parameters', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Analysis Depth')).toBeInTheDocument();
        expect(screen.getByLabelText('Include Sentiment Analysis')).toBeInTheDocument();
        expect(screen.getByLabelText('Confidence Threshold')).toBeInTheDocument();
      });
    });

    test('announces parameter changes to screen readers', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Analysis Depth')).toBeInTheDocument();
      });
      
      await user.selectOptions(screen.getByLabelText('Analysis Depth'), 'deep');
      
      expect(screen.getByRole('status')).toHaveTextContent(/analysis depth set to detailed analysis/i);
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      // Tab to first goal
      await user.tab();
      expect(screen.getByTestId('goal-card-comprehensive-analysis')).toHaveFocus();
      
      // Use arrow keys to navigate
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('goal-card-risk-assessment')).toHaveFocus();
      
      // Select with Enter or Space
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Risk Categories')).toBeInTheDocument();
      });
    });

    test('has proper focus management for parameters', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        // First parameter should receive focus
        expect(screen.getByLabelText('Analysis Depth')).toHaveFocus();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles missing goal configuration gracefully', () => {
      const configWithoutGoals = { ...mockInstrumentConfig, goals: [] };
      
      render(<GoalSelectionStep {...defaultProps} instrumentConfig={configWithoutGoals} />);
      
      expect(screen.getByText(/no goals available/i)).toBeInTheDocument();
    });

    test('handles invalid parameter configuration', async () => {
      const user = userEvent.setup();
      const configWithInvalidParam = {
        ...mockInstrumentConfig,
        goals: [{
          ...mockInstrumentConfig.goals[0],
          parameters: [{
            id: 'invalid-param',
            type: 'invalid-type' as any,
            label: 'Invalid Parameter',
            required: true
          }]
        }]
      };
      
      render(<GoalSelectionStep {...defaultProps} instrumentConfig={configWithInvalidParam} />);
      
      await user.click(screen.getByText('Comprehensive Analysis'));
      
      await waitFor(() => {
        expect(screen.getByText(/parameter configuration error/i)).toBeInTheDocument();
      });
    });

    test('recovers from parameter validation errors', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<GoalSelectionStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      await user.click(screen.getByText('Risk Assessment'));
      
      // Initially invalid (required parameter not set)
      expect(onValidationChange).toHaveBeenCalledWith(false);
      
      // Set required parameter
      await waitFor(() => {
        expect(screen.getByText('Financial Risk')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Financial Risk'));
      
      // Should become valid
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Performance', () => {
    test('does not re-render unnecessarily', () => {
      const { rerender } = render(<GoalSelectionStep {...defaultProps} />);
      
      const initialRender = screen.getByTestId('goal-selection-step');
      
      // Re-render with same props
      rerender(<GoalSelectionStep {...defaultProps} />);
      
      // Should not re-render
      expect(screen.getByTestId('goal-selection-step')).toBe(initialRender);
    });

    test('debounces search input', async () => {
      const user = userEvent.setup();
      
      render(<GoalSelectionStep {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search goals/i);
      
      // Type quickly
      await user.type(searchInput, 'risk', { delay: 50 });
      
      // Should debounce and only filter after typing stops
      await waitFor(() => {
        expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
        expect(screen.queryByText('Comprehensive Analysis')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});