# Classroom Finance 5.0 - Development Guide

## ✅ Completed Features

### Core Infrastructure
- ✅ Next.js 16 + TypeScript + Tailwind CSS setup
- ✅ Responsive layout with sidebar (desktop) and top nav (mobile)
- ✅ Supabase client initialized (ready for real DB)
- ✅ Mock data generator (30 students, schedules, transactions)
- ✅ TypeScript types for all data models

### Pages Implemented

#### 1. Dashboard (`/dashboard`)
- ✅ Balance card (total income - expenses)
- ✅ Transaction income/expense cards
- ✅ Student collection breakdown (bank/cash/truemoney)
- ✅ Paid/Unpaid student counts (by schedule selector)
- ✅ Pie chart by category with month selector
- ✅ Animated cards with Framer Motion

#### 2. Transactions (`/transactions`)
- ✅ Multi-filter system (source, kind, method)
- ✅ Search functionality
- ✅ Add button (ready for modal)
- ✅ Statement table with proper formatting
- ✅ Shows payer name (เหรัญญิก vs student nickname)
- ✅ Color-coded income/expense

#### 3. Schedule (`/schedule`)
- ✅ Add schedule button
- ✅ Schedule cards carousel (max 5 visible, scroll left/right)
- ✅ Shows amount per item, collected/total, days countdown
- ✅ Calendar placeholder section

#### 4. Students (`/students`)
- ✅ Add student card with plus icon
- ✅ Student grid sorted by number
- ✅ Avatar placeholder with fallback icon
- ✅ Shows prefix, name, nickname, number

### Reusable Components
- ✅ Modal component with animations and accessibility
- ✅ Sidebar navigation
- ✅ Responsive mobile header

### Utilities
- ✅ `calculateBalance()` - computes all balance metrics
- ✅ `countStudentPaymentStatus()` - paid/unpaid counts
- ✅ `summarizeByCategory()` - for pie chart
- ✅ `filterTransactions()` - multi-criteria filtering
- ✅ `cn()` - classname utility

---

## 🚧 Next Steps (Priority Order)

### Phase 2: Interactive Modals & Forms

#### A. Transaction Modals
1. **Add Transaction Modal**
   - Pop-up selector: "กำหนดการ" or "ธุรกรรม"
   - If "กำหนดการ":
     - Schedule selector dropdown
     - Shows amount to collect
     - Student multi-select
     - Payment method selector
   - If "ธุรกรรม":
     - Name input
     - Income/Expense radio
     - Amount input
     - Payment method
     - Category input
     - Description textarea

2. **Edit Transaction Modal**
   - Pre-fill form with existing data
   - Save/Delete buttons

#### B. Schedule Modals
1. **Add Schedule Modal**
   - Name input
   - Start date picker
   - End date picker (optional)
   - Amount per item
   - Student selector (individual or "ทั้งหมด")
   - Details textarea

2. **Schedule Detail Modal**
   - Opened from card click or calendar
   - Shows full schedule info
   - Scrollable student list (max 5 visible, scroll to see more)
   - Shows who paid/unpaid with visual indicators
   - Edit/Delete buttons

3. **Calendar Component**
   - Use `react-calendar` or custom build
   - Mark dates with schedules
   - Click date to open schedule detail

#### C. Student Modals
1. **Add Student Modal**
   - Prefix selector
   - First name, last name, nickname inputs
   - Number input
   - Avatar upload (use Supabase Storage)

2. **Student Detail Modal**
   - Profile section (avatar, info)
   - Payment summary cards (paid amount, outstanding)
   - Tabs: "ชำระแล้ว" / "ค้างชำระ"
   - Table of schedules
   - Click outstanding item → opens transaction modal pre-filled
   - Click paid item → opens transaction edit modal

---

### Phase 3: Supabase Integration

#### Database Setup
```sql
-- Run the SQL from README.md in Supabase SQL Editor
-- Tables: students, schedules, transactions
```

#### API Hooks
Create `src/lib/hooks/` with:
- `useStudents()` - CRUD for students
- `useSchedules()` - CRUD for schedules
- `useTransactions()` - CRUD for transactions
- `usePaymentStatus()` - fetch paid/unpaid counts

Replace `mockData()` calls with real hooks.

#### Image Upload
- Use Supabase Storage for avatars
- Create bucket: `student-avatars`
- Update Student modal with file upload

