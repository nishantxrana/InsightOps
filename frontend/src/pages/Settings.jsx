import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, Building2, Bot, Bell, Webhook, Clock, Shield, Menu } from "lucide-react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import { useToast } from "../hooks/use-toast";
import { useOrganization } from "../contexts/OrganizationContext";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

// Import section components
import OrganizationsSection from "./settings/OrganizationsSection";
import AIConfigSection from "./settings/AIConfigSection";
import NotificationsSection from "./settings/NotificationsSection";
import WebhooksSection from "./settings/WebhooksSection";
import PollingSection from "./settings/PollingSection";
import SecuritySection from "./settings/SecuritySection";

const settingsSections = [
  { id: "organizations", name: "Organizations", icon: Building2 },
  { id: "ai", name: "AI Configuration", icon: Bot },
  { id: "notifications", name: "Notifications", icon: Bell },
  { id: "webhooks", name: "Webhook URLs", icon: Webhook },
  { id: "polling", name: "Polling", icon: Clock },
  { id: "security", name: "Security", icon: Shield },
];

// Default settings structure for current organization
const getDefaultSettings = () => ({
  ai: {
    provider: "gemini",
    openaiApiKey: "",
    groqApiKey: "",
    geminiApiKey: "",
    model: "gemini-2.0-flash",
  },
  notifications: {
    teamsWebhookUrl: "",
    slackWebhookUrl: "",
    googleChatWebhookUrl: "",
    teamsEnabled: false,
    slackEnabled: false,
    googleChatEnabled: false,
    enabled: true,
  },
  polling: {
    workItemsInterval: "*/10 * * * *",
    pullRequestInterval: "0 */10 * * *",
    overdueCheckInterval: "0 */10 * * *",
    workItemsEnabled: false,
    pullRequestEnabled: false,
    overdueCheckEnabled: false,
    overdueFilterEnabled: true,
    overdueMaxDays: 60,
    idlePRFilterEnabled: true,
    idlePRMaxDays: 90,
  },
  security: {
    webhookSecret: "",
    apiToken: "",
    enableRateLimit: true,
    maxRequestsPerMinute: 100,
  },
});

