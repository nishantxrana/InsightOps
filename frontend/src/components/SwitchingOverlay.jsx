import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";

export function SwitchingOverlay({ isVisible, switchingTo }) {
  const getDisplayInfo = () => {
    if (!switchingTo) return { label: "workspace", name: "workspace" };

    if (switchingTo.type === "organization") {
      return { label: "organization", name: switchingTo.name };
    } else if (switchingTo.type === "project") {
      return { label: "project", name: switchingTo.name };
    }
    return { label: "workspace", name: "workspace" };
  };

  const { label, name } = getDisplayInfo();

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-50 bg-background/40"
            aria-hidden
          />

          <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 max-w-[calc(100vw-2rem)]"
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{
                duration: 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex items-center gap-2.5 sm:gap-3 pl-3 sm:pl-4 pr-4 sm:pr-5 py-2.5 sm:py-3 rounded-full bg-card border border-border"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-muted border-t-primary shrink-0"
              />

              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
                <span className="font-medium text-foreground whitespace-nowrap">
                  Switching {label}
                </span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-primary truncate">{name}</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
