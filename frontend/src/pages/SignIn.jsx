import { Link } from "react-router-dom";
import { AuthHeader } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { AUTH_LINK } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

export default function SignIn() {
  return (
    <>
      <AuthHeader
        title="Sign in to InsightOps"
        subtitle="Enter your email and password to continue."
      />
      <LoginForm />
      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        No account?{" "}
        <Link to="/signup" className={cn("font-medium", AUTH_LINK)}>
          Create account
        </Link>
      </p>
    </>
  );
}
