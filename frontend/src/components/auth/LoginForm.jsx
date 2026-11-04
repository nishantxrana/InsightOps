import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthField } from "./AuthField";
import { FormError } from "./FormError";
import { PasswordInput } from "./PasswordInput";
import { AUTH_CTA, AUTH_INPUT, AUTH_LINK, validateEmail } from "./authStyles";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const validateField = (field, value) => {
    if (field === "email") return validateEmail(value);
    if (field === "password") return value ? "" : "Password is required";
    return "";
  };

  const handleBlur = (field, value) => {
    const message = validateField(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = {
      email: validateField("email", email),
      password: validateField("password", password),
    };
    const cleaned = Object.fromEntries(Object.entries(fieldErrors).filter(([, v]) => v));
    if (Object.keys(cleaned).length) {
      setErrors(cleaned);
      return;
    }

    setLoading(true);
    setErrors({});

    const result = await login(email, password);

    if (!result.success) {
      if (result.error === "Validation failed" && result.details) {
        const next = {};
        result.details.forEach((detail) => {
          next[detail.field] = detail.message;
        });
        setErrors(next);
      } else {
        setErrors({ general: result.error });
      }
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AuthField id="email" label="Email" error={errors.email}>
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
            onBlur={() => handleBlur("email", email)}
            disabled={loading}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(AUTH_INPUT, invalid && "border-red-600 dark:border-red-500")}
          />
        )}
      </AuthField>

      <AuthField
        id="password"
        label="Password"
        error={errors.password}
        labelAside={
          <Link to="/forgot-password" className={cn("text-[14px]", AUTH_LINK)}>
            Forgot password?
          </Link>
        }
      >
        {({ describedBy, invalid }) => (
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur("password", password)}
            disabled={loading}
            invalid={invalid}
            describedBy={describedBy}
          />
        )}
      </AuthField>

      <div className="space-y-6 pt-1">
        <FormError message={errors.general} />
        <Button type="submit" disabled={loading} className={AUTH_CTA}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </div>
    </form>
  );
};
