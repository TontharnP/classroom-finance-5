# Development Guide - Classroom Finance 5.0

This guide will help you understand the codebase and make modifications or additions to the application.

---

## 🏗️ Architecture Overview

### Technology Stack
```
Frontend:     Next.js 16 (App Router) + TypeScript
Styling:      Tailwind CSS v4
State:        Zustand (in-memory) / Supabase + SWR (ready)
Forms:        react-hook-form + Zod
UI:           Framer Motion + Recharts + react-calendar
```

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Redirects to /dashboard
│   ├── dashboard/         # Dashboard page
│   ├── transactions/      # Transactions page
│   ├── schedule/          # Schedule page
│   └── students/          # Students page
│
├── components/            # React components
│   ├── dashboard/        # Dashboard-specific components
│   ├── transactions/     # Transaction components + modals
│   ├── schedule/         # Schedule components + modals
│   ├── students/         # Student components + modals
│   ├── ui/               # Reusable UI components
│   ├── ErrorBoundary.tsx # Error handling wrapper
│   └── Header.tsx        # Navigation header
│
├── lib/                   # Core utilities
│   ├── store.ts          # Zustand store (current)
│   ├── calculations.ts   # Business logic
│   ├── utils.ts          # Helper functions
│   └── supabase/         # Supabase integration
│       ├── client.ts     # Supabase client setup
│       ├── students.ts   # Student CRUD operations
│       ├── schedules.ts  # Schedule CRUD operations
│       ├── transactions.ts # Transaction CRUD operations
│       └── adapter.ts    # Type conversion layer
│
├── hooks/                 # Custom React hooks
│   └── useSupabase.ts    # SWR hooks for data fetching
│
└── types/                 # TypeScript types
    ├── index.ts          # UI types (camelCase)
    └── supabase.ts       # Database types (snake_case)
```

---

## 🎨 Design Patterns

### 1. Component Structure

Each feature follows this pattern:

```typescript
// Feature view (main component)
FeatureView.tsx
  ├── State management (Zustand/SWR)
  ├── Data filtering/sorting
  ├── Event handlers
  └── Render UI with child components

// Child components
FeatureCard.tsx        // Individual item display
AddFeatureModal.tsx    // Create new item
EditFeatureModal.tsx   // Edit existing item
FeatureDetailModal.tsx // View item details
```

**Example**: Students feature
```
StudentsGrid.tsx           → Main view
StudentCard.tsx            → Individual card
AddStudentModal.tsx        → Create student
EditStudentModal.tsx       → Edit student
StudentDetailModal.tsx     → View details + payment history
```

### 2. Modal Pattern

All modals follow this structure:

```typescript
export function MyModal({ open, onClose, data }) {
  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: data || {}
  });

  const onSubmit = async (values: Schema) => {
    try {
      // Perform action
      await action(values);
      toast.success("Success message");
      onClose();
    } catch (error) {
      toast.error("Error message");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Title">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
        <button type="submit">Submit</button>
      </form>
    </Modal>
  );
}
```

### 3. Form Validation Pattern

Using `react-hook-form` + `Zod`:

```typescript
// 1. Define schema
const schema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อ"),
  amount: z.number().min(0, "จำนวนต้องมากกว่า 0"),
  date: z.string()
});

type FormData = z.infer<typeof schema>;

// 2. Setup form
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});

// 3. Register fields
<input {...form.register("name")} />
{form.formState.errors.name && (
  <span className="text-red-500 text-sm">
    {form.formState.errors.name.message}
  </span>
)}

// 4. Handle submit
const onSubmit = (data: FormData) => {
  // Data is validated!
};
```

### 4. State Management Pattern

**Current (Zustand)**:
```typescript
// Define store
export const useAppStore = create<State>((set) => ({
  data: initialData,
  addStudent: (student) => set((state) => ({
    data: {
      ...state.data,
      students: [...state.data.students, student]
    }
  }))
}));

// Use in component
const students = useAppStore((state) => state.data.students);
const addStudent = useAppStore((state) => state.addStudent);
```

**Ready to migrate (Supabase + SWR)**:
```typescript
// Use hook
const { students, isLoading, mutate } = useStudents();

// Perform action
import { createStudent } from "@/lib/supabase/students";
await createStudent(newStudent);
mutate(); // Revalidate data
```

---

## 🔧 Common Tasks

### Adding a New Feature

**Example**: Add a "Categories" feature

1. **Create types** (`src/types/index.ts`):
```typescript
export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}
```

2. **Add to store** (`src/lib/store.ts`):
```typescript
interface DataBundle {
  // ... existing
  categories: Category[];
}

