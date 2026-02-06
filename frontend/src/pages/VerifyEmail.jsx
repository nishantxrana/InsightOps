import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, error, already-verified
  const [message, setMessage] = useState("");

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await axios.get(`/api/auth/verify-email/${token}`);

      if (response.data.alreadyVerified) {
        setStatus("already-verified");
        setMessage("Your email is already verified!");
      } else {
        setStatus("success");
        setMessage(response.data.message);
      }

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.error || "Verification failed. Please try again.");
    }
  };

  const handleResend = async () => {
    try {
      setStatus("loading");
      await axios.post("/api/auth/resend-verification");
      setMessage("Verification email sent! Please check your inbox.");
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.error || "Failed to resend email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />}
            {status === "success" && <CheckCircle2 className="h-16 w-16 text-green-500" />}
            {status === "already-verified" && <CheckCircle2 className="h-16 w-16 text-blue-500" />}
            {status === "error" && <XCircle className="h-16 w-16 text-red-500" />}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Verifying Email..."}
            {status === "success" && "Email Verified!"}
            {status === "already-verified" && "Already Verified"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "success" && (
            <p className="text-center text-sm text-muted-foreground">
              Redirecting to dashboard in 3 seconds...
            </p>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <Button onClick={handleResend} className="w-full" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </Button>
              <Link to="/dashboard">
                <Button className="w-full" variant="default">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          )}

          {(status === "success" || status === "already-verified") && (
            <Link to="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
