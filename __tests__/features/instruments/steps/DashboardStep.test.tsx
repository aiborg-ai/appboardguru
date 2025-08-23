/**
 * Comprehensive Unit Tests for DashboardStep
 * Tests AI analysis simulation, progress tracking, results display, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import DashboardStep from '@/features/instruments/steps/DashboardStep';

// Mock Chart.js to avoid canvas issues in tests
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    data: { datasets: [] }
  }))
}));

jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }: any) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />,
  Line: ({ data, options }: any) => <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />,
  Pie: ({ data, options }: any) => <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} />,
  Doughnut: ({ data, options }: any) => <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} />
}));

const mockInstrumentConfig = {
  id: 'board-pack-ai',
  name: 'Board Pack AI',
  dashboardComponents: {
    chartTypes: ['bar', 'line', 'pie'],
    insightTypes: ['summary', 'risks', 'recommendations', 'sentiment'],
    analysisStages: [
      { id: 'parsing', name: 'Document Parsing', estimatedTime: 2000 },
      { id: 'extraction', name: 'Content Extraction', estimatedTime: 3000 },
      { id: 'analysis', name: 'AI Analysis', estimatedTime: 5000 },
      { id: 'insights', name: 'Generating Insights', estimatedTime: 2000 },
      { id: 'completion', name: 'Finalizing Results', estimatedTime: 1000 }
    ]
  }
};

const mockSelectedGoal = {
  id: 'comprehensive-analysis',
  title: 'Comprehensive Analysis',
  parameters: {
    'analysis-depth': 'deep',
    'include-sentiment': true,
    'confidence-threshold': 85
  }
};

const mockSelectedAssets = [
  {
    id: '1',
    name: 'board-pack-q1.pdf',
    type: 'pdf',
    size: 2048000
  },
  {
    id: '2',
    name: 'financial-report.xlsx',
    type: 'xlsx',
    size: 1024000
  }
];

const mockAnalysisResults = {
  insights: [
    {
      id: 'insight-1',
      type: 'summary',
      title: 'Executive Summary',
      content: 'The board pack shows strong Q1 performance with revenue growth of 15%.',
      confidence: 0.92,
      relevance: 0.88,
      sources: ['board-pack-q1.pdf']
    },
    {
      id: 'insight-2', 
      type: 'risks',
      title: 'Risk Assessment',
      content: 'Identified potential cash flow concerns in Q2 projections.',
      confidence: 0.78,
      relevance: 0.95,
      sources: ['financial-report.xlsx']
    }
  ],
  charts: [
    {
      id: 'chart-1',
      type: 'bar',
      title: 'Revenue Growth',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Revenue',
          data: [100, 115, 125, 140],
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        }]
      }
    },
    {
      id: 'chart-2',
      type: 'pie',
      title: 'Risk Distribution',
      data: {
        labels: ['Financial', 'Operational', 'Strategic'],
        datasets: [{
          data: [40, 35, 25],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56']
        }]
      }
    }
  ],
  recommendations: [
    {
      id: 'rec-1',
      title: 'Cash Flow Management',
      description: 'Implement monthly cash flow monitoring to address Q2 concerns.',
      priority: 'high',
      category: 'financial',
      actionItems: [
        'Set up weekly cash flow reports',
        'Review payment terms with suppliers',
        'Explore short-term financing options'
      ]
    },
    {
      id: 'rec-2',
      title: 'Performance Monitoring',
      description: 'Continue current growth trajectory with enhanced KPI tracking.',
      priority: 'medium',
      category: 'operational',
      actionItems: [
        'Implement dashboard for key metrics',
        'Schedule monthly performance reviews'
      ]
    }
  ],
  metadata: {
    processingTime: 12500,
    confidence: 0.87,
    documentsProcessed: 2,
    totalPages: 45,
    keywordsExtracted: 156
  }
};

const defaultProps = {
  instrumentConfig: mockInstrumentConfig,
  selectedGoal: mockSelectedGoal,
  selectedAssets: mockSelectedAssets,
  analysisResults: null,
  isAnalyzing: false,
  onAnalysisComplete: jest.fn(),
  onValidationChange: jest.fn(),
  onDataChange: jest.fn(),
  onRegenerateInsight: jest.fn(),
  onExportChart: jest.fn()
};

describe('DashboardStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Analysis Progress Tracking', () => {
    test('shows analysis initiation screen', () => {
      render(<DashboardStep {...defaultProps} />);
      
      expect(screen.getByText(/ready to analyze/i)).toBeInTheDocument();
      expect(screen.getByText(/2 documents selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start analysis/i })).toBeInTheDocument();
    });

    test('starts analysis when button is clicked', async () => {
      const user = userEvent.setup();
      const onAnalysisComplete = jest.fn();
      
      render(<DashboardStep {...defaultProps} onAnalysisComplete={onAnalysisComplete} />);
      
      await user.click(screen.getByRole('button', { name: /start analysis/i }));
      
      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
      expect(screen.getByText(/document parsing/i)).toBeInTheDocument();
    });

    test('shows progress stages during analysis', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...defaultProps} isAnalyzing={true} />);
      
      // Should show first stage
      expect(screen.getByText(/document parsing/i)).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('aria-valuenow', '0');
      
      // Advance to next stage
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.getByText(/content extraction/i)).toBeInTheDocument();
      });
    });

    test('updates progress bar correctly', async () => {
      render(<DashboardStep {...defaultProps} isAnalyzing={true} />);
      
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      
      // Progress through stages
      jest.advanceTimersByTime(2000); // Stage 1 complete (20%)
      
      await waitFor(() => {
        expect(progressBar).toHaveAttribute('aria-valuenow', '20');
      });
      
      jest.advanceTimersByTime(3000); // Stage 2 complete (40%)
      
      await waitFor(() => {
        expect(progressBar).toHaveAttribute('aria-valuenow', '40');
      });
    });

    test('shows estimated time remaining', async () => {
      render(<DashboardStep {...defaultProps} isAnalyzing={true} />);
      
      expect(screen.getByText(/estimated.*11.*seconds/i)).toBeInTheDocument();
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.getByText(/estimated.*9.*seconds/i)).toBeInTheDocument();
      });
    });

    test('completes analysis and shows results', async () => {
      const onAnalysisComplete = jest.fn();
      
      render(<DashboardStep {...defaultProps} isAnalyzing={true} onAnalysisComplete={onAnalysisComplete} />);
      
      // Fast-forward through all stages
      jest.advanceTimersByTime(13000);
      
      await waitFor(() => {
        expect(onAnalysisComplete).toHaveBeenCalledWith(expect.objectContaining({
          insights: expect.any(Array),
          charts: expect.any(Array),
          recommendations: expect.any(Array)
        }));
      });
    });

    test('handles analysis cancellation', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...defaultProps} isAnalyzing={true} />);
      
      await user.click(screen.getByRole('button', { name: /cancel analysis/i }));
      
      expect(screen.getByTestId('analysis-cancelled')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /restart analysis/i })).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    const propsWithResults = {
      ...defaultProps,
      analysisResults: mockAnalysisResults,
      isAnalyzing: false
    };

    test('displays analysis summary', () => {
      render(<DashboardStep {...propsWithResults} />);
      
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
      expect(screen.getByText(/confidence.*87%/i)).toBeInTheDocument();
      expect(screen.getByText(/2 documents processed/i)).toBeInTheDocument();
      expect(screen.getByText(/45 pages analyzed/i)).toBeInTheDocument();
    });

    test('displays insights with confidence scores', () => {
      render(<DashboardStep {...propsWithResults} />);
      
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      expect(screen.getByText(/strong Q1 performance/i)).toBeInTheDocument();
      expect(screen.getByText(/92% confidence/i)).toBeInTheDocument();
      
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText(/cash flow concerns/i)).toBeInTheDocument();
      expect(screen.getByText(/78% confidence/i)).toBeInTheDocument();
    });

    test('renders charts correctly', () => {
      render(<DashboardStep {...propsWithResults} />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
      expect(screen.getByText('Risk Distribution')).toBeInTheDocument();
    });

    test('displays recommendations with priorities', () => {
      render(<DashboardStep {...propsWithResults} />);
      
      expect(screen.getByText('Cash Flow Management')).toBeInTheDocument();
      expect(screen.getByTestId('priority-high')).toBeInTheDocument();
      expect(screen.getByText(/implement monthly cash flow monitoring/i)).toBeInTheDocument();
      
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument();
      expect(screen.getByTestId('priority-medium')).toBeInTheDocument();
    });

    test('shows action items for recommendations', () => {
      render(<DashboardStep {...propsWithResults} />);
      
      expect(screen.getByText(/set up weekly cash flow reports/i)).toBeInTheDocument();
      expect(screen.getByText(/review payment terms/i)).toBeInTheDocument();
      expect(screen.getByText(/explore short-term financing/i)).toBeInTheDocument();
    });

    test('displays source documents for insights', () => {
      render(<DashboardStep {...propsWithResults} />);
      
      const executiveSummaryInsight = screen.getByText('Executive Summary').closest('.insight-card');
      expect(within(executiveSummaryInsight!).getByText('board-pack-q1.pdf')).toBeInTheDocument();
      
      const riskAssessmentInsight = screen.getByText('Risk Assessment').closest('.insight-card');
      expect(within(riskAssessmentInsight!).getByText('financial-report.xlsx')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    const propsWithResults = {
      ...defaultProps,
      analysisResults: mockAnalysisResults
    };

    test('allows insight regeneration', async () => {
      const user = userEvent.setup();
      const onRegenerateInsight = jest.fn();
      
      render(<DashboardStep {...propsWithResults} onRegenerateInsight={onRegenerateInsight} />);
      
      const regenerateButton = screen.getAllByText(/regenerate/i)[0];
      await user.click(regenerateButton);
      
      expect(onRegenerateInsight).toHaveBeenCalledWith('insight-1');
    });

    test('supports chart export', async () => {
      const user = userEvent.setup();
      const onExportChart = jest.fn();
      
      render(<DashboardStep {...propsWithResults} onExportChart={onExportChart} />);
      
      await user.click(screen.getAllByText(/export/i)[0]);
      
      expect(onExportChart).toHaveBeenCalledWith('chart-1', 'png');
    });

    test('toggles between different chart views', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...propsWithResults} />);
      
      // Switch to table view
      await user.click(screen.getByText(/table view/i));
      
      expect(screen.getByTestId('chart-table-1')).toBeInTheDocument();
      
      // Switch back to chart view
      await user.click(screen.getByText(/chart view/i));
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    test('filters insights by type', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...propsWithResults} />);
      
      // Filter to show only risks
      await user.click(screen.getByText(/filter/i));
      await user.click(screen.getByText(/risks/i));
      
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.queryByText('Executive Summary')).not.toBeInTheDocument();
    });

    test('sorts insights by confidence score', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...propsWithResults} />);
      
      await user.click(screen.getByText(/sort/i));
      await user.click(screen.getByText(/confidence/i));
      
      const insightCards = screen.getAllByTestId(/insight-card/);
      
      // First insight should have higher confidence (92% > 78%)
      expect(within(insightCards[0]).getByText(/92% confidence/i)).toBeInTheDocument();
    });

    test('expands and collapses insight details', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...propsWithResults} />);
      
      const expandButton = screen.getAllByText(/show details/i)[0];
      await user.click(expandButton);
      
      expect(screen.getByTestId('insight-details-1')).toBeInTheDocument();
      
      await user.click(screen.getByText(/hide details/i));
      
      expect(screen.queryByTestId('insight-details-1')).not.toBeInTheDocument();
    });

    test('allows copying insights to clipboard', async () => {
      const user = userEvent.setup();
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn()
        }
      });
      
      render(<DashboardStep {...propsWithResults} />);
      
      await user.click(screen.getAllByText(/copy/i)[0]);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Executive Summary')
      );
      expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles analysis failure gracefully', async () => {
      const onAnalysisComplete = jest.fn().mockRejectedValue(new Error('Analysis failed'));
      
      render(<DashboardStep {...defaultProps} onAnalysisComplete={onAnalysisComplete} isAnalyzing={true} />);
      
      jest.advanceTimersByTime(13000);
      
      await waitFor(() => {
        expect(screen.getByTestId('analysis-error')).toBeInTheDocument();
        expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
      });
    });

    test('allows retry after analysis failure', async () => {
      const user = userEvent.setup();
      const onAnalysisComplete = jest.fn()
        .mockRejectedValueOnce(new Error('Analysis failed'))
        .mockResolvedValueOnce(mockAnalysisResults);
      
      render(<DashboardStep {...defaultProps} onAnalysisComplete={onAnalysisComplete} />);
      
      // Start analysis (will fail)
      await user.click(screen.getByRole('button', { name: /start analysis/i }));
      
      jest.advanceTimersByTime(13000);
      
      await waitFor(() => {
        expect(screen.getByTestId('analysis-error')).toBeInTheDocument();
      });
      
      // Retry analysis
      await user.click(screen.getByRole('button', { name: /retry analysis/i }));
      
      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument();
    });

    test('handles missing analysis results', () => {
      render(<DashboardStep {...defaultProps} analysisResults={null} />);
      
      expect(screen.getByText(/no analysis results available/i)).toBeInTheDocument();
    });

    test('handles empty analysis results', () => {
      const emptyResults = {
        insights: [],
        charts: [],
        recommendations: [],
        metadata: { processingTime: 0, confidence: 0, documentsProcessed: 0 }
      };
      
      render(<DashboardStep {...defaultProps} analysisResults={emptyResults} />);
      
      expect(screen.getByText(/no insights generated/i)).toBeInTheDocument();
    });

    test('handles chart rendering errors', () => {
      const resultsWithInvalidChart = {
        ...mockAnalysisResults,
        charts: [{
          id: 'invalid-chart',
          type: 'invalid-type',
          title: 'Invalid Chart',
          data: null
        }]
      };
      
      render(<DashboardStep {...defaultProps} analysisResults={resultsWithInvalidChart} />);
      
      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for progress', () => {
      render(<DashboardStep {...defaultProps} isAnalyzing={true} />);
      
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-label', expect.stringMatching(/analysis progress/i));
    });

    test('announces progress updates', async () => {
      render(<DashboardStep {...defaultProps} isAnalyzing={true} />);
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/content extraction.*20%/i);
      });
    });

    test('has accessible chart descriptions', () => {
      render(<DashboardStep {...defaultProps} analysisResults={mockAnalysisResults} />);
      
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('aria-label', expect.stringMatching(/revenue growth/i));
    });

    test('supports keyboard navigation for insights', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...defaultProps} analysisResults={mockAnalysisResults} />);
      
      // Tab to first insight
      await user.tab();
      expect(screen.getByTestId('insight-card-insight-1')).toHaveFocus();
      
      // Use arrow keys to navigate
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('insight-card-insight-2')).toHaveFocus();
    });

    test('has proper heading hierarchy', () => {
      render(<DashboardStep {...defaultProps} analysisResults={mockAnalysisResults} />);
      
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/analysis results/i);
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3); // Insights, Charts, Recommendations
    });
  });

  describe('Performance', () => {
    test('lazy loads chart components', () => {
      render(<DashboardStep {...defaultProps} analysisResults={mockAnalysisResults} />);
      
      // Charts should be in viewport observer
      expect(screen.getByTestId('chart-lazy-loader-1')).toBeInTheDocument();
    });

    test('debounces insight filtering', async () => {
      const user = userEvent.setup();
      
      render(<DashboardStep {...defaultProps} analysisResults={mockAnalysisResults} />);
      
      const searchInput = screen.getByPlaceholderText(/search insights/i);
      
      // Type quickly
      await user.type(searchInput, 'summary', { delay: 50 });
      
      // Should debounce and only filter after typing stops
      await waitFor(() => {
        expect(screen.getByText('Executive Summary')).toBeInTheDocument();
        expect(screen.queryByText('Risk Assessment')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });

    test('virtualizes large result sets', () => {
      const largeResults = {
        ...mockAnalysisResults,
        insights: Array.from({ length: 100 }, (_, i) => ({
          ...mockAnalysisResults.insights[0],
          id: `insight-${i}`,
          title: `Insight ${i}`
        }))
      };
      
      render(<DashboardStep {...defaultProps} analysisResults={largeResults} />);
      
      // Should only render visible insights
      const insightCards = screen.getAllByTestId(/insight-card/);
      expect(insightCards.length).toBeLessThan(20);
    });

    test('memoizes chart data to prevent re-renders', () => {
      const { rerender } = render(<DashboardStep {...defaultProps} analysisResults={mockAnalysisResults} />);
      
      const initialChart = screen.getByTestId('bar-chart');
      
      // Re-render with same data
      rerender(<DashboardStep {...defaultProps} analysisResults={mockAnalysisResults} />);
      
      // Chart should not re-render
      expect(screen.getByTestId('bar-chart')).toBe(initialChart);
    });
  });
});