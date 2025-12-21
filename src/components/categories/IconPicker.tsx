"use client";
import {
  Folder,
  BookOpen,
  Bus,
  Utensils,
  Shirt,
  Laptop,
  Heart,
  Home,
  ShoppingBag,
  Coffee,
  Tv,
  Smartphone,
  Dumbbell,
  Palette as PaletteIcon,
  Music as MusicIcon,
  Gamepad2,
  Gift,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Wrench,
  Car,
  Plane,
  Film,
  type LucideIcon,
} from "lucide-react";
// Removed template icon imports; only lucide icons remain.

export const CATEGORY_ICONS = [
  { name: "folder", icon: Folder, label: "โฟลเดอร์" },
  { name: "book", icon: BookOpen, label: "หนังสือ" },
  { name: "bus", icon: Bus, label: "รถบัส" },
  { name: "food", icon: Utensils, label: "อาหาร" },
  { name: "shirt", icon: Shirt, label: "เสื้อผ้า" },
  { name: "laptop", icon: Laptop, label: "คอมพิวเตอร์" },
  { name: "heart", icon: Heart, label: "สุขภาพ" },
  { name: "home", icon: Home, label: "บ้าน" },
  { name: "shopping", icon: ShoppingBag, label: "ช้อปปิ้ง" },
  { name: "coffee", icon: Coffee, label: "เครื่องดื่ม" },
  { name: "tv", icon: Tv, label: "ทีวี" },
  { name: "phone", icon: Smartphone, label: "โทรศัพท์" },
  { name: "fitness", icon: Dumbbell, label: "ออกกำลังกาย" },
  { name: "art", icon: PaletteIcon, label: "ศิลปะ" },
  { name: "music", icon: MusicIcon, label: "ดนตรี" },
  { name: "game", icon: Gamepad2, label: "เกม" },
  { name: "gift", icon: Gift, label: "ของขวัญ" },
  { name: "work", icon: Briefcase, label: "งาน" },
  { name: "education", icon: GraduationCap, label: "การศึกษา" },
  { name: "health", icon: Stethoscope, label: "โรงพยาบาล" },
  { name: "tools", icon: Wrench, label: "เครื่องมือ" },
  { name: "car", icon: Car, label: "รถยนต์" },
  { name: "travel", icon: Plane, label: "ท่องเที่ยว" },
  { name: "movie", icon: Film, label: "ภาพยนตร์" },
] as const;

export type CategoryIconName = typeof CATEGORY_ICONS[number]["name"];

export function getIconComponent(iconName?: string): LucideIcon {
  const found = CATEGORY_ICONS.find(i => i.name === iconName);
  return found?.icon || Folder;
}

type IconPickerProps = {
  selectedIcon?: string;
  onSelectIcon: (iconName: string) => void;
};

export function IconPicker({ selectedIcon = "folder", onSelectIcon }: IconPickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">ไอคอนมาตรฐาน</p>
        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 rounded-md border dark:border-zinc-700">
          {CATEGORY_ICONS.map(({ name, icon: Icon, label }) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelectIcon(name)}
              title={label}
              className={`flex items-center justify-center rounded-lg p-3 transition-colors ${
                selectedIcon === name
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              }`}
            >
              <Icon className="h-6 w-6" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
