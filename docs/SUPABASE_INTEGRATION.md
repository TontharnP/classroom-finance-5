# Supabase Integration Documentation

## 📂 File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── index.ts              # Central exports
│   │   ├── students.ts           # Student CRUD operations
│   │   ├── schedules.ts          # Schedule CRUD operations
│   │   └── transactions.ts       # Transaction CRUD operations
│   └── supabaseClient.ts         # Supabase client initialization
├── hooks/
│   └── useSupabase.ts            # SWR hooks for data fetching
└── types/
    └── supabase.ts               # TypeScript types matching DB schema

supabase/
├── migrations/
│   └── 001_initial_schema.sql    # Database schema
├── STORAGE_SETUP.md              # Storage bucket setup guide
└── SUPABASE_SETUP.md            # Complete setup instructions
```

## 🗄️ Database Schema

### Tables

#### `students`
```sql
id            UUID PRIMARY KEY
prefix        VARCHAR(20)          -- คำนำหน้า (นาย, นาง, เด็กชาย, etc.)
first_name    VARCHAR(100)
last_name     VARCHAR(100)
nick_name     VARCHAR(50)
number        INTEGER UNIQUE       -- เลขที่นักเรียน
avatar_url    TEXT                 -- URL to profile image
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

#### `schedules`
```sql
id              UUID PRIMARY KEY
name            VARCHAR(200)
amount_per_item DECIMAL(10,2)      -- จำนวนเงินต่อรายการ
start_date      DATE
end_date        DATE               -- NULL = ไม่มีวันสิ้นสุด
description     TEXT
student_ids     UUID[]             -- Array of student IDs
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### `transactions`
```sql
id            UUID PRIMARY KEY
name          VARCHAR(200)
kind          VARCHAR(20)          -- 'income' | 'expense'
amount        DECIMAL(10,2)
method        VARCHAR(20)          -- 'bank' | 'cash' | 'truemoney'
category      VARCHAR(100)
description   TEXT
source        VARCHAR(20)          -- 'transaction' | 'schedule'
schedule_id   UUID                 -- FK to schedules (if source='schedule')
student_id    UUID                 -- FK to students (if source='schedule')
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### Views

#### `student_payment_summary`
Aggregates payment data per student:
- Total schedules paid
- Total amount paid

#### `schedule_collection_summary`
Aggregates collection data per schedule:
- Total students
- Students who paid
- Total collected vs target

## 🔧 API Functions

### Students (`src/lib/supabase/students.ts`)

```typescript
// Fetch operations
getStudents(): Promise<Student[]>
getStudentById(id: string): Promise<Student | null>

// Mutations
createStudent(input: StudentInput): Promise<Student>
updateStudent(id: string, updates: StudentUpdate): Promise<Student>
deleteStudent(id: string): Promise<void>

// Storage
uploadStudentAvatar(studentId: string, file: File): Promise<string>
deleteStudentAvatar(avatarUrl: string): Promise<void>
```

### Schedules (`src/lib/supabase/schedules.ts`)

```typescript
// Fetch operations
getSchedules(): Promise<Schedule[]>
getScheduleById(id: string): Promise<Schedule | null>
getActiveSchedules(): Promise<Schedule[]>

// Mutations
createSchedule(input: ScheduleInput): Promise<Schedule>
updateSchedule(id: string, updates: ScheduleUpdate): Promise<Schedule>
deleteSchedule(id: string): Promise<void>

// Analytics
getStudentsPaidForSchedule(scheduleId: string): Promise<string[]>
getSchedulePaymentStatus(scheduleId: string): Promise<{
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalCollected: number;
  targetAmount: number;
}>
```

### Transactions (`src/lib/supabase/transactions.ts`)

