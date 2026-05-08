import { apiRequest } from "@/lib/api/client";
import type { Category, CategoryInput, CategoryUpdate } from "@/types/supabase-category";

export async function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>("/api/categories");
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    return await apiRequest<Category>(`/api/categories/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) return null;
    throw error;
  }
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  return apiRequest<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCategory(id: string, updates: CategoryUpdate): Promise<Category> {
  return apiRequest<Category>(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return apiRequest<void>(`/api/categories/${id}`, {
    method: "DELETE",
  });
}

export async function uploadCategoryIcon(categoryId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.set("kind", "category");
  formData.set("ownerId", categoryId);
  formData.set("file", file);

  const result = await apiRequest<{ url: string }>("/api/uploads", {
    method: "POST",
    body: formData,
  });

  return result.url;
}

export async function deleteCategoryIcon(iconUrl: string): Promise<void> {
  if (!iconUrl) return;

  await apiRequest<void>("/api/uploads", {
    method: "DELETE",
    body: JSON.stringify({ url: iconUrl }),
  }).catch((error) => {
    console.warn("Failed to delete category icon from Blob storage:", error);
  });
}

