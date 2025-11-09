"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/lib/store";
import { Student } from "@/types";
import { uploadStudentAvatar, createStudent, updateStudent as updateStudentRemote } from "@/lib/supabase/students";
import { dbStudentToStudent } from "@/lib/supabase/adapter";
import { User, Upload } from "lucide-react";
import toast from "react-hot-toast";

const schema = z.object({
  prefix: z.string().min(1, "กรุณาเลือกคำนำหน้า"),
  firstName: z.string().min(1, "กรุณาระบุชื่อ"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล"),
  nickName: z.string().optional(),
  number: z.number().min(1, "กรุณาระบุเลขที่"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AddStudentModal({ isOpen, onClose }: Props) {
  const data = useAppStore((state) => state.data);
  const addStudent = useAppStore((state) => state.addStudent);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (formData: FormData) => {
    setIsUploading(true);
    try {
      // 1. Create student remotely first (without avatar)
      const created = await createStudent({
        prefix: formData.prefix,
        first_name: formData.firstName,
        last_name: formData.lastName,
        nick_name: formData.nickName,
        number: formData.number,
        avatar_url: undefined,
      });

      let finalAvatarUrl: string | undefined = undefined;

      // 2. If avatar selected, upload then update remote record
      if (selectedFile) {
        try {
          finalAvatarUrl = await uploadStudentAvatar(created.id, selectedFile);
          await updateStudentRemote(created.id, { avatar_url: finalAvatarUrl });
        } catch (error) {
          toast.error("ไม่สามารถอัพโหลดรูปได้");
          console.error(error);
        }
      }

      // 3. Build UI student object from remote data + avatar
      const uiStudent: Student = dbStudentToStudent({ ...created, avatar_url: finalAvatarUrl });
      addStudent(uiStudent);

      toast.success("เพิ่มนักเรียนเรียบร้อย");
      reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (e) {
      console.error("Failed to create student", e);
      toast.error("สร้างนักเรียนไม่สำเร็จ");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เพิ่มนักเรียนใหม่">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-3 border-b pb-4">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-24 w-24 rounded-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-blue-600 dark:text-blue-300" />
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-sm text-zinc-500">คลิกเพื่ออัพโหลดรูปภาพ (ถ้ามี)</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">คำนำหน้า</label>
          <select {...register("prefix")} className="w-full rounded-md border px-3 py-2">
            <option value="">เลือกคำนำหน้า</option>
            <option value="นาย">นาย</option>
            <option value="นาง">นาง</option>
            <option value="นางสาว">นางสาว</option>
            <option value="เด็กชาย">เด็กชาย</option>
            <option value="เด็กหญิง">เด็กหญิง</option>
          </select>
          {errors.prefix && <p className="mt-1 text-sm text-red-600">{errors.prefix.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">ชื่อ</label>
            <input
              type="text"
              {...register("firstName")}
              className="w-full rounded-md border px-3 py-2"
              placeholder="ชื่อ"
            />
            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">นามสกุล</label>
            <input
              type="text"
              {...register("lastName")}
              className="w-full rounded-md border px-3 py-2"
              placeholder="นามสกุล"
            />
            {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">ชื่อเล่น</label>
            <input
              type="text"
              {...register("nickName")}
              className="w-full rounded-md border px-3 py-2"
              placeholder="ชื่อเล่น (ถ้ามี)"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">เลขที่</label>
            <input
              type="number"
              {...register("number", { valueAsNumber: true })}
              className="w-full rounded-md border px-3 py-2"
              placeholder="1"
            />
            {errors.number && <p className="mt-1 text-sm text-red-600">{errors.number.message}</p>}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 rounded-md border px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isUploading}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? "กำลังบันทึก..." : "เพิ่มนักเรียน"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
