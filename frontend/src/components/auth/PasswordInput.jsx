import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AUTH_INPUT } from "./authStyles";

export function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  autoComplete = "current-password",
  disabled,
  invalid,
  describedBy,
  className,
  placeholder = "Enter your password",
  name,
}) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (typeof e.getModifierState === "function") {
        setCapsLock(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            AUTH_INPUT,
            "pr-12",
            invalid && "border-red-600 dark:border-red-500",
            className
          )}
        />
        <button
          type="button"
          tabIndex={0}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-500/40"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {capsLock && (
        <p className="text-[13px] text-muted-foreground" role="status">
          Caps Lock is on
        </p>
      )}
    </div>
  );
}
