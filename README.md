# คิมบับต้นทุน (Kimbap Tracker)

เว็บแอพคำนวณต้นทุน จัดการสต็อก และติดตามกำไรร้านคิมบับ

## ฟีเจอร์

- **วัตถุดิบ** — เพิ่ม/จัดการวัตถุดิบ บันทึกการซื้อ คำนวณต้นทุนต่อหน่วย
- **เมนู/สูตร** — กำหนด BOM (วัตถุดิบต่อม้วน) คำนวณต้นทุนและกำไรอัตโนมัติ
- **สต็อก** — ซื้อเข้า ปรับยอด ดูประวัติ movement
- **ยอดขาย** — บันทึกขายเร็ว หักสต็อกอัตโนมัติตามสูตร
- **รายงาน** — กำไรรายวัน/สัปดาห์/เดือน เมนูขายดี

## เริ่มต้นใช้งาน

### 1. ตั้งค่า Supabase

1. สร้าง project ที่ [supabase.com](https://supabase.com)
2. ไปที่ SQL Editor แล้วรันไฟล์ `supabase/migrations/001_initial_schema.sql`
3. คัดลอก URL และ anon key จาก Settings → API

### 2. ตั้งค่า Environment

```bash
cp .env.local.example .env.local
```

แก้ไข `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. รันแอป

```bash
npm install
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) แล้วสมัครสมาชิก/เข้าสู่ระบบ

## วิธีใช้งาน

1. **เพิ่มวัตถุดิบ** — ข้าว, แครอท, สาหร่าย ฯลฯ
2. **บันทึกการซื้อ** — ข้าว 1 กก. 45 บาท → ระบบคำนวณต้นทุน/กรัม
3. **สร้างเมนู + สูตร** — คิมบับหมู ใช้ข้าว 80g, สาหร่าย 1 แผ่น ฯลฯ
4. **บันทึกยอดขาย** — ขาย 25 ม้วน → หักสต็อกอัตโนมัติ
5. **ดูแดชบอร์ด/รายงาน** — กำไรวันนี้ เท่าไหร่

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Auth + RLS)
