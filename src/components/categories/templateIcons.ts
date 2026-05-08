import Image, { StaticImageData } from "next/image";

// Import all template SVGs under src/image/category icon/
import bookAlt from "@/image/category icon/book-alt.svg";
import busAlt from "@/image/category icon/bus-alt.svg";
import carSide from "@/image/category icon/car-side.svg";
import coffeeHeart from "@/image/category icon/coffee-heart.svg";
import film from "@/image/category icon/film.svg";
import folder from "@/image/category icon/folder.svg";
import gamepad from "@/image/category icon/gamepad.svg";
import gift from "@/image/category icon/gift.svg";
import graduationCap from "@/image/category icon/graduation-cap.svg";
import gymBag from "@/image/category icon/gym-bag.svg";
import gym from "@/image/category icon/gym.svg";
import heart from "@/image/category icon/heart.svg";
import houseBlank from "@/image/category icon/house-blank.svg";
import laptop from "@/image/category icon/laptop.svg";
import mobileButton from "@/image/category icon/mobile-button.svg";
import musicAlt from "@/image/category icon/music-alt.svg";
import palette from "@/image/category icon/palette.svg";
import planeDeparture from "@/image/category icon/plane-departure.svg";
import restaurant from "@/image/category icon/restaurant.svg";
import shirtLongSleeve from "@/image/category icon/shirt-long-sleeve.svg";
import shoppingCart from "@/image/category icon/shopping-cart.svg";
import stethoscope from "@/image/category icon/stethoscope.svg";
import tvRetro from "@/image/category icon/tv-retro.svg";
import wrenchAlt from "@/image/category icon/wrench-alt.svg";

export const TEMPLATE_ICONS: Record<string, StaticImageData> = {
  "book-alt": bookAlt,
  "bus-alt": busAlt,
  "car-side": carSide,
  "coffee-heart": coffeeHeart,
  film,
  folder,
  gamepad,
  gift,
  "graduation-cap": graduationCap,
  "gym-bag": gymBag,
  gym,
  heart,
  "house-blank": houseBlank,
  laptop,
  "mobile-button": mobileButton,
  "music-alt": musicAlt,
  palette,
  "plane-departure": planeDeparture,
  restaurant,
  "shirt-long-sleeve": shirtLongSleeve,
  "shopping-cart": shoppingCart,
  stethoscope,
  "tv-retro": tvRetro,
  "wrench-alt": wrenchAlt,
};

export function isTemplateIcon(value?: string | null): value is string {
  return !!value && value.startsWith("tmpl:");
}

export function getTemplateKey(value?: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("tmpl:")) return null;
  return value.substring(5);
}

export function getTemplateAsset(value?: string | null): StaticImageData | undefined {
  const key = getTemplateKey(value);
  if (!key) return undefined;
  return TEMPLATE_ICONS[key];
}
