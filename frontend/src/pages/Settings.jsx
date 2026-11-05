import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { useToast } from "../hooks/use-toast";
import { useOrganization } from "../contexts/OrganizationContext";
import { PageHeader } from "@/components/kit/PageHeader";
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

import OrganizationsSection from "./settings/OrganizationsSection";
import AIConfigSection from "./settings/AIConfigSection";
import NotificationsSection from "./settings/NotificationsSection";
import WebhooksSection from "./settings/WebhooksSection";
import PollingSection from "./settings/PollingSection";
import SecuritySection from "./settings/SecuritySection";
import { SettingsNav } from "./settings/SettingsNav";
import { SETTINGS_SECTIONS } from "./settings/constants";

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
    overdueExcludedStates: [],
    overdueExcludedStatesEnabled: false,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentOrganization, currentProject, updateOrganization, needsSetup, clearSwitching } =
    useOrganization();

  const [activeSection, setActiveSection] = useState("organizations");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [openAddOrg, setOpenAddOrg] = useState(false);

  const [tabSettings, setTabSettings] = useState(getDefaultSettings());
  const [originalTabSettings, setOriginalTabSettings] = useState(getDefaultSettings());

  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingSectionRef = useRef(null);

  const syncSectionToUrl = useCallback(
    (sectionId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (next.get("setup") === "true") {
            next.delete("section");
          } else {
            next.set("section", sectionId);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Setup mode / deep links / add-org action
  useEffect(() => {
    if (needsSetup || searchParams.get("setup") === "true") {
      setActiveSection("organizations");
      return;
    }

    const section = searchParams.get("section");
    if (section && SETTINGS_SECTIONS.some((s) => s.id === section)) {
      setActiveSection(section);
    }

    if (searchParams.get("action") === "add-org") {
      setActiveSection("organizations");
      setOpenAddOrg(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("action");
          if (!next.get("setup")) next.set("section", "organizations");
          return next;
        },
        { replace: true }
      );
    }
  }, [needsSetup, searchParams, setSearchParams]);

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
        polling: {
          ...getDefaultSettings().polling,
          ...org.polling,
        },
        security: getDefaultSettings().security,
      };

      setTabSettings(loaded);
      setOriginalTabSettings(JSON.parse(JSON.stringify(loaded)));
      clearSwitching();
    };

    loadOrgSettings();
  }, [currentOrganization, currentProject, clearSwitching]);

  const hasCurrentTabChanges = useCallback(() => {
    if (activeSection === "organizations" || activeSection === "webhooks") return false;
    return (
      JSON.stringify(tabSettings[activeSection]) !==
      JSON.stringify(originalTabSettings[activeSection])
    );
  }, [tabSettings, originalTabSettings, activeSection]);

  const applySectionChange = useCallback(
    (newSection) => {
      setActiveSection(newSection);
      setValidationErrors({});
      syncSectionToUrl(newSection);
    },
    [syncSectionToUrl]
  );

  const handleSectionChange = useCallback(
    (newSection) => {
      if (newSection === activeSection) return;

      if (hasCurrentTabChanges()) {
        pendingSectionRef.current = newSection;
        setShowUnsavedDialog(true);
      } else {
        applySectionChange(newSection);
      }
    },
    [activeSection, hasCurrentTabChanges, applySectionChange]
  );

  const handleDiscardChanges = useCallback(() => {
    setTabSettings((prev) => ({
      ...prev,
      [activeSection]: JSON.parse(JSON.stringify(originalTabSettings[activeSection])),
    }));
    setShowUnsavedDialog(false);
    setValidationErrors({});
    if (pendingSectionRef.current) {
      applySectionChange(pendingSectionRef.current);
      pendingSectionRef.current = null;
    }
  }, [activeSection, originalTabSettings, applySectionChange]);

  const handleDiscardOnly = useCallback(() => {
    setTabSettings((prev) => ({
      ...prev,
      [activeSection]: JSON.parse(JSON.stringify(originalTabSettings[activeSection])),
    }));
    setValidationErrors({});
  }, [activeSection, originalTabSettings]);

  const updateTabData = useCallback((sectionId, newData) => {
    setTabSettings((prev) => ({ ...prev, [sectionId]: newData }));
  }, []);

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
          description: `${SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.name} settings saved!`,
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

  if (needsSetup) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Welcome to InsightOps"
          description="Let's set up your first Azure DevOps organization"
        />
        <OrganizationsSection />
      </div>
    );
  }

  const showSaveBar =
    activeSection !== "organizations" && activeSection !== "webhooks" && hasCurrentTabChanges();

  const navProps = {
    activeSection,
    tabSettings,
    originalTabSettings,
    onSelect: (id) => {
      handleSectionChange(id);
      setSheetOpen(false);
    },
  };

  return (
    <>
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in{" "}
              {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.name}. Do you want to discard
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

      <div className={showSaveBar ? "pb-20" : undefined}>
        <div className="mb-6 flex items-start gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mt-0.5 shrink-0 md:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Open settings sections</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader className="text-left">
                <SheetTitle>Settings</SheetTitle>
                <SheetDescription>Choose a section to configure</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <SettingsNav {...navProps} />
              </div>
            </SheetContent>
          </Sheet>

          <PageHeader
            className="flex-1"
            title="Settings"
            description={
              currentOrganization
                ? `Managing: ${currentOrganization.name}`
                : "Configure your settings"
            }
          />
        </div>

        <div className="flex flex-1 gap-8">
          <aside className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-6">
              <SettingsNav {...navProps} />
            </div>
          </aside>

          <div className="min-w-0 max-w-[720px] flex-1">
            {activeSection === "organizations" && (
              <OrganizationsSection
                openAddRequested={openAddOrg}
                onOpenAddHandled={() => setOpenAddOrg(false)}
              />
            )}
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

      {showSaveBar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-6">
            <p className="text-sm text-muted-foreground">Unsaved changes</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleDiscardOnly} disabled={saving}>
                Discard
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
