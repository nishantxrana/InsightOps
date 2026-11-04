import { useEffect, useRef, useState, useContext } from "react";
import { OTPInputContext } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

function AuthOtpSlot({ index, error, success }) {
  const ctx = useContext(OTPInputContext);
  const filled = Boolean(ctx?.slots?.[index]?.char);

  return (
    <InputOTPSlot
      index={index}
      className={cn(
        "h-[50px] w-[50px] rounded-lg border border-landing-hairline bg-landing-surface font-mono text-xl text-foreground shadow-none transition-colors",
        "first:rounded-lg first:border-l last:rounded-lg",
        filled && !error && !success && "border-foreground/25",
        error && "border-red-600 dark:border-red-500",
        success && "border-emerald-600 dark:border-emerald-500",
        "ring-azure-500/40 data-[active]:ring-2"
      )}
    />
  );
}

/**
 * 6-digit OTP — discrete 50px boxes, 8px gap.
 * Explicit submit stays on the page — no auto-submit.
 */
export function OtpInput({ id = "otp", value, onChange, disabled, error, success }) {
  const [shake, setShake] = useState(false);
  const prevError = useRef("");

  useEffect(() => {
    if (error && error !== prevError.current) {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        setShake(true);
        const t = setTimeout(() => setShake(false), 400);
        prevError.current = error;
        return () => clearTimeout(t);
      }
      prevError.current = error;
    }
    if (!error) prevError.current = "";
  }, [error]);

  return (
    <div className={cn("flex justify-center", shake && "auth-otp-shake")}>
      <InputOTP
        id={id}
        maxLength={6}
        value={value}
        onChange={onChange}
        disabled={disabled || success}
        autoComplete="one-time-code"
        inputMode="numeric"
        containerClassName="gap-2"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <InputOTPGroup className="gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <AuthOtpSlot key={i} index={i} error={!!error} success={!!success} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
