"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ isOpen, onClose, title, children, size = "md" }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  const portalTarget = typeof document === "undefined" ? null : document.body;
  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center p-2 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-0 bg-black/45 backdrop-blur-xl"
            style={{ backdropFilter: "blur(18px) saturate(1.1)", WebkitBackdropFilter: "blur(18px) saturate(1.1)" }}
          />

          {/* Modal Content */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", duration: 0.42, bounce: 0.16 }}
            className={`relative z-10 w-full ${sizeClasses[size]} apple-panel max-h-[calc(100dvh-1rem)] overflow-hidden sm:max-h-[calc(100dvh-2rem)]`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            tabIndex={-1}
          >
            {/* Header */}
            {title && (
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--panel-solid) 84%, transparent)", backdropFilter: "var(--blur-nav)" }}>
                <h2 id="modal-title" className="min-w-0 truncate text-base font-semibold sm:text-lg">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="apple-icon-button h-9 w-9"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="max-h-[calc(100dvh-5.5rem)] overflow-y-auto p-4 sm:max-h-[72vh] sm:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}
