
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
}

interface GenericModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: ModalAction[];
}

export function GenericModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions = [],
}: GenericModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {children && <div className="py-4">{children}</div>}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "default"}
              onClick={action.onClick}
              disabled={action.disabled}
              className="w-full sm:w-auto"
            >
              {action.label}
            </Button>
          ))}
          {/* Default Close button if no actions? Or explicit cancel? 
              The mobile one has explicit buttons. 
              The web usually has an 'X' top right too.
          */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
