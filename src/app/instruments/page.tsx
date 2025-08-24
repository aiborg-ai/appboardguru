/**
 * Instruments Selection Page
 * Main entry point for choosing which instrument to play
 */

'use client';

import React from 'react';
import Link from 'next/link';
// Using simple HTML elements for now - will replace with proper components later
import { 
  TrendingUp, 
  Shield, 
  FileText, 
  Users, 
  Target, 
  Calendar,
  BarChart3,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';

// Import instrument configurations
import { getAllInstrumentConfigs } from '@/lib/instruments/instrument-configs';

const INSTRUMENT_ICONS = {
  'board-pack-ai': TrendingUp,
  'compliance-navigator': Shield,
  'document-analyzer': FileText,
  'stakeholder-mapper': Users,
  'strategic-planner': Target,
  'meeting-optimizer': Calendar,
  'performance-tracker': BarChart3,
  'risk-assessor': AlertTriangle,
  'governance-auditor': CheckSquare,
};

export default function InstrumentsPage() {
  const instruments = getAllInstrumentConfigs();

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Governance Instruments
          </h1>
          <p className="text-xl text-gray-600">
            Choose an instrument to analyze your board data and generate insights
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {instruments.map((config) => {
            const Icon = INSTRUMENT_ICONS[config.id as keyof typeof INSTRUMENT_ICONS];
            
            return (
              <div key={config.id} className="group relative overflow-hidden bg-white rounded-xl border shadow-sm transition-all hover:shadow-lg p-6">
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="rounded-lg bg-blue-100 p-2">
                      {Icon && <Icon className="h-6 w-6 text-blue-600" />}
                    </div>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                      {config.goals.length} goals
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {config.name}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {config.description}
                  </p>
                </div>

                <div className="mb-6 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Available Goals:</h4>
                  <div className="flex flex-wrap gap-1">
                    {config.goals.slice(0, 3).map((goal) => (
                      <span key={goal.id} className="inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700">
                        {goal.title}
                      </span>
                    ))}
                    {config.goals.length > 3 && (
                      <span className="inline-flex items-center rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700">
                        +{config.goals.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Supports {config.assetFilters.supportedTypes?.join(', ') || 'all'} files
                  </div>
                  <Link href={`/instruments/${config.id}/play`}>
                    <button className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                      Play Instrument
                    </button>
                  </Link>
                </div>

                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent to-blue-50/50 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500">
            Each instrument provides a guided 4-step workflow: Goal Selection → Asset Selection → Analysis Dashboard → Save & Share
          </p>
        </div>
      </div>
    </div>
  );
}