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
      button: 'border-gray-200 focus:ring-gray-100 focus:border-gray-300 hover:border-gray-300',
      dropdown: 'border-gray-200',
      icon: 'text-gray-400',
      chevron: 'text-gray-400',
      option: 'hover:bg-gray-50',
      activeOption: 'bg-blue-50 text-blue-700'
    },
    amber: {
      button: 'border-amber-200 focus:ring-amber-100 focus:border-amber-300 hover:border-amber-300',
      dropdown: 'border-amber-200',
      icon: 'text-amber-500',
      chevron: 'text-amber-500',
      option: 'hover:bg-amber-50',
      activeOption: 'bg-amber-50 text-amber-700'
    }
  }

  const currentTheme = themeClasses[theme]
  const selectedOption = options.find(opt => opt.value === value)
  const displayText = selectedOption ? selectedOption.label : placeholder

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 pl-8 pr-3 py-2 border rounded-full text-xs focus:ring-1 bg-white transition-all cursor-pointer shadow-sm hover:shadow-sm ${currentTheme.button}`}
        style={{ minWidth }}
      >
        {Icon && <Icon className={`h-3 w-3 absolute left-2.5 ${currentTheme.icon}`} />}
        <span className="flex-1 text-left">
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
        <div className={`absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[140px] ${currentTheme.dropdown}`}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                value === option.value ? currentTheme.activeOption : `text-gray-700 ${currentTheme.option}`
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
