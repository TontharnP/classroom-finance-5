import { apiRequest } from "@/lib/api/client";
import type { Student, StudentInput, StudentUpdate } from "@/types/supabase";

export async function getStudents(): Promise<Student[]> {
  return apiRequest<Student[]>("/api/students");
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    return await apiRequest<Student>(`/api/students/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) return null;
    throw error;
  }
}

export async function createStudent(input: StudentInput): Promise<Student> {
  return apiRequest<Student>("/api/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createStudents(inputs: StudentInput[]): Promise<Student[]> {
  return apiRequest<Student[]>("/api/students", {
    method: "POST",
    body: JSON.stringify(inputs),
  });
}

export async function updateStudent(id: string, updates: StudentUpdate): Promise<Student> {
  return apiRequest<Student>(`/api/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  const student = await getStudentById(id);

  await apiRequest<void>(`/api/students/${id}`, {
    method: "DELETE",
  });

  if (student?.avatar_url) {
    await deleteStudentAvatar(student.avatar_url).catch((error) => {
      console.warn("Failed to delete student avatar from Blob storage:", error);
    });
  }
}

export async function uploadStudentAvatar(studentId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.set("kind", "student");
  formData.set("ownerId", studentId);
  formData.set("file", file);

  const result = await apiRequest<{ url: string }>("/api/uploads", {
    method: "POST",
    body: formData,
  });

  return result.url;
}

export async function deleteStudentAvatar(avatarUrl: string): Promise<void> {
  if (!avatarUrl) return;

  await apiRequest<void>("/api/uploads", {
    method: "DELETE",
    body: JSON.stringify({ url: avatarUrl }),
  });
}