export default function Settings() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { currentOrganization, updateOrganization, needsSetup } = useOrganization();

  const [activeSection, setActiveSection] = useState("organizations");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Per-tab settings state
  const [tabSettings, setTabSettings] = useState(getDefaultSettings());
  const [originalTabSettings, setOriginalTabSettings] = useState(getDefaultSettings());

  // Unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingSectionRef = useRef(null);

  // If setup mode, stay on organizations
  useEffect(() => {
    if (needsSetup || searchParams.get("setup") === "true") {
      setActiveSection("organizations");
    }
  }, [needsSetup, searchParams]);

  // Load settings when organization changes
  useEffect(() => {
    if (!currentOrganization) return;

    const loadOrgSettings = () => {
      const org = currentOrganization;
      const loaded = {
        ai: {
          provider: org.ai?.provider || "gemini",
          model: org.ai?.model || "gemini-2.0-flash",
          openaiApiKey: org.ai?.apiKeys?.openai || "",
          groqApiKey: org.ai?.apiKeys?.groq || "",
          geminiApiKey: org.ai?.apiKeys?.gemini || "",
        },
        notifications: {
          enabled: org.notifications?.enabled !== undefined ? org.notifications.enabled : true,
          teamsWebhookUrl: org.notifications?.webhooks?.teams || "",
          slackWebhookUrl: org.notifications?.webhooks?.slack || "",
          googleChatWebhookUrl: org.notifications?.webhooks?.googleChat || "",
          teamsEnabled: org.notifications?.teamsEnabled ?? false,
          slackEnabled: org.notifications?.slackEnabled ?? false,
          googleChatEnabled: org.notifications?.googleChatEnabled ?? false,
        },
        polling: org.polling || getDefaultSettings().polling,
        security: getDefaultSettings().security,
      };

      setTabSettings(loaded);
      setOriginalTabSettings(JSON.parse(JSON.stringify(loaded)));
    };

    loadOrgSettings();
  }, [currentOrganization]);

  // Check if current tab has changes
  const hasCurrentTabChanges = useCallback(() => {
    if (activeSection === "organizations" || activeSection === "webhooks") return false;
    return (
      JSON.stringify(tabSettings[activeSection]) !==
      JSON.stringify(originalTabSettings[activeSection])
    );
  }, [tabSettings, originalTabSettings, activeSection]);

  // Handle section change with unsaved changes check
  const handleSectionChange = useCallback(
    (newSection) => {
      if (newSection === activeSection) return;

      if (hasCurrentTabChanges()) {
        pendingSectionRef.current = newSection;
        setShowUnsavedDialog(true);
      } else {
        setActiveSection(newSection);
        setValidationErrors({});
      }
    },
    [activeSection, hasCurrentTabChanges]
  );

  // Discard changes and switch section
  const handleDiscardChanges = useCallback(() => {
    setTabSettings((prev) => ({
      ...prev,
      [activeSection]: JSON.parse(JSON.stringify(originalTabSettings[activeSection])),
    }));
    setShowUnsavedDialog(false);
    setValidationErrors({});
    if (pendingSectionRef.current) {
      setActiveSection(pendingSectionRef.current);
      pendingSectionRef.current = null;
    }
  }, [activeSection, originalTabSettings]);

  // Update tab data
  const updateTabData = useCallback((sectionId, newData) => {
    setTabSettings((prev) => ({ ...prev, [sectionId]: newData }));
  }, []);

  // Save current tab settings to organization
  const handleSave = async () => {
    if (!currentOrganization) {
      toast({ title: "Error", description: "No organization selected", variant: "destructive" });
      return;
    }

    if (!hasCurrentTabChanges()) {
      toast({ title: "No Changes", description: "No changes detected to save." });
      return;
    }

    try {
      setSaving(true);
      const data = tabSettings[activeSection];
      let updates = {};

      if (activeSection === "ai") {
        updates.ai = {
          provider: data.provider,
          model: data.model,
        };
        const apiKeys = {};
        if (data.openaiApiKey && data.openaiApiKey !== "********")
          apiKeys.openai = data.openaiApiKey;
        if (data.groqApiKey && data.groqApiKey !== "********") apiKeys.groq = data.groqApiKey;
        if (data.geminiApiKey && data.geminiApiKey !== "********")
          apiKeys.gemini = data.geminiApiKey;
        if (Object.keys(apiKeys).length > 0) updates.ai.apiKeys = apiKeys;
      }

      if (activeSection === "notifications") {
        updates.notifications = {
          enabled: data.enabled,
          teamsEnabled: data.teamsEnabled,
          slackEnabled: data.slackEnabled,
          googleChatEnabled: data.googleChatEnabled,
          webhooks: {
            teams: data.teamsWebhookUrl,
            slack: data.slackWebhookUrl,
            googleChat: data.googleChatWebhookUrl,
          },
        };
      }

      if (activeSection === "polling") {
        updates.polling = data;
      }

      const result = await updateOrganization(currentOrganization._id, updates);

      if (result.success) {
        setOriginalTabSettings((prev) => ({
          ...prev,
          [activeSection]: JSON.parse(JSON.stringify(tabSettings[activeSection])),
        }));
        toast({
          title: "Settings Saved",
          description: `${settingsSections.find((s) => s.id === activeSection)?.name} settings saved!`,
        });
      } else {
        toast({ title: "Save Failed", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Sidebar component
  const Sidebar = ({ className = "", onSelect }) => (
    <div className={`space-y-2 ${className}`}>
      {settingsSections.map((section) => {
        const Icon = section.icon;
        const hasChanges =
          activeSection !== "organizations" &&
          activeSection !== "webhooks" &&
          section.id !== "organizations" &&
          section.id !== "webhooks" &&
          JSON.stringify(tabSettings[section.id]) !==
            JSON.stringify(originalTabSettings[section.id]);

        return (
          <button
            key={section.id}
            onClick={() => (onSelect ? onSelect(section.id) : handleSectionChange(section.id))}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
              activeSection === section.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium flex-1">{section.name}</span>
            {hasChanges && (
              <span className="w-2 h-2 rounded-full bg-orange-500" title="Unsaved changes" />
            )}
          </button>
        );
      })}
    </div>
  );

  // Show setup message if no organization
  if (needsSetup) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Welcome to InsightOps
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Let's set up your first Azure DevOps organization
          </p>
        </div>
        <OrganizationsSection />
      </div>
    );
  }

  return (
    <>
      {/* Unsaved Changes Dialog - outside space-y container to not affect layout */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in{" "}
              {settingsSections.find((s) => s.id === activeSection)?.name}. Do you want to discard
              them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowUnsavedDialog(false);
                pendingSectionRef.current = null;
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <div className="py-4">
                    <h2 className="text-lg font-semibold mb-4">Settings</h2>
                    <Sidebar
                      onSelect={(id) => {
                        handleSectionChange(id);
                        setSheetOpen(false);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {currentOrganization
                    ? `Managing: ${currentOrganization.name}`
                    : "Configure your settings"}
                </p>
              </div>
            </div>

            {activeSection !== "organizations" && activeSection !== "webhooks" && (
              <Button
                onClick={handleSave}
                disabled={saving || !hasCurrentTabChanges()}
                className="group relative overflow-hidden bg-foreground hover:bg-foreground/90 text-background"
              >
                <Save className={`h-4 w-4 mr-2 ${saving ? "animate-spin" : ""}`} />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            )}
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration</CardTitle>
                <CardDescription>Choose a section to configure</CardDescription>
              </CardHeader>
              <CardContent>
                <Sidebar />
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {activeSection === "organizations" && <OrganizationsSection />}
            {activeSection === "ai" && (
              <AIConfigSection
                data={tabSettings.ai}
                onChange={(data) => updateTabData("ai", data)}
                errors={validationErrors}
              />
            )}
            {activeSection === "notifications" && (
              <NotificationsSection
                data={tabSettings.notifications}
                onChange={(data) => updateTabData("notifications", data)}
              />
            )}
            {activeSection === "webhooks" && <WebhooksSection />}
            {activeSection === "polling" && (
              <PollingSection
                data={tabSettings.polling}
                onChange={(data) => updateTabData("polling", data)}
              />
            )}
            {activeSection === "security" && (
              <SecuritySection
                data={tabSettings.security}
                onChange={(data) => updateTabData("security", data)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
