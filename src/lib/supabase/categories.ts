import { supabase } from "../supabaseClient";
import type { Category, CategoryInput, CategoryUpdate } from "@/types/supabase-category";

/**
 * Fetch all categories ordered by name
 */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    console.error("Error code:", error.code);
    
    // If table doesn't exist, return empty array instead of throwing
    // This allows the app to work before migration is run
    if (error.code === "42P01") {
      console.warn("⚠️  Categories table does not exist. Run migration: QUICK_MIGRATION_GUIDE.md");
      return [];
    }
    
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching category:", error);
    throw new Error(`Failed to fetch category: ${error.message}`);
  }

  return data;
}

/**
 * Create a new category
 */
export async function createCategory(input: CategoryInput): Promise<Category> {
  console.log("Creating category with input:", input);
  
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name,
      icon: input.icon,
    })
    .select()
    .single();

  console.log("Supabase response:", { data, error });

  if (error) {
    console.error("Error creating category:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    
    // Check for specific error types
    if (error.code === "42P01") {
      throw new Error("Categories table does not exist. Please run the migration first. See QUICK_MIGRATION_GUIDE.md");
    }
    
    throw new Error(`Failed to create category: ${error.message || "Unknown error"}`);
  }

  if (!data) {
    throw new Error("No data returned from category creation");
  }

  return data;
}

/**
 * Update a category
 */
export async function updateCategory(id: string, updates: CategoryUpdate): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error);
    throw new Error(`Failed to update category: ${error.message}`);
  }

  return data;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting category:", error);
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

/**
 * Upload a category icon image to Supabase Storage
 */
export async function uploadCategoryIcon(
  categoryId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${categoryId}-${Date.now()}.${fileExt}`;
  const filePath = `category-icons/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars") // Using same bucket as avatars
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading category icon:", uploadError);
    throw new Error(`Failed to upload category icon: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Delete category icon from Supabase Storage
 */
export async function deleteCategoryIcon(iconUrl: string): Promise<void> {
  if (!iconUrl) {
    console.warn("deleteCategoryIcon called with empty URL");
    return;
  }

  try {
    // Extract file path from URL
    const urlParts = iconUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    
    if (!fileName) {
      console.warn("Could not extract filename from icon URL:", iconUrl);
      return;
    }

    const filePath = `category-icons/${fileName}`;

    const { error } = await supabase.storage
      .from("avatars")
      .remove([filePath]);

    if (error) {
      console.error("Error deleting category icon:", error);
      // Don't throw - we want to continue even if delete fails
    }
  } catch (error) {
    console.error("Exception while deleting category icon:", error);
    // Don't throw - we want to continue even if delete fails
  }
}
