/**
 * Comprehensive Integration Tests for Instrument Workflow
 * Tests complete user journeys through the 4-step workflow process
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import InstrumentPlayWizard from '@/features/instruments/InstrumentPlayWizard';
import { getInstrumentConfig } from '@/lib/instruments/instrument-configs';

// Mock the actual step components
jest.mock('@/features/instruments/steps/GoalSelectionStep');
jest.mock('@/features/instruments/steps/InstrumentAssetsStep');  
jest.mock('@/features/instruments/steps/DashboardStep');
jest.mock('@/features/instruments/steps/ActionsStep');

// Mock API calls
global.fetch = jest.fn();

const mockInstrumentConfig = {
  id: 'board-pack-ai',
  name: 'Board Pack AI',
  description: 'AI-powered analysis of board documents',
  goals: [
    {
      id: 'comprehensive-analysis',
      title: 'Comprehensive Analysis',
      description: 'Complete analysis with insights',
      parameters: [
        {
          id: 'analysis-depth',
          type: 'select' as const,
          label: 'Analysis Depth',
          required: true,
          options: [
            { value: 'shallow', label: 'Quick Overview' },
            { value: 'deep', label: 'Detailed Analysis' }
          ]
        }
      ]
    },
    {
      id: 'quick-summary',
      title: 'Quick Summary',
      description: 'Fast overview',
      parameters: []
    }
  ],
  assetFilters: {
    supportedTypes: ['pdf', 'docx'],
    minAssets: 1,
    maxAssets: 5
  },
  dashboardComponents: {
    chartTypes: ['bar', 'pie'],
    insightTypes: ['summary', 'recommendations']
  }
};

const mockAssets = [
  {
    id: '1',
    name: 'board-pack.pdf',
    type: 'pdf',
    size: 1024000,
    category: 'board-documents'
  },
  {
    id: '2',
    name: 'financial-report.xlsx',
    type: 'xlsx',
    size: 2048000,
    category: 'financial-reports'
  }
];

const mockAnalysisResults = {
  insights: [
    {
      id: 'insight-1',
      type: 'summary',
      title: 'Executive Summary',
      content: 'Strong Q1 performance'
    }
  ],
  charts: [
    {
      id: 'chart-1',
      type: 'bar',
      title: 'Performance Metrics',
      data: { labels: ['Q1'], datasets: [{ data: [100] }] }
    }
  ],
  recommendations: [
    {
      id: 'rec-1',
      title: 'Continue Growth Strategy',
      description: 'Maintain current trajectory'
    }
  ]
};

// Mock step component implementations with realistic behavior
const MockGoalSelectionStep = jest.fn(({ onGoalSelect, onParameterChange, onValidationChange, onDataChange }) => {
  const [selectedGoal, setSelectedGoal] = React.useState(null);
  const [parameters, setParameters] = React.useState({});

  const selectGoal = (goal) => {
    setSelectedGoal(goal);
    onGoalSelect(goal);
    onDataChange({ goalId: goal.id, goalTitle: goal.title, parameters });
    
    // Validate based on goal requirements
    const isValid = !goal.parameters?.some(p => p.required && !parameters[p.id]);
    onValidationChange(isValid);
  };

  const updateParameter = (paramId, value) => {
    const newParams = { ...parameters, [paramId]: value };
    setParameters(newParams);
    onParameterChange(paramId, value);
    onDataChange({ goalId: selectedGoal?.id, goalTitle: selectedGoal?.title, parameters: newParams });
    
    // Re-validate
    const isValid = !selectedGoal?.parameters?.some(p => p.required && !newParams[p.id]);
    onValidationChange(isValid);
  };

  return (
    <div data-testid="goal-selection-step">
      <h3>Select Analysis Goal</h3>
      {mockInstrumentConfig.goals.map(goal => (
        <button 
          key={goal.id}
          onClick={() => selectGoal(goal)}
          data-testid={`goal-${goal.id}`}
          className={selectedGoal?.id === goal.id ? 'selected' : ''}
        >
          {goal.title}
        </button>
      ))}
      
      {selectedGoal?.parameters?.map(param => (
        <div key={param.id}>
          <label htmlFor={param.id}>{param.label}</label>
          {param.type === 'select' && (
            <select 
              id={param.id}
              onChange={(e) => updateParameter(param.id, e.target.value)}
              data-testid={`param-${param.id}`}
            >
              <option value="">Select...</option>
              {param.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
});

const MockInstrumentAssetsStep = jest.fn(({ onAssetSelect, onValidationChange, onDataChange, selectedAssets = [] }) => {
  const [selected, setSelected] = React.useState(selectedAssets);

  const toggleAsset = (asset) => {
    const isSelected = selected.find(a => a.id === asset.id);
    let newSelected;
    
    if (isSelected) {
      newSelected = selected.filter(a => a.id !== asset.id);
    } else {
      newSelected = [...selected, asset];
      onAssetSelect(asset);
    }
    
    setSelected(newSelected);
    onDataChange(newSelected);
    onValidationChange(newSelected.length >= mockInstrumentConfig.assetFilters.minAssets);
  };

  return (
    <div data-testid="instrument-assets-step">
      <h3>Select Documents</h3>
      <p>Selected: {selected.length} of {mockInstrumentConfig.assetFilters.maxAssets}</p>
      {mockAssets.map(asset => (
        <button 
          key={asset.id}
          onClick={() => toggleAsset(asset)}
          data-testid={`asset-${asset.id}`}
          className={selected.find(a => a.id === asset.id) ? 'selected' : ''}
        >
          {asset.name} ({asset.type.toUpperCase()})
        </button>
      ))}
    </div>
  );
});

const MockDashboardStep = jest.fn(({ onAnalysisComplete, onValidationChange, onDataChange }) => {
  const [analysisStarted, setAnalysisStarted] = React.useState(false);
  const [analysisComplete, setAnalysisComplete] = React.useState(false);

  const startAnalysis = async () => {
    setAnalysisStarted(true);
    
    // Simulate analysis process
    setTimeout(() => {
      setAnalysisComplete(true);
      onAnalysisComplete(mockAnalysisResults);
      onDataChange(mockAnalysisResults);
      onValidationChange(true);
    }, 1000);
  };

  if (analysisComplete) {
    return (
      <div data-testid="dashboard-step">
        <h3>Analysis Results</h3>
        <div data-testid="analysis-results">
          <p>Analysis completed successfully!</p>
          <div>Insights: {mockAnalysisResults.insights.length}</div>
          <div>Charts: {mockAnalysisResults.charts.length}</div>
          <div>Recommendations: {mockAnalysisResults.recommendations.length}</div>
        </div>
      </div>
    );
  }

  if (analysisStarted) {
    return (
      <div data-testid="dashboard-step">
        <div data-testid="analysis-progress">Analyzing documents...</div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-step">
      <h3>Ready to Analyze</h3>
      <button onClick={startAnalysis} data-testid="start-analysis">
        Start Analysis
      </button>
    </div>
  );
});

const MockActionsStep = jest.fn(({ onValidationChange, onDataChange }) => {
  const [saveOptions, setSaveOptions] = React.useState({
    saveToVault: { enabled: false },
    saveAsAsset: { enabled: false },
    shareOptions: { enabled: false },
    exportOptions: { pdf: false, excel: false }
  });

  const updateSaveOptions = (updates) => {
    const newOptions = { ...saveOptions, ...updates };
    setSaveOptions(newOptions);
    onDataChange(newOptions);
    
    // Validate that at least one action is selected
    const hasAction = newOptions.saveToVault.enabled || 
                     newOptions.saveAsAsset.enabled || 
                     newOptions.shareOptions.enabled ||
                     Object.values(newOptions.exportOptions).some(Boolean);
    
    onValidationChange(hasAction);
  };

  return (
    <div data-testid="actions-step">
      <h3>Save & Share Results</h3>
      
      <div>
        <label>
          <input
            type="checkbox"
            checked={saveOptions.saveToVault.enabled}
            onChange={(e) => updateSaveOptions({
              saveToVault: { enabled: e.target.checked }
            })}
            data-testid="save-to-vault"
          />
          Save to Vault
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={saveOptions.saveAsAsset.enabled}
            onChange={(e) => updateSaveOptions({
              saveAsAsset: { enabled: e.target.checked }
            })}
            data-testid="save-as-asset"
          />
          Save as Asset
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={saveOptions.exportOptions.pdf}
            onChange={(e) => updateSaveOptions({
              exportOptions: { ...saveOptions.exportOptions, pdf: e.target.checked }
            })}
            data-testid="export-pdf"
          />
          Export as PDF
        </label>
      </div>
    </div>
  );
});

// Apply mocks
require('@/features/instruments/steps/GoalSelectionStep').default = MockGoalSelectionStep;
require('@/features/instruments/steps/InstrumentAssetsStep').default = MockInstrumentAssetsStep;
require('@/features/instruments/steps/DashboardStep').default = MockDashboardStep;
require('@/features/instruments/steps/ActionsStep').default = MockActionsStep;

describe('Instrument Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Complete Workflow Journey - Goal with Parameters', () => {
    test('completes full workflow with parameter configuration', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={onComplete}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Step 1: Select goal with parameters
      expect(screen.getByText('Select Analysis Goal')).toBeInTheDocument();
      
      await user.click(screen.getByTestId('goal-comprehensive-analysis'));
      expect(screen.getByText('Analysis Depth')).toBeInTheDocument();
      
      // Continue button should be disabled until required parameter is set
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
      
      await user.selectOptions(screen.getByTestId('param-analysis-depth'), 'deep');
      
      // Now continue should be enabled
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Select assets
      await waitFor(() => {
        expect(screen.getByText('Select Documents')).toBeInTheDocument();
      });
      
      // Continue should be disabled until minimum assets are selected
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
      
      await user.click(screen.getByTestId('asset-1'));
      expect(screen.getByText('Selected: 1 of 5')).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Analysis dashboard
      await waitFor(() => {
        expect(screen.getByText('Ready to Analyze')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('start-analysis'));
      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
      
      // Wait for analysis to complete
      await waitFor(() => {
        expect(screen.getByText('Analysis completed successfully!')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4: Actions
      await waitFor(() => {
        expect(screen.getByText('Save & Share Results')).toBeInTheDocument();
      });
      
      // Continue should be disabled until an action is selected
      expect(screen.getByRole('button', { name: /complete/i })).toBeDisabled();
      
      await user.click(screen.getByTestId('export-pdf'));
      
      await user.click(screen.getByRole('button', { name: /complete/i }));

      // Verify completion with correct data structure
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            instrumentId: 'board-pack-ai',
            selectedGoal: expect.objectContaining({
              goalId: 'comprehensive-analysis',
              goalTitle: 'Comprehensive Analysis',
              parameters: { 'analysis-depth': 'deep' }
            }),
            selectedAssets: expect.arrayContaining([
              expect.objectContaining({ id: '1', name: 'board-pack.pdf' })
            ]),
            analysisResults: expect.objectContaining({
              insights: expect.any(Array),
              charts: expect.any(Array),
              recommendations: expect.any(Array)
            }),
            saveOptions: expect.objectContaining({
              exportOptions: expect.objectContaining({ pdf: true })
            })
          })
        );
      });
    });
  });

  describe('Complete Workflow Journey - Goal without Parameters', () => {
    test('completes workflow quickly with no-parameter goal', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={onComplete}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Step 1: Select simple goal
      await user.click(screen.getByTestId('goal-quick-summary'));
      
      // Should be able to continue immediately (no parameters required)
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Select multiple assets
      await waitFor(() => {
        expect(screen.getByText('Select Documents')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('asset-1'));
      await user.click(screen.getByTestId('asset-2'));
      expect(screen.getByText('Selected: 2 of 5')).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Complete analysis
      await waitFor(() => {
        expect(screen.getByTestId('start-analysis')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('start-analysis'));
      
      await waitFor(() => {
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4: Multiple save options
      await waitFor(() => {
        expect(screen.getByText('Save & Share Results')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('save-to-vault'));
      await user.click(screen.getByTestId('save-as-asset'));
      
      await user.click(screen.getByRole('button', { name: /complete/i }));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            selectedGoal: expect.objectContaining({
              goalId: 'quick-summary',
              parameters: {}
            }),
            selectedAssets: expect.arrayContaining([
              expect.objectContaining({ id: '1' }),
              expect.objectContaining({ id: '2' })
            ]),
            saveOptions: expect.objectContaining({
              saveToVault: { enabled: true },
              saveAsAsset: { enabled: true }
            })
          })
        );
      });
    });
  });

  describe('Navigation and Data Persistence', () => {
    test('maintains data when navigating back and forth', async () => {
      const user = userEvent.setup();

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Step 1: Configure goal
      await user.click(screen.getByTestId('goal-comprehensive-analysis'));
      await user.selectOptions(screen.getByTestId('param-analysis-depth'), 'deep');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Select assets
      await waitFor(() => {
        expect(screen.getByTestId('asset-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('asset-1'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3: Go back to step 2
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Verify asset selection is preserved
      await waitFor(() => {
        expect(screen.getByTestId('asset-1')).toHaveClass('selected');
        expect(screen.getByText('Selected: 1 of 5')).toBeInTheDocument();
      });

      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Verify goal and parameter selection is preserved
      await waitFor(() => {
        expect(screen.getByTestId('goal-comprehensive-analysis')).toHaveClass('selected');
        expect(screen.getByTestId('param-analysis-depth')).toHaveValue('deep');
      });

      // Navigate forward again
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByText('Selected: 1 of 5')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByTestId('start-analysis')).toBeInTheDocument();
      });
    });

    test('handles step validation correctly during navigation', async () => {
      const user = userEvent.setup();

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Step 1: Select goal but don't configure parameters
      await user.click(screen.getByTestId('goal-comprehensive-analysis'));
      
      // Continue should be disabled
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
      
      // Configure parameter
      await user.selectOptions(screen.getByTestId('param-analysis-depth'), 'shallow');
      
      // Continue should now be enabled
      expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Try to continue without selecting assets
      await waitFor(() => {
        expect(screen.getByText('Selected: 0 of 5')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
      
      // Select asset
      await user.click(screen.getByTestId('asset-1'));
      expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
    });
  });

  describe('API Integration', () => {
    test('handles successful API completion', async () => {
      const user = userEvent.setup();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          analysisId: 'analysis-123',
          message: 'Analysis completed successfully'
        })
      });

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Complete workflow quickly
      await user.click(screen.getByTestId('goal-quick-summary'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('asset-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('asset-1'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('start-analysis')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('start-analysis'));

      await waitFor(() => {
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      }, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('export-pdf'));
      await user.click(screen.getByRole('button', { name: /complete/i }));

      // Wait for API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/instruments/analyze', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('board-pack-ai')
        }));
      });
    });

    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const onComplete = jest.fn().mockRejectedValue(new Error('API failed'));

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={onComplete}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Complete workflow
      await user.click(screen.getByTestId('goal-quick-summary'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('asset-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('asset-1'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('start-analysis')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('start-analysis'));

      await waitFor(() => {
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      }, { timeout: 2000 });
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('export-pdf')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('export-pdf'));
      await user.click(screen.getByRole('button', { name: /complete/i }));

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error.*occurred/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    test('updates progress indicator correctly throughout workflow', async () => {
      const user = userEvent.setup();

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Step 1 - 25%
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

      await user.click(screen.getByTestId('goal-quick-summary'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2 - 50%
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('asset-1'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3 - 75%
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
        expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('start-analysis'));
      
      await waitFor(() => {
        expect(screen.getByTestId('analysis-results')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4 - 100%
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
        expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('handles analysis cancellation and restart', async () => {
      const user = userEvent.setup();

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          instrumentConfig={mockInstrumentConfig}
        />
      );

      // Navigate to analysis step
      await user.click(screen.getByTestId('goal-quick-summary'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('asset-1')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('asset-1'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByTestId('start-analysis')).toBeInTheDocument();
      });
      
      // Start analysis then go back (simulating cancellation)
      await user.click(screen.getByTestId('start-analysis'));
      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /back/i }));
      
      // Should return to previous step
      await waitFor(() => {
        expect(screen.getByText('Selected: 1 of 5')).toBeInTheDocument();
      });
      
      // Go forward again and restart analysis
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await waitFor(() => {
        expect(screen.getByTestId('start-analysis')).toBeInTheDocument();
      });
    });

    test('handles maximum asset selection limit', async () => {
      const user = userEvent.setup();
      
      // Mock assets to exceed limit
      const limitedConfig = {
        ...mockInstrumentConfig,
        assetFilters: { ...mockInstrumentConfig.assetFilters, maxAssets: 1 }
      };

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          instrumentConfig={limitedConfig}
        />
      );

      await user.click(screen.getByTestId('goal-quick-summary'));
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Selected: 0 of 1')).toBeInTheDocument();
      });

      // Select first asset
      await user.click(screen.getByTestId('asset-1'));
      expect(screen.getByText('Selected: 1 of 1')).toBeInTheDocument();

      // Second asset should be disabled or show warning
      await user.click(screen.getByTestId('asset-2'));
      
      // Should still show only 1 selected (limit enforced)
      expect(screen.getByText('Selected: 1 of 1')).toBeInTheDocument();
    });

    test('validates required vs optional parameters correctly', async () => {
      const user = userEvent.setup();
      
      const configWithOptionalParam = {
        ...mockInstrumentConfig,
        goals: [{
          id: 'mixed-params',
          title: 'Mixed Parameters Goal',
          parameters: [
            {
              id: 'required-param',
              type: 'select' as const,
              label: 'Required Parameter',
              required: true,
              options: [{ value: 'option1', label: 'Option 1' }]
            },
            {
              id: 'optional-param',
              type: 'select' as const,
              label: 'Optional Parameter',
              required: false,
              options: [{ value: 'option2', label: 'Option 2' }]
            }
          ]
        }]
      };

      render(
        <InstrumentPlayWizard
          isOpen={true}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          instrumentConfig={configWithOptionalParam}
        />
      );

      await user.click(screen.getByTestId('goal-mixed-params'));
      
      // Should be invalid without required parameter
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
      
      // Set only required parameter
      await user.selectOptions(screen.getByTestId('param-required-param'), 'option1');
      
      // Should become valid (optional parameter not required)
      expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
    });
  });
});