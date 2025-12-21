"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { createCategory, uploadCategoryIcon } from "@/lib/supabase/categories";
import { dbCategoryToCategory } from "@/lib/supabase/adapter";
import { IconPicker, getIconComponent } from "./IconPicker";
import { Upload, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อหมวดหมู่"),
  icon: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCategoryModal({ isOpen, onClose }: Props) {
  const addCategory = useAppStore((state) => state.addCategory);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("tmpl:folder");
  const [useCustomImage, setUseCustomImage] = useState(false);
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      icon: "tmpl:folder",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (formData: FormData) => {
    setIsCreating(true);
    try {
      // Create category first
      let iconValue = selectedIcon;
      
      const created = await createCategory({
        name: formData.name,
        icon: iconValue,
      });

      // If custom image was selected, upload it and update the category
      if (useCustomImage && customImageFile) {
        const iconUrl = await uploadCategoryIcon(created.id, customImageFile);
        iconValue = iconUrl; // Store URL as icon value
        
        // Update category with image URL
        const { updateCategory: updateCategoryRemote } = await import("@/lib/supabase/categories");
        await updateCategoryRemote(created.id, { icon: iconUrl });
        created.icon = iconUrl;
      }

      const uiCategory = dbCategoryToCategory(created);
      addCategory(uiCategory);
      toast.success("เพิ่มหมวดหมู่เรียบร้อย");
  reset();
  setSelectedIcon("tmpl:folder");
      setUseCustomImage(false);
      setCustomImageFile(null);
      setCustomImagePreview(null);
      onClose();
    } catch (e) {
      console.error("Failed to create category", e);
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      
      // Check if it's a table not found error
      if (errorMessage.includes("relation") || errorMessage.includes("does not exist")) {
        toast.error(
          "ตาราง categories ยังไม่ถูกสร้าง กรุณารันไฟล์ migration ก่อน (ดู QUICK_MIGRATION_GUIDE.md)",
          { duration: 6000 }
        );
      } else {
        toast.error("สร้างหมวดหมู่ไม่สำเร็จ: " + errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const SelectedIcon = getIconComponent(selectedIcon);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เพิ่มหมวดหมู่ใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Icon Preview */}
        <div className="flex flex-col items-center gap-3 border-b pb-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 overflow-hidden">
            {useCustomImage && customImagePreview ? (
              <img src={customImagePreview} alt="Custom icon" className="h-full w-full object-cover" />
            ) : (
              <SelectedIcon className="h-12 w-12 text-blue-600 dark:text-blue-300" />
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {useCustomImage ? "รูปภาพที่อัปโหลด" : "ไอคอนที่เลือก"}
          </p>
        </div>

        {/* Toggle between icon picker and custom image */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUseCustomImage(false)}
            className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-colors ${
              !useCustomImage
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            เลือกไอคอน
          </button>
          <button
            type="button"
            onClick={() => setUseCustomImage(true)}
            className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-colors ${
              useCustomImage
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            อัปโหลดรูปภาพ
          </button>
        </div>

        {/* Icon Picker or Custom Image Upload */}
        {!useCustomImage ? (
          <div>
            <label className="mb-2 block text-sm font-medium">ไอคอน</label>
            <IconPicker selectedIcon={selectedIcon} onSelectIcon={setSelectedIcon} />
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium">อัปโหลดรูปภาพ</label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-6 transition-colors hover:border-blue-400 dark:border-zinc-700 dark:hover:border-blue-600">
              <Upload className="mb-2 h-8 w-8 text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {customImageFile ? customImageFile.name : "คลิกเพื่ือเลือกรูปภาพ"}
              </span>
              <span className="mt-1 text-xs text-zinc-500">PNG, JPG, GIF (แนะนำ 200x200px)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">ชื่อหมวดหมู่</label>
          <input
            type="text"
            {...register("name")}
            className="w-full rounded-md border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="เช่น อุปกรณ์การเรียน"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? "กำลังสร้าง..." : "สร้างหมวดหมู่"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
