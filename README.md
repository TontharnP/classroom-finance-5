# Classroom Finance 5

ระบบการเงินห้องเรียนสำหรับจัดการรายรับ รายจ่าย กำหนดการเก็บเงิน นักเรียน และการแจ้งเตือนผ่าน LINE

## ภาพรวม

โปรเจกต์นี้เป็นเว็บแอป Next.js สำหรับงานการเงินในห้องเรียน ใช้เก็บข้อมูลรายรับรายจ่าย ดูสถานะการชำระของนักเรียน และจัดการกำหนดการเก็บเงินแบบแยกโฟลเดอร์ พร้อมรองรับการแจ้งเตือนนักเรียนผ่าน LINE Messaging API

## ฟีเจอร์หลัก

### Dashboard
- สรุปยอดคงเหลือรวม
- แสดงรายรับ รายจ่าย และยอดจากกำหนดการ
- แยกยอดตามวิธีชำระ
- กราฟสรุปตามหมวดหมู่และตามเดือน
- สถานะการชำระของนักเรียนแบบภาพรวม

### Transactions
- เพิ่ม แก้ไข ลบ รายการเงิน
- รองรับรายรับ รายจ่าย และโอนย้าย
- กรองตามประเภท วิธีชำระ และคำค้นหา
- แยกรายการที่มาจากกำหนดการกับธุรกรรมปกติ
- ป้องกันการแก้ไขรายการจากกำหนดการเพื่อไม่ให้ข้อมูลคลาดเคลื่อน

### Schedule
- สร้างกำหนดการเก็บเงิน
- จัดกลุ่มกำหนดการด้วยโฟลเดอร์
- ปฏิทินแสดงกำหนดการและสถานะครบกำหนด
- ดูรายการใกล้ครบกำหนดและรายการเลยกำหนด
- เปิดรายละเอียดกำหนดการเพื่อดูนักเรียนที่ชำระแล้ว/ค้างชำระ
- ส่งแจ้งเตือนผ่าน LINE ได้รายคนหรือแบบกลุ่มของกำหนดการนั้น

### Students
- จัดการข้อมูลนักเรียน
- อัปโหลดรูปโปรไฟล์ด้วย Vercel Blob
- ดูรายละเอียดนักเรียนและสถานะกำหนดการ
- ชำระรายการค้างจากหน้ารายละเอียดนักเรียนแบบ Quick Pay
- บันทึก `LINE User ID` เพื่อใช้ส่งแจ้งเตือนอัตโนมัติ

### LINE Notification
- รับ webhook จาก LINE Messaging API
- ลงทะเบียน `LINE User ID` ของนักเรียนจากข้อความที่ส่งเข้าบอท
- ส่งแจ้งเตือนกำหนดการแบบ push ไปยังนักเรียนที่ยังค้างชำระ

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Recharts
- react-calendar
- react-hook-form
- Zod
- Zustand
- Supabase Postgres
- Vercel Blob
- LINE Messaging API

## โครงสร้างโปรเจกต์

```txt
src/
├── app/                  # App Router pages และ API routes
├── components/           # UI components และ modal ต่าง ๆ
├── lib/                  # helpers, calculations, supabase, store
├── types/                # types สำหรับ UI และฐานข้อมูล
└── image/                # ไอคอน/ภาพประกอบของระบบ
supabase/
└── migrations/           # SQL migrations สำหรับ schema
docs/                     # เอกสารอธิบายระบบและการใช้งาน
```

## การติดตั้งและรัน

### 1) ติดตั้ง dependency

```bash
npm install
```

### 2) ตั้งค่า environment

คัดลอกจากตัวอย่างแล้วแก้ค่าให้ตรงกับโปรเจกต์ของคุณ

```bash
cp .env.example .env.local
```

ตัวแปรที่ใช้:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
SUPABASE_SLIP_BUCKET=payment-slips
BLOB_READ_WRITE_TOKEN=...
```

### 3) รัน migration ของ Supabase

ให้รันไฟล์ SQL ใน `supabase/migrations` ตามลำดับใน Supabase SQL Editor หรือผ่าน Supabase CLI

Migration ที่สำคัญ:
- `001_initial_schema.sql`
- `005_add_schedule_folders.sql`
- `007_add_student_line_user_id.sql`

### 4) เปิดโปรเจกต์

```bash
npm run dev
```

เปิดที่:

```txt
http://localhost:3000
```

## คำสั่งที่ใช้บ่อย

```bash
npm run dev
npm run build
npm start
npm run lint
```

## การใช้งาน LINE

### webhook URL

เมื่อติดตั้งบน Vercel ให้ตั้ง webhook URL เป็น:

```txt
https://classroom-finance-5.vercel.app/api/line/webhook
```

### วิธีลงทะเบียน LINE User ID

นักเรียนส่งข้อความมาที่ LINE Official Account เช่น:

```txt
ลงทะเบียน 24
```

หรือ:

```txt
24
```

ระบบจะอ่าน `source.userId` จาก webhook แล้วบันทึกลงในข้อมูลนักเรียนอัตโนมัติ

### ส่งแจ้งเตือนกำหนดการ

จากหน้ารายละเอียดกำหนดการ กดปุ่มแจ้งเตือนเพื่อส่งข้อความไปยังนักเรียนที่ยังค้างชำระและมี `LINE User ID`

## หมายเหตุสำคัญ

- ต้องตั้งค่า Supabase schema ให้ตรงกับ migration ล่าสุดก่อนใช้งาน
- ต้องมี `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_CHANNEL_SECRET` ที่ถูกต้อง
- สลิปชำระเงินผ่าน LINE จะเก็บใน Supabase Storage bucket `SUPABASE_SLIP_BUCKET` หรือ `payment-slips` เมื่อไม่ระบุค่า
- นักเรียนต้องกดเพิ่ม LINE Official Account ก่อน จึงจะส่ง push message ได้
- ข้อมูลฝั่ง UI และฐานข้อมูลใช้คนละรูปแบบชื่อ field:
  - UI ใช้ camelCase
  - Supabase ใช้ snake_case

## เอกสารเพิ่มเติม

เอกสารที่มีอยู่ในโปรเจกต์อยู่ในโฟลเดอร์ `docs/` เช่น:
- คู่มือการใช้งาน
- คู่มือ Supabase
- สรุปการติดตั้งและการพัฒนา

## สถานะโปรเจกต์

โปรเจกต์นี้พร้อมใช้งานกับ:
- Dashboard
- Transactions
- Schedule
- Students
- Supabase
- Vercel Blob
- LINE notification

## License

ใช้ภายในงานห้องเรียน/โปรเจกต์ภายในองค์กร
