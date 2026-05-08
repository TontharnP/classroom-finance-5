# Classroom Finance 5.0

แอปพลิเคชันจัดการการเงินห้องเรียน - ระบบบริหารจัดการรายรับรายจ่ายและการเก็บเงินนักเรียนตามกำหนดการ

## ✨ Features

### 📊 Dashboard
- สรุปยอดคงเหลือรวม (รายรับ - รายจ่าย)
- แยกรายรับจากธุรกรรมปกติและการเก็บนักเรียน
- แสดงยอดรายจ่ายทั้งหมด
- แยกการชำระตามวิธี (ธนาคาร/เงินสด/TrueMoney)
- สถานะการชำระของนักเรียนตามกำหนดการ (ชำระแล้ว/ค้างชำระ)
- แผนภูมิวงกลมตามหมวดหมู่ธุรกรรม (กรองตามเดือน)
- Empty states สำหรับกรณีไม่มีข้อมูล

### 💰 Transactions (รายการธุรกรรม)
- แสดงรายการรายรับ/รายจ่ายทั้งหมด
- สร้างธุรกรรมใหม่ (รายรับ/รายจ่าย, หมวดหมู่, วิธีชำระ)
- แก้ไขและลบธุรกรรม
- ค้นหาตามรายละเอียด
- กรองตามประเภท (รายรับ/รายจ่าย) และเดือน
- แสดงแหล่งที่มา: ธุรกรรมปกติ หรือ มาจากกำหนดการ
- **จุดเด่น**: ธุรกรรมที่มาจากกำหนดการแก้ไขไม่ได้ (ป้องกันข้อมูลไม่ตรงกัน)
- Empty states แยกระหว่าง "ไม่มีข้อมูล" กับ "ถูกกรองออก"

### 📅 Schedule (กำหนดการ)
- สร้างกำหนดการเก็บเงิน (ชื่อ, จำนวนเงิน, วันที่, นักเรียน)
- แสดงแบบการ์ด carousel พร้อมสถานะชำระ
- ปฏิทินแสดงกำหนดการ (react-calendar)
- แก้ไขและลบกำหนดการ
- **จุดเด่น**: สามารถเลือกนักเรียนที่ต้องชำระได้
- Empty state สำหรับกรณียังไม่มีกำหนดการ

### 👥 Students (นักเรียน)
- จัดการข้อมูลนักเรียน (เลขที่, คำนำหน้า, ชื่อ, นามสกุล, ชื่อเล่น)
- อัปโหลดรูปโปรไฟล์ (Vercel Blob)
- เรียงลำดับตามเลขที่หรือชื่อ
- ดูรายละเอียดนักเรียน
  - ประวัติการชำระ (กรองตาม ชำระแล้ว/ค้างชำระ)
  - **Quick Pay**: ชำระค่างวดจากรายการค้างชำระได้ทันที (ตรวจสอบซ้ำอัตโนมัติ)
- Empty state สำหรับกรณียังไม่มีนักเรียน

## 🛠 Tech Stack

### Frontend
- **Next.js 16** (App Router, React Server Components, Turbopack)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (dark mode support)
- **Framer Motion** (animations)
- **Recharts** (data visualization)
- **react-calendar** (calendar view)
- **react-hook-form + Zod** (form validation)

### State Management
- **Zustand** (in-memory state, currently active)
- **SWR** (data fetching)

### Backend
- **Supabase Postgres**
  - Server-side access through Supabase service-role client
  - Next.js API routes preserve the app's REST contract
