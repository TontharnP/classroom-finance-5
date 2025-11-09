# Quick Reference - Classroom Finance 5.0

Quick commands and code snippets for common tasks.

---

## 🚀 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Kill dev server
pkill -f "next dev"
```

---

## 📦 Install Dependencies

```bash
# Install all
npm install

# Add new package
npm install package-name

# Add dev dependency
npm install -D package-name
```

---

## 🎨 Common UI Patterns

### Button
```tsx
<button 
  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
  onClick={handleClick}
>
  Click Me
</button>
```

### Input
```tsx
<input 
  type="text"
  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900"
  placeholder="Enter text..."
/>
```

### Card
```tsx
<div className="rounded-xl border p-4 bg-white dark:bg-zinc-900 dark:border-zinc-800">
  <h3 className="text-lg font-semibold">Title</h3>
  <p className="text-zinc-500">Content</p>
</div>
```

### Modal
```tsx
<Modal open={open} onClose={onClose} title="Modal Title">
  {/* Content */}
</Modal>
```

---

## 📝 Form with Validation

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  age: z.number().min(0, "Must be positive")
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("name")} />
      {form.formState.errors.name && (
        <span className="text-red-500">{form.formState.errors.name.message}</span>
      )}
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## 🗄️ State Management (Zustand)

### Get State
```tsx
const students = useAppStore(state => state.data.students);
```

### Update State
```tsx
const addStudent = useAppStore(state => state.addStudent);
addStudent(newStudent);
```

### Multiple Values
```tsx
const { data, addStudent, deleteStudent } = useAppStore(state => ({
  data: state.data,
  addStudent: state.addStudent,
  deleteStudent: state.deleteStudent
}));
```

---

## 🔄 Supabase Operations (Ready to use)

### Students
```tsx
import { getStudents, createStudent, updateStudent, deleteStudent } from "@/lib/supabase/students";

// Get all
const students = await getStudents();

// Create
await createStudent({ prefix: "เด็กชาย", first_name: "สมชาย", last_name: "ใจดี", number: 1 });

// Update
await updateStudent(id, { first_name: "สมหญิง" });

// Delete
await deleteStudent(id);
```

### With SWR Hook
```tsx
const { students, isLoading, error, mutate } = useStudents();

// After mutation
await createStudent(newStudent);
mutate(); // Revalidate
```

---

## 🎯 Common Calculations

### Total Balance
```tsx
import { calculateBalance } from "@/lib/calculations";
const balance = calculateBalance(data);
// balance.balance, balance.income, balance.expense
```

### By Category
```tsx
import { summarizeByCategory } from "@/lib/calculations";
const summary = summarizeByCategory(data, "2024-01"); // YYYY-MM
// [{ name: "อาหาร", value: 5000 }, ...]
```

### Payment Status
```tsx
import { countStudentPaymentStatus } from "@/lib/calculations";
const status = countStudentPaymentStatus(data, scheduleId);
// { paid: 15, unpaid: 5 }
```

---

## 🎨 Tailwind Classes

### Colors
```tsx
// Text
text-zinc-900 dark:text-zinc-100  // Primary
text-zinc-500 dark:text-zinc-400  // Secondary
text-blue-600 dark:text-blue-400  // Accent

// Background
bg-white dark:bg-zinc-900
bg-zinc-50 dark:bg-zinc-800
bg-blue-600 hover:bg-blue-700

// Border
border-zinc-200 dark:border-zinc-800
```

### Spacing
```tsx
p-4        // Padding all sides
px-4 py-2  // Padding horizontal/vertical
m-4        // Margin
gap-4      // Grid/flex gap
space-y-6  // Vertical spacing between children
```

### Layout
```tsx
// Flex
flex items-center justify-between gap-4

// Grid
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4

// Responsive
hidden md:block  // Hidden on mobile, visible on tablet+
```

---

## 🔧 TypeScript Types

### Define Interface
```tsx
export interface MyType {
  id: string;
  name: string;
  amount: number;
  optional?: string;
  createdAt: string;
}
```

### Use in Component
```tsx
interface Props {
  data: MyType;
  onEdit: (item: MyType) => void;
  children?: React.ReactNode;
}

function MyComponent({ data, onEdit, children }: Props) {
  // ...
}
```

### Array/Object Types
```tsx
const items: MyType[] = [];
const map: Record<string, MyType> = {};
const partial: Partial<MyType> = { name: "Only name" };
const omit: Omit<MyType, "id"> = { name: "...", amount: 100 };
```

---

## 📱 Responsive Breakpoints

```tsx
// Tailwind breakpoints
sm: 640px   // Tablet
md: 768px   // Desktop
lg: 1024px  // Large desktop
xl: 1280px  // Extra large