```typescript
// Fetch operations
getTransactions(): Promise<Transaction[]>
getTransactionById(id: string): Promise<Transaction | null>
getTransactionsByKind(kind: 'income' | 'expense'): Promise<Transaction[]>
getTransactionsBySource(source: 'transaction' | 'schedule'): Promise<Transaction[]>
getTransactionsBySchedule(scheduleId: string): Promise<Transaction[]>
getTransactionsByStudent(studentId: string): Promise<Transaction[]>
getTransactionsByMonth(month: string): Promise<Transaction[]>

// Mutations
createTransaction(input: TransactionInput): Promise<Transaction>
createTransactions(inputs: TransactionInput[]): Promise<Transaction[]>
updateTransaction(id: string, updates: TransactionUpdate): Promise<Transaction>
deleteTransaction(id: string): Promise<void>

// Analytics
getTotalBalance(): Promise<{ income: number; expense: number; balance: number }>
getIncomeByMethod(): Promise<{ bank: number; cash: number; truemoney: number; total: number }>
getTransactionsByCategory(month?: string): Promise<Array<{ category: string; amount: number; kind: string }>>
```

## 🪝 React Hooks (`src/hooks/useSupabase.ts`)

All hooks use SWR for automatic caching, revalidation, and optimistic updates.

### Student Hooks
```typescript
const { students, isLoading, isError, mutate } = useStudents();
const { student, isLoading, isError, mutate } = useStudent(id);
```

### Schedule Hooks
```typescript
const { schedules, isLoading, isError, mutate } = useSchedules();
const { schedules, isLoading, isError, mutate } = useActiveSchedules();
const { schedule, isLoading, isError, mutate } = useSchedule(id);
const { status, isLoading, isError, mutate } = useSchedulePaymentStatus(scheduleId);
```

### Transaction Hooks
```typescript
const { transactions, isLoading, isError, mutate } = useTransactions();
const { transactions, isLoading, isError, mutate } = useTransactionsByKind(kind);
const { transactions, isLoading, isError, mutate } = useTransactionsBySource(source);
const { transactions, isLoading, isError, mutate } = useTransactionsBySchedule(scheduleId);
const { transactions, isLoading, isError, mutate } = useTransactionsByStudent(studentId);
const { transactions, isLoading, isError, mutate } = useTransactionsByMonth(month);
```

### Analytics Hooks
```typescript
const { balance, isLoading, isError, mutate } = useTotalBalance();
const { incomeBreakdown, isLoading, isError, mutate } = useIncomeByMethod();
const { categories, isLoading, isError, mutate } = useTransactionsByCategory(month);
```

### Utility Hook
```typescript
const revalidateAll = useRevalidateAll();
await revalidateAll(); // Refresh all data
```

## 💡 Usage Examples

### Example 1: Add Student with Avatar

```typescript
import { createStudent, uploadStudentAvatar } from '@/lib/supabase';

async function handleAddStudent(data: StudentInput, avatarFile?: File) {
  try {
    // Create student
    const student = await createStudent(data);
    
    // Upload avatar if provided
    if (avatarFile) {
      const avatarUrl = await uploadStudentAvatar(student.id, avatarFile);
      await updateStudent(student.id, { avatar_url: avatarUrl });
    }
    
    toast.success('เพิ่มนักเรียนสำเร็จ');
  } catch (error) {
    toast.error('เกิดข้อผิดพลาด');
  }
}
```

### Example 2: Create Schedule-based Transaction

```typescript
import { createTransactions } from '@/lib/supabase';

async function handleCollectPayment(scheduleId: string, studentIds: string[], method: string) {
  const schedule = await getScheduleById(scheduleId);
  
  const transactions = studentIds.map(studentId => ({
    name: schedule.name,
    kind: 'income' as const,
    amount: schedule.amount_per_item,
    method: method as 'bank' | 'cash' | 'truemoney',
    source: 'schedule' as const,
    schedule_id: scheduleId,
    student_id: studentId,
  }));
  
  await createTransactions(transactions);
  toast.success(`บันทึกการชำระ ${studentIds.length} รายการ`);
}
```

### Example 3: Display Data with Loading States