// Add actions
addCategory: (category: Category) => { ... },
updateCategory: (id: string, updates: Partial<Category>) => { ... },
deleteCategory: (id: string) => { ... },
```

3. **Create components** (`src/components/categories/`):
```
CategoriesView.tsx
CategoryCard.tsx
AddCategoryModal.tsx
EditCategoryModal.tsx
```

4. **Create page** (`src/app/categories/page.tsx`):
```typescript
export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <h1>Categories</h1>
      <CategoriesView />
    </div>
  );
}
```

5. **Add to navigation** (`src/components/Header.tsx`):
```typescript
<Link href="/categories">Categories</Link>
```

### Adding a New Modal

1. **Create modal component**:
```typescript
// src/components/feature/MyModal.tsx
"use client";
import { Modal } from "@/components/ui/Modal";
import { useForm } from "react-hook-form";
// ... rest of imports

export function MyModal({ open, onClose }) {
  // Form setup
  // Submit handler
  // Return JSX
}
```

2. **Integrate in parent component**:
```typescript
const [modalOpen, setModalOpen] = useState(false);

return (
  <>
    <button onClick={() => setModalOpen(true)}>Open</button>
    <MyModal open={modalOpen} onClose={() => setModalOpen(false)} />
  </>
);
```

### Adding Form Validation

1. **Define Zod schema**:
```typescript
const schema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  age: z.number().min(0).max(120),
  category: z.enum(["A", "B", "C"])
});
```

2. **Use with react-hook-form**:
```typescript
const form = useForm({
  resolver: zodResolver(schema)
});
```

### Adding a Calculation

Add business logic to `src/lib/calculations.ts`:

```typescript
export function calculateNewMetric(data: DataBundle): number {
  // Your calculation logic
  return result;
}
```

Use in component with `useMemo`:
```typescript
const metric = useMemo(() => calculateNewMetric(data), [data]);
```

### Adding Empty States

```typescript
{data.length === 0 ? (
  <div className="rounded-xl border p-6 text-center text-zinc-500 dark:border-zinc-800">
    <div className="mb-2 text-lg font-medium">ยังไม่มีข้อมูล</div>
    <div className="text-sm">คำแนะนำสำหรับผู้ใช้</div>
  </div>
) : (
  <DataDisplay data={data} />
)}
```

### Adding Loading States

1. **Create skeleton**:
```typescript
// src/components/ui/Skeleton.tsx
export function MyFeatureSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

2. **Use with Suspense**:
```typescript
<Suspense fallback={<MyFeatureSkeleton />}>
  <MyFeatureComponent />
</Suspense>
```

### Adding Error Handling

Wrap components with ErrorBoundary:
```typescript
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

---

## 🗄️ Working with Supabase

### Current Setup
- Database: PostgreSQL with 3 tables
- Storage: `avatars` bucket
- Auth: Not yet implemented

### Running Queries

**Students**:
```typescript
import { getStudents, createStudent, updateStudent, deleteStudent } from "@/lib/supabase/students";

// Get all
const students = await getStudents();

// Get one
const student = await getStudentById(id);

// Create
const newStudent = await createStudent({
  prefix: "เด็กชาย",
  first_name: "สมชาย",
  last_name: "ใจดี",
  number: 1
});

// Update
await updateStudent(id, { first_name: "สมหญิง" });

// Delete
await deleteStudent(id);
```

**Using with SWR Hooks**:
```typescript
const { students, isLoading, error, mutate } = useStudents();

// After mutation
await createStudent(newStudent);
mutate(); // Revalidates data automatically
```

### Type Conversion

The adapter handles field name conversion:

```typescript
import { dbStudentToStudent, studentToDbStudent } from "@/lib/supabase/adapter";

// Database → UI
const uiStudent = dbStudentToStudent(dbStudent);
// { firstName, lastName } from { first_name, last_name }

// UI → Database
const dbData = studentToDbStudent(uiStudent);
// { first_name, last_name } from { firstName, lastName }
```

---

## 🎨 Styling Guide

### Tailwind Classes

**Common patterns**:
```typescript
// Cards
className="rounded-xl border p-4 bg-white dark:bg-zinc-900"

// Buttons
className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"

// Inputs
className="w-full rounded-md border px-3 py-2 dark:bg-zinc-900"

// Text colors
className="text-zinc-900 dark:text-zinc-100"  // Primary text
className="text-zinc-500 dark:text-zinc-400"  // Muted text

