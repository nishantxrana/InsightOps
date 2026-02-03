import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "./badge";
import { Input } from "./input";

export function TagInput({ value = [], onChange, placeholder = "Add item..." }) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const cleanValue = inputValue.trim().replace(/,$/g, ""); // Remove trailing comma
      if (cleanValue && !value.includes(cleanValue)) {
        onChange([...value, cleanValue]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:bg-muted rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-6"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">Press Enter or comma to add</p>
    </div>
  );
}