```typescript
'use client';
import { useStudents } from '@/hooks/useSupabase';

export function StudentsList() {
  const { students, isLoading, isError } = useStudents();
  
  if (isLoading) return <div>กำลังโหลด...</div>;
  if (isError) return <div>เกิดข้อผิดพลาด</div>;
  
  return (
    <div>
      {students.map(student => (
        <div key={student.id}>{student.first_name}</div>
      ))}
    </div>
  );
}
```

### Example 4: Optimistic Update

```typescript
import { deleteStudent } from '@/lib/supabase';
import { useStudents } from '@/hooks/useSupabase';

function DeleteButton({ studentId }: { studentId: string }) {
  const { mutate } = useStudents();
  
  async function handleDelete() {
    // Optimistic update (remove from UI immediately)
    mutate(
      students => students.filter(s => s.id !== studentId),
      { revalidate: false }
    );
    
    try {
      await deleteStudent(studentId);
      toast.success('ลบนักเรียนสำเร็จ');
    } catch (error) {
      // Revert on error
      mutate();
      toast.error('เกิดข้อผิดพลาด');
    }
  }
  
  return <button onClick={handleDelete}>ลบ</button>;
}
```

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with these policies:

- **Public Read**: Anyone can read data (SELECT)
- **Authenticated Write**: Only authenticated users can:
  - INSERT new records
  - UPDATE existing records
  - DELETE records

To enforce authentication, update policies:

```sql
-- Example: Restrict to authenticated users only
CREATE POLICY "Authenticated read only"
  ON students FOR SELECT
  USING (auth.role() = 'authenticated');
```

## 🚀 Migration Guide

### From Mock Data to Supabase

1. **Update `.env.local`** with real Supabase credentials
2. **Run migration** in Supabase SQL Editor
3. **Replace store calls** with Supabase hooks:

```typescript
// Before (Mock Data)
const data = useAppStore(state => state.data);
const students = data.students;

// After (Supabase)
const { students, isLoading } = useStudents();
```

4. **Add loading states** to components
5. **Test CRUD operations** thoroughly

### Gradual Migration Strategy

You can migrate incrementally:

1. Start with Students (simplest)
2. Then Schedules
3. Finally Transactions (most complex)

Keep mock data as fallback during transition.

## 📊 Performance Tips

### 1. Use Selective Fetching
```typescript
// Bad: Fetch all, filter in client
const { transactions } = useTransactions();
const income = transactions.filter(t => t.kind === 'income');

// Good: Fetch filtered data
const { transactions: income } = useTransactionsByKind('income');
```

### 2. Avoid Unnecessary Revalidation
```typescript
// Disable auto-revalidation for static data
const { data } = useSWR('students', getStudents, {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
});
```

### 3. Batch Inserts
```typescript
// Bad: Multiple inserts
for (const student of students) {
  await createStudent(student);
}

// Good: Bulk insert
await supabase.from('students').insert(students);
```

### 4. Use Indexes
The schema includes indexes on commonly queried fields:
- `students.number`
- `transactions.kind`, `transactions.source`
- `transactions.created_at` (for date queries)

## 🐛 Debugging

### Enable Supabase Logs

```typescript
// In src/lib/supabaseClient.ts
const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: {
    headers: { 'x-my-custom-header': 'debug' },
  },
  db: {
    schema: 'public',
  },
  // Log all queries
  // (remove in production!)
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### Check Browser Console
All errors are logged with descriptive messages:
```
Error fetching students: relation "students" does not exist
```

### Use Supabase Dashboard
- **Logs** tab: See all database queries
- **API** tab: Test queries manually
- **Table Editor**: Inspect data directly

## 📚 Resources

- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript)
- [SWR Documentation](https://swr.vercel.app)
- [PostgreSQL Array Functions](https://www.postgresql.org/docs/current/functions-array.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Ready to migrate?** Follow `SUPABASE_SETUP.md` for step-by-step instructions!
