import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthLayout";
import { FormError } from "@/components/auth/FormError";
import { OtpInput } from "@/components/auth/OtpInput";
import { AUTH_CTA, AUTH_LINK, formatResendTimer } from "@/components/auth/authStyles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [success, setSuccess] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const email = location.state?.email;
  const name = location.state?.name;

  useEffect(() => {
    if (!email) {
      navigate("/signup");
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
    if (!success) {
      document.getElementById("otp")?.focus?.();
    }
  }, [success]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");
    setResendStatus("");

    try {
      const response = await axios.post("/api/auth/signup/verify-otp", { email, otp });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setSuccess(true);
      window.dispatchEvent(new CustomEvent("auth:pulse"));
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Invalid verification code. Please try again.";
      setError(errorMessage);
      setOtp("");

      if (
        errorMessage.includes("session expired") ||
        errorMessage.includes("Too many failed attempts") ||
        err.response?.status === 429
      ) {
        setTimeout(() => {
          navigate("/signup");
        }, 3000);
      }
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
      await axios.post("/api/auth/signup/resend-otp", { email });
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
        <AuthHeader
          title="Email verified"
          subtitle={
            name
              ? `Account created for ${name}. Redirecting to the dashboard...`
              : "Account created. Redirecting to the dashboard..."
          }
        />
        <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Setting up workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
      <AuthHeader
        eyebrow="Step 2 of 2: Verify email"
        title="Check your email"
        subtitle={
          <>
            We sent a 6-digit code to <span className="font-mono text-foreground">{email}</span>.{" "}
            <Link to="/signup" className={cn("font-medium", AUTH_LINK)}>
              Change email
            </Link>
          </>
        }
      />

      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-[14px] font-medium text-foreground">Verification code</p>
          <OtpInput
            id="otp"
            value={otp}
            onChange={(v) => {
              setOtp(v);
              if (error) setError("");
            }}
            disabled={loading}
            error={error}
            success={success}
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
            onClick={handleVerify}
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
        </div>
      </div>
    </div>
  );
}
