import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";

const Command = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, className, overlayClassName, ...props }) => {
  return (
    <Dialog {...props}>
      <DialogPortal>
        <DialogOverlay className={cn("bg-black/50", overlayClassName)} />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[15vh] z-50 flex w-[min(560px,calc(100vw-2rem))] max-w-[560px] translate-x-[-50%] translate-y-0 flex-col overflow-hidden rounded-[12px] border border-border bg-background p-0 shadow-md outline-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

const CommandInput = React.forwardRef(({ className, endSlot, ...props }, ref) => (
  // cmdk looks up this attribute for layout; not a React DOM prop
  // eslint-disable-next-line react/no-unknown-property
  <div className="flex h-12 items-center gap-2 border-b border-border px-3" cmdk-input-wrapper="">
    <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:outline-none",
        className
      )}
      {...props}
    />
    {endSlot}
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[360px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-8 text-center text-sm text-muted-foreground"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex h-9 cursor-default select-none items-center gap-2 rounded-sm px-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-muted data-[selected=true]:text-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
      className
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
