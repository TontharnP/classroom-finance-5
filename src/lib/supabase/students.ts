import { supabase } from "../supabaseClient";
import type { Student, StudentInput, StudentUpdate } from "@/types/supabase";

/**
 * Fetch all students ordered by number
 */
export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("number", { ascending: true });

  if (error) {
    console.error("Error fetching students:", error);
    throw new Error(`Failed to fetch students: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single student by ID
 */
export async function getStudentById(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Error fetching student:", error);
    throw new Error(`Failed to fetch student: ${error.message}`);
  }

  return data;
}

/**
 * Create a new student
 */
export async function createStudent(input: StudentInput): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .insert({
      prefix: input.prefix,
      first_name: input.first_name,
      last_name: input.last_name,
      nick_name: input.nick_name,
      number: input.number,
      avatar_url: input.avatar_url,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating student:", error);
    throw new Error(`Failed to create student: ${error.message}`);
  }

  return data;
}

/**
 * Create multiple students (bulk insert)
 */
export async function createStudents(inputs: StudentInput[]): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .insert(inputs)
    .select();

  if (error) {
    console.error("Error creating students:", error);
    throw new Error(`Failed to create students: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a student
 */
export async function updateStudent(id: string, updates: StudentUpdate): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating student:", error);
    throw new Error(`Failed to update student: ${error.message}`);
  }

  return data;
}

/**
 * Delete a student and their avatar
 * Also deletes related transactions to maintain database consistency
 */
export async function deleteStudent(id: string): Promise<void> {
  // First, get the student to check if they have an avatar
  const student = await getStudentById(id);
  
  if (student?.avatar_url) {
    try {
      // Delete avatar from storage before deleting student record
      await deleteStudentAvatar(student.avatar_url);
      console.log("Avatar deleted for student:", id);
    } catch (err) {
      // Log error but continue with student deletion
      console.warn("Failed to delete avatar for student, continuing with student deletion:", err);
    }
  }

  // Delete related transactions first (to satisfy foreign key constraints)
  const { error: transactionsError } = await supabase
    .from("transactions")
    .delete()
    .eq("student_id", id);

  if (transactionsError) {
    console.error("Error deleting student transactions:", transactionsError);
    throw new Error(`Failed to delete student transactions: ${transactionsError.message}`);
  }

  // Delete student record from database
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting student:", error);
    throw new Error(`Failed to delete student: ${error.message}`);
  }
  
  console.log("Student deleted successfully:", id);
}

/**
 * Upload student avatar to Supabase Storage
 */
export async function uploadStudentAvatar(
  studentId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${studentId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading avatar:", uploadError);
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Delete student avatar from Supabase Storage
 */
export async function deleteStudentAvatar(avatarUrl: string): Promise<void> {
  if (!avatarUrl) {
    console.warn("deleteStudentAvatar called with empty URL");
    return;
  }

  try {
    // Extract file path from URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/avatars/<filename>
    const urlParts = avatarUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    
    if (!fileName) {
      console.error("Could not extract filename from avatar URL:", avatarUrl);
      return;
    }

    const filePath = `avatars/${fileName}`;

    const { error } = await supabase.storage.from("avatars").remove([filePath]);

    if (error) {
      console.error("Error deleting avatar from storage:", error);
      throw new Error(`Failed to delete avatar: ${error.message}`);
    }
    
    console.log(`Successfully deleted avatar: ${filePath}`);
  } catch (error) {
    console.error("Error in deleteStudentAvatar:", error);
    // Re-throw so calling code can handle it
    throw error;
  }
}
