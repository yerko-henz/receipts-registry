
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GenericModal } from "@/components/ui/generic-modal";

// Define the shape of our modal content
interface ModalContent {
  title: string;
  description?: string;
  children?: ReactNode; // For custom content inside body
  actions?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
      disabled?: boolean;
  }[];
}

interface ModalContextType {
  openModal: (content: ModalContent) => void;
  closeModal: () => void;
  isOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ModalContent | null>(null);

  const openModal = (modalContent: ModalContent) => {
    setContent(modalContent);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    // Optional: Clear content after animation
    setTimeout(() => setContent(null), 300);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, isOpen }}>
      {children}
      {content && (
        <GenericModal
          isOpen={isOpen}
          onClose={closeModal}
          title={content.title}
          description={content.description}
          actions={content.actions}
        >
          {content.children}
        </GenericModal>
      )}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
