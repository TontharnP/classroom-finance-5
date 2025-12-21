// Category type matching Supabase schema
export type Category = {
  id: string;
  name: string;
  icon?: string;
  created_at: string;
  updated_at: string;
};

// Input types (without auto-generated fields)
export type CategoryInput = Omit<Category, "id" | "created_at" | "updated_at">;

// Update types (partial without auto-generated fields)
export type CategoryUpdate = Partial<Omit<Category, "id" | "created_at" | "updated_at">>;
