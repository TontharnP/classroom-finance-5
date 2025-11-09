// Setup instructions for Supabase Storage

## Create Storage Bucket for Avatars

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the sidebar
3. Click **New Bucket**
4. Set the following:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Checked
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp,image/gif`

5. Click **Create bucket**

## Configure Bucket Policies

After creating the bucket, set up policies:

```sql
-- Allow public read access to avatars
CREATE POLICY "Allow public read access on avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated insert to avatars
CREATE POLICY "Allow authenticated insert on avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated update to avatars
CREATE POLICY "Allow authenticated update on avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated delete to avatars
CREATE POLICY "Allow authenticated delete on avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');
```

## Test Upload

You can test the upload functionality with:

```typescript
import { uploadStudentAvatar } from "@/lib/supabase/students";

const file = // ... get file from input
const avatarUrl = await uploadStudentAvatar(studentId, file);
console.log("Avatar uploaded:", avatarUrl);
```

## File Structure

Uploaded files will be stored as:
```
avatars/
  ├── {studentId}-{timestamp}.jpg
  ├── {studentId}-{timestamp}.png
  └── ...
```

This ensures unique filenames and easy cleanup when deleting students.