// Usage
className="text-sm md:text-base lg:text-lg"
className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
```

---

## 🎭 Animation (Framer Motion)

### Fade In
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

### Slide Up
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

## 🔍 Filtering & Searching

### Filter Array
```tsx
const filtered = items.filter(item => {
  const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
  const matchesType = !typeFilter || item.type === typeFilter;
  return matchesSearch && matchesType;
});
```

### Sort Array
```tsx
const sorted = [...items].sort((a, b) => {
  if (sortBy === "name") return a.name.localeCompare(b.name);
  if (sortBy === "amount") return b.amount - a.amount;
  return 0;
});
```

---

## 🎨 Icons (Lucide React)

```tsx
import { Plus, Edit, Trash2, Search, Calendar, User } from "lucide-react";

<Plus className="h-4 w-4" />
<Edit className="h-5 w-5 text-blue-600" />
<Trash2 className="h-4 w-4 text-red-600" />
```

[Browse all icons](https://lucide.dev/icons/)

---

## 🌙 Dark Mode

### Add Dark Mode Classes
```tsx
// Text
className="text-gray-900 dark:text-gray-100"

// Background
className="bg-white dark:bg-zinc-900"

// Border
className="border-gray-200 dark:border-zinc-800"
```

---

## 📊 Charts (Recharts)

### Pie Chart
```tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "A", value: 400 },
  { name: "B", value: 300 }
];

<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie dataKey="value" data={data}>
      {data.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={COLORS[index]} />
      ))}
    </Pie>
  </PieChart>
</ResponsiveContainer>
```

---

## 🚨 Error Handling

### Try-Catch
```tsx
const handleAction = async () => {
  try {
    await performAction();
    toast.success("Success!");
  } catch (error) {
    console.error(error);
    toast.error("Error occurred");
  }
};
```

### Error Boundary
```tsx
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

---

## 📅 Date Formatting

```tsx
import { format } from "date-fns";

// Format date
format(new Date(), "dd/MM/yyyy")  // 08/11/2024
format(new Date(), "dd MMM yyyy") // 08 Nov 2024
format(new Date(), "yyyy-MM-dd")  // 2024-11-08
```

---

## 🎯 Performance

### Memoization
```tsx
import { useMemo, useCallback } from "react";

// Expensive calculation
const total = useMemo(() => 
  items.reduce((sum, item) => sum + item.amount, 0),
  [items]
);

// Event handler
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

---

## 🔐 Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

Access in code:
```tsx
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

---

## 🎨 Loading States

### Skeleton
```tsx
import { Skeleton } from "@/components/ui/Skeleton";

<Skeleton className="h-8 w-40" />
<Skeleton className="h-24 w-full" />
```

### Suspense
```tsx
<Suspense fallback={<MySkeleton />}>
  <MyComponent />
</Suspense>
```

---

## 🎉 Notifications

```tsx
import toast from "react-hot-toast";

toast.success("Success message");
toast.error("Error message");
toast.loading("Loading...");
```

---

## 🔗 Navigation

```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

// Link
<Link href="/dashboard">Dashboard</Link>

// Programmatic
const router = useRouter();
router.push("/transactions");
```

---

## 📝 Quick File Templates

### New Component
```tsx
"use client";
import { useState } from "react";

interface Props {
  // Define props
}

export function MyComponent({ }: Props) {
  const [state, setState] = useState();
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### New Page
```tsx
import { Suspense } from "react";
import { MyComponent } from "@/components/MyComponent";
import { MySkeleton } from "@/components/MySkeleton";

export default function MyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Page Title</h1>
      <Suspense fallback={<MySkeleton />}>
        <MyComponent />
      </Suspense>
    </div>
  );
}
```

---

## 🎓 Useful VS Code Shortcuts

```
Cmd + P          → Quick open file
Cmd + Shift + P  → Command palette
Cmd + /          → Comment line
Cmd + D          → Select next occurrence
Cmd + Shift + L  → Select all occurrences
Option + Up/Down → Move line up/down
Cmd + K, S       → Save all files
```

---

**🚀 Quick access to documentation:**
- `README.md` - Project overview
- `IMPLEMENTATION_SUMMARY.md` - Feature details  
- `DEVELOPMENT_GUIDE.md` - In-depth guide
- `PROJECT_COMPLETION.md` - Status report

**Need help?** Check the Development Guide for detailed explanations!
