'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Volume2 } from 'lucide-react';
import { summarizeDocumentAPI } from '@/lib/api/claude-client';
import type { DocumentSummaryRequest, DocumentSummaryResponse } from '@/types/claude';

interface DocumentSummarizerProps {
  initialContent?: string;
  fileName?: string;
  onSummaryGenerated?: (summary: string, audioScript?: string) => void;
}

export default function DocumentSummarizer({
  initialContent = '',
  fileName = 'Board Document',
  onSummaryGenerated,
}: DocumentSummarizerProps) {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DocumentSummaryResponse | null>(null);
  const [options, setOptions] = useState({
    includeKeyPoints: true,
    includeActionItems: true,
    maxLength: 'medium' as const,
    generateAudio: false,
  });

  const handleSummarize = async () => {
    if (!content.trim()) {
      alert('Please provide document content to summarize.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    const request: DocumentSummaryRequest = {
      content: content.trim(),
      fileName,
      ...options,
    };

    try {
      const response = await summarizeDocumentAPI(request);
      setResult(response);

      if (response.success && response.summary) {
        onSummaryGenerated?.(response.summary, response.audioScript);
      }
    } catch (error) {
      console.error('Error summarizing document:', error);
      setResult({
        success: false,
        error: 'Failed to summarize document',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI Document Summarizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Document Content
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your board document content here..."
              className="min-h-32"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Summary Length
              </label>
              <select
                value={options.maxLength}
                onChange={(e) =>
                  setOptions({ ...options, maxLength: e.target.value as 'short' | 'medium' | 'long' })
                }
                disabled={isLoading}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="short">Short (2-3 paragraphs)</option>
                <option value="medium">Medium (4-6 paragraphs)</option>
                <option value="long">Long (Comprehensive)</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keyPoints"
                  checked={options.includeKeyPoints}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeKeyPoints: !!checked })
                  }
                  disabled={isLoading}
                />
                <label htmlFor="keyPoints" className="text-sm font-medium">
                  Include Key Points & Risks
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="actionItems"
                  checked={options.includeActionItems}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, includeActionItems: !!checked })
                  }
                  disabled={isLoading}
                />
                <label htmlFor="actionItems" className="text-sm font-medium">
                  Include Action Items
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generateAudio"
                  checked={options.generateAudio}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, generateAudio: !!checked })
                  }
                  disabled={isLoading}
                />
                <label htmlFor="generateAudio" className="text-sm font-medium flex items-center gap-1">
                  <Volume2 className="h-4 w-4" />
                  Generate Audio Script
                </label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSummarize}
            disabled={isLoading || !content.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              'Generate Summary'
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.success ? 'Summary Generated' : 'Error'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                {result.summary && (
                  <div>
                    <h4 className="font-semibold mb-2">Document Summary</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm">
                        {result.summary}
                      </pre>
                    </div>
                  </div>
                )}

                {result.audioScript && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Audio Script
                    </h4>
                    <div className="bg-blue-50 p-4 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm">
                        {result.audioScript}
                      </pre>
                    </div>
                  </div>
                )}

                {result.usage && (
                  <div className="text-sm text-gray-600">
                    <p>
                      Token Usage: {result.usage.input_tokens} input, {result.usage.output_tokens} output
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">{result.error}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}