- **Vercel Blob**
  - Student avatar and category icon storage

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── dashboard/           # หน้า Dashboard
│   ├── transactions/        # หน้า Transactions
│   ├── schedule/            # หน้า Schedule
│   └── students/            # หน้า Students
├── components/              # React components
│   ├── dashboard/          # Dashboard components
│   ├── transactions/       # Transaction components + QuickPayModal
│   ├── schedule/           # Schedule components + Calendar
│   ├── students/           # Student components + StudentDetailModal
│   ├── ui/                 # UI primitives (Modal, Button, Skeleton)
│   └── ErrorBoundary.tsx   # Error handling
├── lib/
│   ├── calculations.ts     # Business logic (balance, summaries)
│   ├── store.ts            # Zustand store (in-memory)
│   ├── supabase/           # Database helpers and server Supabase utilities
│   │   ├── students.ts     # Student CRUD (9 functions)
│   │   ├── schedules.ts    # Schedule CRUD (9 functions)
│   │   ├── transactions.ts # Transaction CRUD (11 functions)
│   │   └── adapter.ts      # snake_case ↔ camelCase converter
│   └── utils.ts            # Utilities (cn, date formatting)
├── hooks/
│   └── useSupabase.ts      # SWR hooks for database helpers (15+ hooks)
└── types/
    ├── index.ts            # UI types (camelCase)
    └── supabase.ts         # Database row types (snake_case)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase project
- Supabase service role key
- Vercel Blob store

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd classroom-finance-5
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

4. Run the SQL files in `supabase/migrations` in order from the Supabase SQL editor or CLI.

5. Run development server:
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## 🗄️ Data Model

### Supabase Tables

Records keep the existing snake_case API row shape:

```text
students
schedule_folders
schedules
categories
transactions
```

### Calculation Rules
```
Balance = รายรับธุรกรรมปกติ + รายรับจากกำหนดการ - รายจ่ายทั้งหมด
```

## 🎨 Features Highlights

### 1. Quick Pay Modal ✅
- Pre-filled payment form from student detail
- One-click payment for unpaid schedule items
- Automatic duplicate detection
- Toast notifications

### 2. Edit Policy for Schedule Transactions ✅
- Transactions created from schedules cannot be edited
- Visual indicator with tooltip explaining why
- Prevents data inconsistency

### 3. Empty States ✅
- Friendly messages when no data exists
- Distinguishes "no data" vs "filtered out"
- Actionable guidance (e.g., "Click 'Add' button to create")

### 4. Loading Skeletons ✅
- Professional loading states for all pages
- Skeleton components for cards, tables, charts
- Improved perceived performance

### 5. Error Boundaries ✅
- Graceful error handling without app crash
- User-friendly error messages in Thai
- Retry functionality

## 🔄 Supabase Integration Status

### ✅ Completed
- Supabase server utilities implemented
- Supabase-backed API routes implemented
- Client CRUD helpers implemented
- Vercel Blob upload/delete helpers implemented
- 15+ SWR hooks retained
- Adapter layer for field name conversion
- Type safety with TypeScript

## 📝 Development Notes

### Adding a New Feature
1. Create types in `/src/types/index.ts`
2. Add database row types in `/src/types/supabase.ts`
3. Create CRUD functions in `/src/lib/supabase/<resource>.ts`
4. Add SWR hooks in `/src/hooks/useSupabase.ts`
5. Create adapter functions in `/src/lib/supabase/adapter.ts`
6. Build UI components in `/src/components/<feature>/`
7. Add empty states and loading skeletons
8. Wrap with ErrorBoundary

### Code Style
- Use TypeScript strict mode
- Follow functional component pattern
- Use Tailwind for styling
- Dark mode support for all components
- Thai language for user-facing text
- Responsive design (mobile-first)

## 🐛 Known Issues

- Existing lint warnings remain in some UI components.

## 🎯 Future Enhancements

- [ ] Optimistic updates for better UX
- [ ] Export to Excel/PDF
- [ ] Multi-class support
- [ ] Receipt printing
- [ ] SMS notifications
- [ ] Monthly reports
- [ ] Authentication & authorization

## 📄 License

Internal classroom project.

## 🙏 Acknowledgments

Built with ❤️ for classroom financial management
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
