import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ReleaseFilterDropdown = ({ 
  options, 
  value, 
  onChange, 
  icon: Icon, 
  placeholder = "Select...",
  minWidth = "120px" 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative dropdown-container" style={{ minWidth }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-8 pr-3 py-2 border border-border rounded-full text-xs focus:ring-1 focus:ring-muted focus:border-border bg-card dark:bg-[#111111] hover:border-muted-foreground transition-all cursor-pointer shadow-sm hover:shadow-sm w-full"
      >
        <Icon className="h-3 w-3 absolute left-2.5 text-muted-foreground" />
        <span className="flex-1 text-left text-foreground truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card dark:bg-[#111111] border border-border dark:border-[#1a1a1a] rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
          {options.map(option => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                value === option.value ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReleaseFilterDropdown;
