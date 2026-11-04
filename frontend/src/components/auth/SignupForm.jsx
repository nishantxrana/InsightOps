import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthField } from "./AuthField";
import { FormError } from "./FormError";
import { PasswordInput } from "./PasswordInput";
import {
  AUTH_CTA,
  AUTH_INPUT,
  PASSWORD_RULES_HINT,
  validateEmail,
  validatePassword,
} from "./authStyles";

export const SignupForm = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateField = (field, value) => {
    if (field === "name") return value?.trim() ? "" : "Name is required";
    if (field === "email") return validateEmail(value);
    if (field === "password") return validatePassword(value);
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
      name: validateField("name", name),
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

    try {
      await axios.post("/api/auth/signup/request-otp", {
        email,
        password,
        name,
      });

      navigate("/verify-otp", {
        state: { email, name },
      });
    } catch (error) {
      if (error.response?.data?.error === "Validation failed" && error.response?.data?.details) {
        const fieldMap = {};
        error.response.data.details.forEach((detail) => {
          fieldMap[detail.field] = detail.message;
        });
        setErrors(fieldMap);
      } else {
        setErrors({ general: error.response?.data?.error || "Signup failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AuthField id="name" label="Name" error={errors.name}>
        {({ describedBy, invalid }) => (
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur("name", name)}
            disabled={loading}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn(AUTH_INPUT, invalid && "border-red-600 dark:border-red-500")}
          />
        )}
      </AuthField>

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
        helper={!errors.password ? PASSWORD_RULES_HINT : undefined}
      >
        {({ describedBy, invalid }) => (
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
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
              Creating account...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </form>
  );
};
