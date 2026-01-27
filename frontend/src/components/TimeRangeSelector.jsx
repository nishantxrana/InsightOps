import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const TIME_RANGES = [
  { label: "12 Hours", value: "12h", hours: 12 },
  { label: "1 Day", value: "1d", hours: 24 },
  { label: "7 Days", value: "7d", hours: 24 * 7 },
  { label: "15 Days", value: "15d", hours: 24 * 15 },
  { label: "30 Days", value: "30d", hours: 24 * 30 },
  { label: "Custom", value: "custom", hours: null },
];

export default function TimeRangeSelector({ value, onChange }) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [startDate, setStartDate] = useState(value?.from || null);
  const [endDate, setEndDate] = useState(value?.to || null);
  const [selectingStart, setSelectingStart] = useState(true);

  useEffect(() => {
    setStartDate(value?.from || null);
    setEndDate(value?.to || null);
  }, [value]);

  const handleRangeSelect = (range) => {
    if (range.value === "custom") {
      setShowCustom(true);
      setSelectingStart(true);
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
      if (endDate > now) {
        toast({
          title: "Invalid Date Range",
          description: "End date cannot be in the future.",
          variant: "destructive",
        });
        return;
      }
      const diffDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        toast({
          title: "Date Range Too Large",
          description: "Please select 90 days or less.",
          variant: "destructive",
        });
        return;
      }
      const from = startDate < endDate ? startDate : endDate;
      const to = startDate < endDate ? endDate : startDate;
      onChange({
        from,
        to,
        label: `${format(from, "MMM dd")} - ${format(to, "MMM dd")}`,
        value: "custom",
      });
      setShowCustom(false);
    }
  };

  const getCurrentLabel = () => value?.label || "30 Days";

  // Mobile: Use Sheet for custom date selection
  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-between min-w-[140px] bg-background rounded-full touch-manipulation"
            >
              <span className="text-sm">{getCurrentLabel()}</span>
              <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[160px] p-2" align="start" collisionPadding={16}>
            <div className="space-y-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleRangeSelect(range)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors touch-manipulation ${
                    value?.value === range.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted active:bg-muted"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Sheet open={showCustom} onOpenChange={setShowCustom}>
          <SheetContent side="bottom" className="h-auto max-h-[85dvh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Select Date Range</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-4">
              <div className="flex gap-2">
                <Button
                  variant={selectingStart ? "default" : "outline"}
                  onClick={() => setSelectingStart(true)}
                  className="flex-1 touch-manipulation"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "MMM dd") : "Start"}
                </Button>
                <Button
                  variant={!selectingStart ? "default" : "outline"}
                  onClick={() => setSelectingStart(false)}
                  className="flex-1 touch-manipulation"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "MMM dd") : "End"}
                </Button>
              </div>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectingStart ? startDate : endDate}
                  onSelect={(date) => {
                    if (selectingStart) {
                      setStartDate(date);
                      setSelectingStart(false);
                    } else {
                      setEndDate(date);
                    }
                  }}
                  className="rounded-md border"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCustom(false)}
                  className="flex-1 touch-manipulation"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyCustomRange}
                  disabled={!startDate || !endDate}
                  className="flex-1 touch-manipulation"
                >
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop: Use Popovers
  return (
    <div className="flex items-center gap-2">
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
        <PopoverContent className="w-[140px] p-2" align="start" collisionPadding={16}>
          <div className="space-y-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => handleRangeSelect(range)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  value?.value === range.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {showCustom && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM dd, yyyy") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" collisionPadding={16}>
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" collisionPadding={16}>
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Button onClick={handleApplyCustomRange} disabled={!startDate || !endDate} size="sm">
            Apply
          </Button>
          <Button onClick={() => setShowCustom(false)} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
