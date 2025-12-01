import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const TIME_RANGES = [
  { label: '12 Hours', value: '12h', hours: 12 },
  { label: '1 Day', value: '1d', hours: 24 },
  { label: '7 Days', value: '7d', hours: 24 * 7 },
  { label: '15 Days', value: '15d', hours: 24 * 15 },
  { label: '30 Days', value: '30d', hours: 24 * 30 },
  { label: 'Custom', value: 'custom', hours: null },
];

export default function TimeRangeSelector({ value, onChange }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState(value?.from || null);
  const [endDate, setEndDate] = useState(value?.to || null);

  // Sync local state with prop changes
  useEffect(() => {
    setStartDate(value?.from || null);
    setEndDate(value?.to || null);
  }, [value]);

  const handleRangeSelect = (range) => {
    if (range.value === 'custom') {
      setShowCustom(true);
      setIsOpen(false);
    } else {
      const to = new Date();
      const from = new Date(to.getTime() - range.hours * 60 * 60 * 1000);
      onChange({ from, to, label: range.label, value: range.value });
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (startDate && endDate) {
      const now = new Date();
      
      // Check if end date is in the future
      if (endDate > now) {
        toast({
          title: "Invalid Date Range",
          description: "End date cannot be in the future. Please select a date up to today.",
          variant: "destructive",
        });
        return;
      }
      
      // Calculate difference in days
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Check if range exceeds 90 days (3 months)
      if (diffDays > 90) {
        toast({
          title: "Date Range Too Large",
          description: "Please select a date range of 3 months (90 days) or less to avoid excessive data load.",
          variant: "destructive",
        });
        return;
      }

      // Ensure start is before end
      const from = startDate < endDate ? startDate : endDate;
      const to = startDate < endDate ? endDate : startDate;
      
      onChange({ 
        from, 
        to, 
        label: `${format(from, 'MMM dd')} - ${format(to, 'MMM dd')}`,
        value: 'custom' 
      });
      setShowCustom(false);
    }
  };

  const getCurrentLabel = () => {
    if (value?.label) return value.label;
    return '30 Days'; // Default
  };

  return (
    <div className="flex items-center gap-2">
      {/* Predefined Range Selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-between min-w-[140px] bg-background rounded-full"
          >
            <span className="text-sm">{getCurrentLabel()}</span>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[140px] p-2" align="start">
          <div className="space-y-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => handleRangeSelect(range)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  value?.value === range.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Custom Date Range with Separate Pickers */}
      {showCustom && (
        <div className="flex items-center gap-2">
          {/* Start Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'MMM dd, yyyy') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* End Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'MMM dd, yyyy') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Apply Button */}
          <Button 
            onClick={handleApplyCustomRange}
            disabled={!startDate || !endDate}
            size="sm"
          >
            Apply
          </Button>

          {/* Cancel Button */}
          <Button 
            onClick={() => setShowCustom(false)}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
