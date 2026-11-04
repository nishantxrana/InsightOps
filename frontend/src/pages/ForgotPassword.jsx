import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { AuthHeader } from "@/components/auth/AuthLayout";
import { AuthField } from "@/components/auth/AuthField";
import { FormError } from "@/components/auth/FormError";
import { AUTH_CTA, AUTH_INPUT, AUTH_LINK, validateEmail } from "@/components/auth/authStyles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  const handleBlur = () => {
    setFieldError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError(emailError);
      return;
    }

    setError("");
    setFieldError("");
    setLoading(true);

    try {
      await axios.post("/api/auth/forgot-password/request-otp", { email });
      navigate("/reset-password-otp", { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthHeader
        title="Reset your password"
        subtitle="Enter your email and we will send a 6-digit code."
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthField id="email" label="Email" error={fieldError}>
          {({ describedBy, invalid }) => (
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleBlur}
              disabled={loading}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className={cn(AUTH_INPUT, invalid && "border-red-600 dark:border-red-500")}
            />
          )}
        </AuthField>

        <div className="space-y-6 pt-1">
          <FormError message={error} />
          <Button type="submit" disabled={loading} className={AUTH_CTA}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending...
              </>
            ) : (
              "Send reset code"
            )}
          </Button>
        </div>

        <p className="text-center text-[14px]">
          <Link to="/signin" className={cn("font-medium", AUTH_LINK)}>
            Back to sign in
          </Link>
        </p>
      </form>
    </>
  );
}
