import React from 'react'

export default function SkeletonCard() {
  return (
    <div className="bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-muted">
            <div className="h-6 w-6 bg-muted-foreground/20 rounded"></div>
          </div>
          <div className="ml-4">
            <div className="h-4 bg-muted-foreground/20 rounded w-20 mb-2"></div>
            <div className="h-6 bg-muted-foreground/20 rounded w-8"></div>
          </div>
        </div>
        <div className="h-4 bg-muted-foreground/20 rounded w-16"></div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] shadow rounded-lg overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-border">
        <div className="h-6 bg-muted-foreground/20 rounded w-32"></div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-muted-foreground/20 rounded"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-48"></div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-6 bg-muted-foreground/20 rounded w-16"></div>
                <div className="h-6 bg-muted-foreground/20 rounded w-20"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
