import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Brain,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { releaseService } from '../api/releaseService';

const AIReleaseInsights = ({ enabled = false, onToggle }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (enabled && !analysis) {
      loadAIAnalysis();
    }
  }, [enabled]);

  const loadAIAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await releaseService.getAIAnalysis();
      if (response.success) {
        setAnalysis(response.data);
      }
    } catch (err) {
      console.error('Failed to load AI analysis:', err);
      setError('Failed to generate AI insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setAnalysis(null);
    loadAIAnalysis();
  };

  return (
    <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-xl font-semibold text-foreground">AI Release Insights</h3>
        </div>
        <div className="flex items-center gap-3">
          {enabled && analysis && (
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          <button
            onClick={onToggle}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              enabled
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {enabled ? 'Enabled' : 'Enable AI Insights'}
          </button>
        </div>
      </div>

      {!enabled ? (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">AI Insights Disabled</h4>
          <p className="text-muted-foreground mb-4">
            Enable AI insights to get intelligent analysis of your release patterns and recommendations for improvement.
          </p>
          <button
            onClick={onToggle}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Enable AI Insights
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-purple-600">
            <Brain className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Analyzing release patterns...</span>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">Analysis Failed</h4>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5" />{children}</h4>,
                h2: ({ children }) => <h5 className="text-base font-medium text-foreground mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4" />{children}</h5>,
                h3: ({ children }) => <h6 className="text-sm font-medium text-foreground mb-2">{children}</h6>,
                p: ({ children }) => <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="space-y-1 mb-4">{children}</ul>,
                li: ({ children }) => (
                  <li className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
              }}
            >
              {analysis.summary}
            </ReactMarkdown>
          </div>

          {analysis.generatedAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
              <Clock className="w-3 h-3" />
              <span>
                Generated on {new Date(analysis.generatedAt).toLocaleString()}
                {analysis.dataPoints && ` • Based on ${analysis.dataPoints} releases`}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AIReleaseInsights;
