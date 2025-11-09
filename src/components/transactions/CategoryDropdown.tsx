"use client";
import { useAppStore } from "@/lib/store";
import { UseFormRegister } from "react-hook-form";
import Link from "next/link";

type CategoryDropdownProps = {
  register: UseFormRegister<any>;
  error?: string;
  defaultValue?: string;
};

export function CategoryDropdown({ register, error, defaultValue }: CategoryDropdownProps) {
  const categories = useAppStore((state) => state.data.categories);

  if (categories.length === 0) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          {...register("category")}
          defaultValue={defaultValue}
          className="w-full rounded-md border px-3 py-2"
          placeholder="เช่น อุปกรณ์, เดินทาง, กิจกรรม"
        />
        <p className="text-xs text-zinc-500">
          ยังไม่มีหมวดหมู่{" "}
          <Link href="/categories" className="text-blue-600 hover:underline">
            สร้างหมวดหมู่ใหม่
          </Link>
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        {...register("category")}
        defaultValue={defaultValue}
        className="w-full rounded-md border px-3 py-2"
      >
        <option value="">เลือกหมวดหมู่</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.name}>
            {cat.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-zinc-500">
        <Link href="/categories" className="text-blue-600 hover:underline">
          จัดการหมวดหมู่
        </Link>
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
