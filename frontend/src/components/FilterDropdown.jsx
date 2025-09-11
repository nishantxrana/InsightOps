import React, { useState, useEffect, useRef } from 'react'

export default function FilterDropdown({
  options = [],
  value,
  onChange,
  icon: Icon,
  placeholder = 'Select...',
  theme = 'blue', // 'blue' or 'amber'
  minWidth = '100px'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const themeClasses = {
    blue: {
      button: 'border-border dark:border-[#1a1a1a] focus:ring-muted focus:border-border hover:border-muted-foreground',
      dropdown: 'border-border dark:border-[#1a1a1a]',
      icon: 'text-muted-foreground',
      chevron: 'text-muted-foreground',
      option: 'hover:bg-muted',
      activeOption: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
    },
    amber: {
      button: 'border-border dark:border-[#1a1a1a] focus:ring-muted focus:border-border hover:border-muted-foreground',
      dropdown: 'border-border dark:border-[#1a1a1a]',
      icon: 'text-muted-foreground',
      chevron: 'text-muted-foreground',
      option: 'hover:bg-muted',
      activeOption: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
    }
  }

  const currentTheme = themeClasses[theme]
  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption ? selectedOption.label : placeholder

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 pl-8 pr-3 py-2 border rounded-full text-xs focus:ring-1 bg-card dark:bg-[#111111] transition-all cursor-pointer shadow-sm hover:shadow-sm ${currentTheme.button}`}
        style={{ minWidth }}
      >
        {Icon && <Icon className={`h-3 w-3 absolute left-2.5 ${currentTheme.icon}`} />}
        <span className="flex-1 text-left text-foreground">
          {displayText}
        </span>
        <svg 
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''} ${currentTheme.chevron}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 bg-card dark:bg-[#111111] border rounded-lg shadow-lg z-50 py-1 min-w-[140px] ${currentTheme.dropdown}`}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                value === option.value ? currentTheme.activeOption : `text-foreground ${currentTheme.option}`
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