// Spacing
className="space-y-6"  // Vertical spacing
className="gap-4"      // Grid/flex gap
```

### Dark Mode

All components support dark mode via `dark:` prefix:
```typescript
className="bg-white dark:bg-zinc-900 text-black dark:text-white"
```

### Responsive Design

Use responsive prefixes:
```typescript
// Mobile first
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
className="text-sm md:text-base lg:text-lg"
```

---

## 🧪 Testing Checklist

### Manual Testing

**For each feature**:
- [ ] Create new item
- [ ] Edit existing item
- [ ] Delete item
- [ ] Search/filter works
- [ ] Form validation works
- [ ] Error messages display
- [ ] Success notifications show
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Responsive on mobile
- [ ] Dark mode works
- [ ] Data persists correctly

**Cross-feature tests**:
- [ ] Create schedule → Quick pay works
- [ ] Delete student → Transactions update
- [ ] Delete schedule → Related transactions removed

---

## 🚀 Performance Tips

### 1. Use `useMemo` for Calculations
```typescript
const total = useMemo(() => 
  transactions.reduce((sum, t) => sum + t.amount, 0),
  [transactions]
);
```

### 2. Use `useCallback` for Event Handlers
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### 3. Code Splitting
Next.js automatically splits code by route. For heavy components:
```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />
});
```

### 4. Image Optimization
Use Next.js Image:
```typescript
import Image from "next/image";
<Image src={url} alt="..." width={100} height={100} />
```

---

## 🐛 Debugging Tips

### 1. Check Browser Console
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab for API calls

### 2. React DevTools
- Install React Developer Tools extension
- Inspect component props/state
- Profile component renders

### 3. TypeScript Errors
```bash
# Type check without running
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/components/MyComponent.tsx
```

### 4. Zustand DevTools
```typescript
// Add to store.ts
import { devtools } from 'zustand/middleware';

export const useAppStore = create(
  devtools((set) => ({ ... }))
);
```

---

## 📝 Code Style

### Naming Conventions

- **Components**: PascalCase (`StudentCard.tsx`)
- **Functions**: camelCase (`calculateTotal`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_STUDENTS`)
- **Types**: PascalCase (`Student`, `Transaction`)

### File Organization

```typescript
// 1. Imports
import { useState } from "react";
import { MyType } from "@/types";

// 2. Types/Interfaces
interface Props { ... }

// 3. Constants
const MAX_VALUE = 100;

// 4. Component
export function MyComponent({ props }: Props) {
  // State
  // Effects
  // Handlers
  // Render
}

// 5. Helper functions (if needed)
function helperFunction() { ... }
```

### Comments

Use JSDoc for functions:
```typescript
/**
 * Calculate total balance from transactions
 * @param data - The data bundle containing transactions
 * @returns Total balance (income - expense)
 */
export function calculateBalance(data: DataBundle): number {
  // Implementation
}
```

---

## 🔐 Security Considerations

### 1. Input Validation
Always validate with Zod schemas:
```typescript
const schema = z.object({
  amount: z.number().min(0).max(1000000)
});
```

### 2. Supabase RLS
When migrating to Supabase, ensure RLS policies are set:
```sql
-- Example: Only authenticated users can access
create policy "Users can view their data"
  on students for select
  using (auth.uid() is not null);
```

### 3. Environment Variables
Never commit `.env.local`:
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## 📚 Additional Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

### Learning
- [Next.js Learn](https://nextjs.org/learn)
- [React Patterns](https://reactpatterns.com/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## 🆘 Common Issues

### Issue: TypeScript errors but app runs fine
**Solution**: Restart TypeScript server in VS Code (Cmd+Shift+P → "TypeScript: Restart TS Server")

### Issue: Port 3000 already in use
**Solution**: The app automatically uses 3001. Or kill the process:
```bash
pkill -f "next dev"
```

### Issue: Changes not reflecting
**Solution**: Hard refresh browser (Cmd+Shift+R) or restart dev server

### Issue: Supabase connection error
**Solution**: Check `.env.local` has correct credentials

### Issue: Form not validating
**Solution**: Ensure Zod schema matches form fields and resolver is set

---

## 🎯 Next Steps

### Short Term
1. Complete Supabase migration
2. Add optimistic updates
3. Implement image upload/delete
4. Add error toasts

### Medium Term
1. Add authentication
2. Export to Excel/PDF
3. Receipt printing
4. Monthly reports

### Long Term
1. Multi-class support
2. Parent portal
3. SMS notifications
4. Mobile app

---

**Happy coding! 🚀**

For questions or issues, refer to:
- `README.md` - Project overview
- `IMPLEMENTATION_SUMMARY.md` - Feature details
- `PROJECT_COMPLETION.md` - Status report
