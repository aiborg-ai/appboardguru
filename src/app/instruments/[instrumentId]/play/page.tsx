/**
 * Instrument Play Page
 * Dynamic route that loads the appropriate instrument workflow
 */

'use client';

import React from 'react';
import InstrumentPlayWizard from '@/features/instruments/InstrumentPlayWizard';
import { INSTRUMENTS } from '@/lib/instruments/instrument-configs';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    instrumentId: string;
  };
}

export default function InstrumentPlayPage({ params }: PageProps) {
  const { instrumentId } = params;
  
  // Validate instrument exists
  if (!INSTRUMENTS[instrumentId]) {
    notFound();
  }
  
  return (
    <div className="min-h-screen">
      <InstrumentPlayWizard instrumentId={instrumentId} />
    </div>
  );
}