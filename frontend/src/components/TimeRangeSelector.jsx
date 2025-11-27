import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const TIME_RANGES = [
  { label: '12 Hours', value: '12h', hours: 12 },
  { label: '1 Day', value: '1d', hours: 24 },
  { label: '7 Days', value: '7d', hours: 24 * 7 },
  { label: '15 Days', value: '15d', hours: 24 * 15 },
  { label: '30 Days', value: '30d', hours: 24 * 30 },
  { label: 'Custom', value: 'custom', hours: null },
];

export default function TimeRangeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: value?.from || null,
    to: value?.to || null,
  });

  const handleRangeSelect = (range) => {
    if (range.value === 'custom') {
      setShowCalendar(true);
      setIsOpen(false);
    } else {
      const to = new Date();
      const from = new Date(to.getTime() - range.hours * 60 * 60 * 1000);
      onChange({ from, to, label: range.label, value: range.value });
      setIsOpen(false);
      setShowCalendar(false);
    }
  };

  const handleDateRangeSelect = (range) => {
    if (range?.from && range?.to) {
      setDateRange(range);
      onChange({ 
        from: range.from, 
        to: range.to, 
        label: `${format(range.from, 'MMM dd')} - ${format(range.to, 'MMM dd')}`,
        value: 'custom' 
      });
      setShowCalendar(false);
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
            className="justify-between min-w-[140px] bg-background"
          >
            <span className="text-sm">{getCurrentLabel()}</span>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
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

      {/* Custom Date Range Calendar */}
      {showCalendar && (
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'LLL dd, y')} -{' '}
                    {format(dateRange.to, 'LLL dd, y')}
                  </>
                ) : (
                  format(dateRange.from, 'LLL dd, y')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
