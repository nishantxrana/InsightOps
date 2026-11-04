import { Link } from "react-router-dom";
import { AuthHeader } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { AUTH_LINK } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

export default function SignUp() {
  return (
    <>
      <AuthHeader
        eyebrow="Step 1 of 2: Account"
        title="Create your account"
        subtitle="We will email you a verification code next."
      />
      <SignupForm />
      <p className="mt-6 text-center text-[14px] text-muted-foreground">
        Already have an account?{" "}
        <Link to="/signin" className={cn("font-medium", AUTH_LINK)}>
          Sign in
        </Link>
      </p>
    </>
  );
}
