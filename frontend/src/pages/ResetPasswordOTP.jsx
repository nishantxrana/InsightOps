import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthLayout";
import { AuthField } from "@/components/auth/AuthField";
import { FormError } from "@/components/auth/FormError";
import { OtpInput } from "@/components/auth/OtpInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  AUTH_CTA,
  AUTH_LINK,
  PASSWORD_RULES_HINT,
  formatResendTimer,
  validatePassword,
} from "@/components/auth/authStyles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ResetPasswordOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [resendStatus, setResendStatus] = useState("");
  const [success, setSuccess] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
    setCanResend(true);
  }, [resendTimer]);

  useEffect(() => {
    if (step === 1 && !success) {
      document.getElementById("otp-reset")?.focus?.();
    }
    if (step === 2 && !success) {
      document.getElementById("password")?.focus?.();
    }
  }, [step, success]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");
    setResendStatus("");

    try {
      await axios.post("/api/auth/forgot-password/verify-otp", { email, otp });
      setStep(2);
      setError("");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Invalid reset code. Please try again.";
      setError(errorMessage);
      setOtp("");

      if (
        errorMessage.includes("session expired") ||
        errorMessage.includes("Too many failed attempts") ||
        err.response?.status === 429
      ) {
        setTimeout(() => {
          navigate("/forgot-password");
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlurPassword = () => {
    const msg = validatePassword(password);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) next.password = msg;
      else delete next.password;
      return next;
    });
  };

  const handleBlurConfirm = () => {
    const msg = !confirmPassword
      ? "Confirm your password"
      : password !== confirmPassword
        ? "Passwords do not match"
        : "";
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) next.confirmPassword = msg;
      else delete next.confirmPassword;
      return next;
    });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    const passwordError = validatePassword(password);
    const confirmError = !confirmPassword
      ? "Confirm your password"
      : password !== confirmPassword
        ? "Passwords do not match"
        : "";

    if (passwordError || confirmError) {
      setFieldErrors({
        ...(passwordError ? { password: passwordError } : {}),
        ...(confirmError ? { confirmPassword: confirmError } : {}),
      });
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      await axios.post("/api/auth/forgot-password/reset", { email, password });
      setSuccess(true);
      window.dispatchEvent(new CustomEvent("auth:pulse"));
      setTimeout(() => {
        navigate("/signin");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    setError("");
    setResendStatus("");

    try {
      await axios.post("/api/auth/forgot-password/resend-otp", { email });
      setCanResend(false);
      setResendTimer(60);
      setOtp("");
      setResendStatus("Code sent. Check your inbox.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-start gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        <CheckCircle2
          className="size-8 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <AuthHeader title="Password updated" subtitle="Redirecting to sign in..." />
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        <AuthHeader
          eyebrow="Step 1 of 2: Verify"
          title="Check your email"
          subtitle={
            <>
              We sent a 6-digit code to <span className="font-mono text-foreground">{email}</span>.{" "}
              <Link to="/forgot-password" className={cn("font-medium", AUTH_LINK)}>
                Change email
              </Link>
            </>
          }
        />

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[14px] font-medium text-foreground">Reset code</p>
            <OtpInput
              id="otp-reset"
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (error) setError("");
              }}
              disabled={loading}
              error={error}
            />
            <p className="text-center text-[13px] text-muted-foreground">
              Code expires in 10 minutes
            </p>
          </div>

          <div className="space-y-6 pt-1">
            <FormError message={error} />
            <Button
              type="button"
              className={AUTH_CTA}
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </div>

          <div className="space-y-2 text-center text-[14px] text-muted-foreground">
            <p aria-live="polite">
              Didn&apos;t get a code?{" "}
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className={cn("font-medium disabled:opacity-50", AUTH_LINK)}
                >
                  {resending ? "Sending..." : "Resend"}
                </button>
              ) : (
                <span>Resend code in {formatResendTimer(resendTimer)}</span>
              )}
            </p>
            {resendStatus ? (
              <p className="text-[13px] text-foreground" role="status">
                {resendStatus}
              </p>
            ) : null}
            <p className="text-[13px]">Check spam if you do not see it.</p>
            <p>
              <Link to="/signin" className={cn("font-medium", AUTH_LINK)}>
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
      <AuthHeader
        eyebrow="Step 2 of 2: New password"
        title="Choose a new password"
        subtitle="Use a password you have not used here before."
      />

      <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
        <AuthField
          id="password"
          label="New password"
          error={fieldErrors.password}
          helper={!fieldErrors.password ? PASSWORD_RULES_HINT : undefined}
        >
          {({ describedBy, invalid }) => (
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handleBlurPassword}
              disabled={loading}
              invalid={invalid}
              describedBy={describedBy}
            />
          )}
        </AuthField>

        <AuthField
          id="confirmPassword"
          label="Confirm password"
          error={fieldErrors.confirmPassword}
        >
          {({ describedBy, invalid }) => (
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={handleBlurConfirm}
              disabled={loading}
              invalid={invalid}
              describedBy={describedBy}
            />
          )}
        </AuthField>

        <div className="space-y-6 pt-1">
          <FormError message={error} />
          <Button type="submit" disabled={loading} className={AUTH_CTA}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
