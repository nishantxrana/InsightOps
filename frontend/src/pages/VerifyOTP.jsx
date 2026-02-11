import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Loader2, CheckCircle2, ArrowLeft, Mail } from "lucide-react";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
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
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post("/api/auth/signup/verify-otp", { email, otp });
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Invalid verification code. Please try again.";
      setError(errorMessage);
      setOtp("");

      // If session expired or too many attempts, redirect to signup
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

    try {
      await axios.post("/api/auth/signup/resend-otp", { email });
      setCanResend(false);
      setResendTimer(60);
      setOtp("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-4 overflow-y-auto">
        <div className="w-full max-w-md my-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg text-center">
          <div className="mx-auto mb-6 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Account Created!
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Welcome to InsightOps, {name}! Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-4 overflow-y-auto">
      <div className="w-full max-w-md my-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Verify Your Email
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-slate-900 dark:text-white">{email}</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg">
          <div className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert
                variant="destructive"
                className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
              >
                <AlertDescription className="text-red-800 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* OTP Input */}
            <div className="space-y-3">
              <Label htmlFor="otp" className="text-slate-900 dark:text-white font-medium">
                Verification Code
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  id="otp"
                  disabled={loading}
                  className="gap-2"
                >
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={0}
                      className="w-12 h-12 text-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <InputOTPSlot
                      index={1}
                      className="w-12 h-12 text-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <InputOTPSlot
                      index={2}
                      className="w-12 h-12 text-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={3}
                      className="w-12 h-12 text-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <InputOTPSlot
                      index={4}
                      className="w-12 h-12 text-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <InputOTPSlot
                      index={5}
                      className="w-12 h-12 text-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Code expires in 10 minutes
              </p>
            </div>

            {/* Verify Button */}
            <Button
              type="button"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
              onClick={handleVerify}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>

            {/* Resend Section */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Didn't receive the code?
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={!canResend || resending}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    {canResend ? "Resend Code" : `Resend in ${resendTimer}s`}
                  </>
                )}
              </Button>
            </div>

            {/* Back Link */}
            <div className="text-center pt-2">
              <button
                onClick={() => navigate("/signup")}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Wrong email? Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
