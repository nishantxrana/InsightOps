import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Oops! Something went wrong</h3>
        <p className="text-gray-600 mb-8 leading-relaxed">{message || "We encountered an unexpected error. Please try again."}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  )
}
