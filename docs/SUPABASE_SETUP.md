# Supabase Setup Guide for Classroom Finance 5.0

## 📋 Prerequisites

- Supabase account (create at [supabase.com](https://supabase.com))
- Node.js 18+ installed
- Project repository cloned

## 🚀 Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Fill in:
   - **Name**: Classroom Finance 5.0
   - **Database Password**: (create a strong password - save it!)
   - **Region**: Choose closest to your location
   - **Plan**: Free tier is sufficient
4. Click **Create new project**
5. Wait 2-3 minutes for provisioning

### 2. Get API Credentials

1. In your project dashboard, click **Settings** (gear icon)
2. Navigate to **API**
3. Copy these values:
   - **Project URL** (something like `https://xxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")

### 3. Update Environment Variables

Open `.env.local` in your project root and update:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace `your-project` and `your-anon-key-here` with your actual values!

### 4. Run Database Migration

#### Option A: Using Supabase Dashboard (Recommended)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open the file `supabase/migrations/001_initial_schema.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success" message

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

### 5. Verify Database Tables

1. Go to **Table Editor** in Supabase dashboard
2. You should see 3 tables:
   - ✅ `students` (8 columns)
   - ✅ `schedules` (8 columns)
   - ✅ `transactions` (11 columns)
3. Click on each table to verify structure

### 6. Setup Storage Bucket

1. Go to **Storage** in sidebar
2. Click **New Bucket**
3. Create bucket:
   - **Name**: `avatars`
   - **Public**: ✅ Checked
4. After creation, go to **Policies** tab
5. Run this SQL in **SQL Editor**:

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

### 7. Test Connection

1. Stop your Next.js dev server (Ctrl + C)
2. Restart it:
   ```bash
   npm run dev
   ```
3. Open browser to `http://localhost:3000`
4. Open browser console (F12)
5. You should see no Supabase errors

### 8. Import Initial Data (Optional)

If you want to start with some test data:

1. Go to **SQL Editor**
2. Run this query to insert sample students:

```sql
INSERT INTO students (prefix, first_name, last_name, nick_name, number) VALUES
('เด็กชาย', 'สมชาย', 'ใจดี', 'ชาย', 1),
('เด็กหญิง', 'สมหญิง', 'ใจงาม', 'หญิง', 2),
('นาย', 'ทดสอบ', 'ระบบ', 'ทด', 3);
```

3. Verify in **Table Editor** → `students` table

### 9. Enable Row Level Security (Already Configured)

The migration already set up RLS policies, but you can verify:

1. Go to **Authentication** → **Policies**
2. You should see policies for:
   - `students` table (4 policies)
   - `schedules` table (4 policies)
   - `transactions` table (4 policies)

### 10. Update Application Code

The application is already configured to use Supabase! The store will automatically switch from mock data to real database once `.env.local` is configured.

## 🔍 Verification Checklist

- [ ] Supabase project created
- [ ] `.env.local` updated with correct credentials
- [ ] Migration `001_initial_schema.sql` executed successfully
- [ ] 3 tables visible in Table Editor (students, schedules, transactions)
- [ ] Storage bucket `avatars` created
- [ ] Storage policies configured
- [ ] Dev server restarted
- [ ] No console errors about Supabase

## 🐛 Troubleshooting

### Error: "Failed to fetch"
- Check if `.env.local` values are correct
- Ensure you copied the **Project URL** (not API URL)
- Restart dev server after changing `.env.local`

### Error: "Invalid API key"
- Verify you copied the **anon/public key** (not service_role key)
- Check for extra spaces or newlines
- Restart dev server

### Error: "relation does not exist"
- Migration didn't run successfully
- Go back to Step 4 and run migration again
- Check SQL Editor for any error messages

### Tables not showing data
- Try refreshing the page
- Check browser console for errors
- Verify RLS policies are enabled

### Storage upload fails
- Check if bucket `avatars` exists
- Verify bucket is set to **Public**
- Ensure storage policies are configured

## 📚 Next Steps

After setup is complete:

1. **Test CRUD operations**: Try adding/editing/deleting students
2. **Test file upload**: Add a student with avatar
3. **Monitor queries**: Use Supabase **Logs** to see database activity
4. **Setup authentication** (Optional): For production use

## 🔗 Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)

## 💡 Tips

- Use **SQL Editor** to inspect data during development
- Enable **Realtime** in table settings for live updates
- Use **API Docs** tab to see auto-generated REST endpoints
- Check **Logs** for debugging database queries
- Set up **Database Backups** before going to production

---

**Need help?** Open an issue or check the Supabase Discord community!
