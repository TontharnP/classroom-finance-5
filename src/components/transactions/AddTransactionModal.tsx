"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { TransactionTypeSelector } from "./TransactionTypeSelector";
import { ScheduleTransactionForm } from "./ScheduleTransactionForm";
import { NormalTransactionForm } from "./NormalTransactionForm";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const [step, setStep] = useState<"selector" | "schedule" | "transaction">("selector");

  const handleClose = () => {
    setStep("selector");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="เพิ่มรายการ" size="lg">
      {step === "selector" && (
        <TransactionTypeSelector
          onSelectSchedule={() => setStep("schedule")}
          onSelectTransaction={() => setStep("transaction")}
        />
      )}
      {step === "schedule" && <ScheduleTransactionForm onSuccess={handleClose} onBack={() => setStep("selector")} />}
      {step === "transaction" && <NormalTransactionForm onSuccess={handleClose} onBack={() => setStep("selector")} />}
    </Modal>
  );
}