---

### Phase 4: State Management

Options:
1. **Zustand** (lightweight, recommended)
2. **React Context** (built-in, simpler)
3. **Jotai** (atomic)

Create stores for:
- `useAppStore` - global filters, selected schedule/student
- `useModalStore` - open/close modal state
- `useTransactionStore` - optimistic updates

---

### Phase 5: Polish & Production

#### UI/UX Enhancements
- [ ] Loading skeletons for all pages
- [ ] Toast notifications for CRUD actions
- [ ] Confirmation dialogs for delete
- [ ] Form validation with `react-hook-form` + `zod`
- [ ] Empty states with illustrations
- [ ] Error boundaries

#### Responsive
- [ ] Test all modals on mobile
- [ ] Touch gestures for carousel
- [ ] Sticky headers in tables

#### Performance
- [ ] Lazy load modals
- [ ] Virtualized lists for large student/transaction sets
- [ ] Memoize expensive calculations
- [ ] Optimize images (Next.js Image component)

#### Accessibility
- [ ] Keyboard navigation in modals
- [ ] Screen reader labels
- [ ] Focus trap in modals
- [ ] ARIA attributes

#### Testing
- [ ] Unit tests for calculations (`calculations.test.ts`)
- [ ] Integration tests with React Testing Library
- [ ] E2E tests with Playwright

#### Deployment
- [ ] Deploy to Vercel
- [ ] Set up Supabase production project
- [ ] Configure environment variables
- [ ] Set up CI/CD

---

## 📝 Technical Notes

### Current Architecture
```
src/
├── app/              # Next.js routes (dashboard, transactions, etc.)
├── components/       # React components
│   ├── dashboard/
│   ├── transactions/
│   ├── schedule/
│   ├── students/
│   ├── layout/       # Sidebar
│   └── ui/           # Modal, Button, etc.
├── lib/              # Utilities
│   ├── calculations.ts
│   ├── mockData.ts
│   ├── supabaseClient.ts
│   └── utils.ts
└── types/            # TypeScript interfaces
```

### Key Design Decisions
1. **App Router** (Next.js 15+) for file-based routing
2. **Server Components** where possible, "use client" only when needed
3. **Tailwind v4 preview** via `@tailwindcss/postcss`
4. **Mock data first** approach for rapid prototyping
5. **Optimistic UI** pattern for better UX

### Database Schema Notes
- `transactions` table combines both normal transactions AND schedule payments
- Use `source` field to distinguish (`'transaction'` vs `'schedule'`)
- Schedule payments link via `schedule_id` and `student_id`
- Categories only apply to normal transactions

---

## 🎨 Design System

### Colors (Tailwind)
- Primary: blue-600
- Success: emerald-600
- Danger: rose-600
- Warning: orange-600
- Neutral: zinc-*

### Animations
- Entry: fade-in + slight scale
- Hover: shadow-lg, slight lift
- Transitions: 200-300ms

### Spacing
- Cards: gap-4 (1rem)
- Sections: gap-6 (1.5rem)
- Padding: p-4 (cards), p-6 (modals)

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
# Visit http://localhost:3000

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

---

## 📦 Package.json Scripts to Add

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

## 🎯 Success Metrics

- [ ] All CRUD operations work (Create, Read, Update, Delete)
- [ ] Real-time updates from Supabase
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Mobile responsive (test on iPhone/iPad simulators)
- [ ] Fast page loads (<2s)
- [ ] Accessible (keyboard nav, screen readers)

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Recharts](https://recharts.org/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

---

## 🐛 Known Issues / TODOs

- [ ] Calendar component not implemented (placeholder only)
- [ ] No form validation yet
- [ ] Mock data regenerates on every render (add caching)
- [ ] No real-time sync with Supabase
- [ ] No image upload functionality
- [ ] No error handling for failed API calls
- [ ] No loading states
- [ ] Modal backdrop doesn't prevent body scroll
- [ ] Table not virtualized (will be slow with 1000+ transactions)

---

## 💡 Future Enhancements

- Export to Excel/PDF
- Print receipts
- SMS/Email notifications
- Multi-language support (Thai/English toggle)
- Dark mode toggle (currently auto)
- Bulk operations (pay multiple students at once)
- Payment reminders
- Analytics dashboard (charts over time)
- Audit log
- Role-based access (treasurer, teacher, admin)
