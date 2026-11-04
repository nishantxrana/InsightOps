import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import WorkItems from "./pages/WorkItems";
import Pipelines from "./pages/Pipelines";
import Releases from "./pages/Releases";
import PullRequests from "./pages/PullRequests";
import NotificationHistory from "./pages/NotificationHistory";
import LandingPage from "./pages/LandingPage";
import AuthLayout from "./components/auth/AuthLayout";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPasswordOTP from "./pages/ResetPasswordOTP";
import { HealthProvider } from "./contexts/HealthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OrganizationProvider, useOrganization } from "./contexts/OrganizationContext";
import { Toaster } from "./components/ui/toaster";
import { SwitchingOverlay } from "./components/SwitchingOverlay";

// DEV kit showcase — remove in step 10 (dead-code eliminated in production builds)
const DesignKitPage = import.meta.env.DEV
  ? React.lazy(() => import("./pages/DesignKitPage"))
  : null;

function AuthenticatedApp() {
  const { needsSetup, loading, switching, switchingTo, currentOrganization } = useOrganization();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-foreground">Loading organizations...</div>
      </div>
    );
  }

  // If user needs to set up their first organization, redirect to settings
  if (needsSetup) {
    return (
      <Layout>
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/settings?setup=true" replace />} />
        </Routes>
      </Layout>
    );
  }

  return (
    <Layout>
      <SwitchingOverlay isVisible={switching} switchingTo={switchingTo} />
      <motion.div
        key={currentOrganization?._id || "no-org"}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/work-items" element={<WorkItems />} />
          <Route path="/pipelines" element={<Pipelines />} />
          <Route path="/releases" element={<Releases />} />
          <Route path="/pull-requests" element={<PullRequests />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/notifications" element={<NotificationHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </motion.div>
    </Layout>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-foreground">Loading...</div>
      </div>
    );
  }

  // DEV-only kit showcase (outside Layout). Remove in step 10.
  if (import.meta.env.DEV && DesignKitPage && location.pathname === "/__kit") {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            Loading kit…
          </div>
        }
      >
        <DesignKitPage />
      </React.Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password-otp" element={<ResetPasswordOTP />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <OrganizationProvider>
      <AuthenticatedApp />
    </OrganizationProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HealthProvider>
          <AppContent />
          <Toaster />
        </HealthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
