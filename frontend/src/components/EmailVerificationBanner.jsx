import { useState } from "react";
import { Mail, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!user || user.isEmailVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    setMessage("");

    try {
      await axios.post("/api/auth/resend-verification");
      setMessage("Verification email sent! Please check your inbox.");
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to send email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Mail className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            {message || "Please verify your email address to access all features."}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2">
          {!message && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResend}
              disabled={loading}
              className="whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Email"
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
