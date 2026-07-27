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
2. ไปที่ **SQL Editor** → เปิด `supabase/all-migrations.sql` แล้ว copy ทั้งไฟล์ → **Run**
3. คัดลอก URL และ anon key จาก Settings → API

### 2. ตั้งค่า Environment

**Local (ดู UI / Demo)** — ไม่ต้องใส่ Supabase ใน `.env.local` (ว่างไว้ = ข้อมูลปลอมใน memory ไม่เชื่อมกับเว็บจริง)

**Production (Vercel)** — ใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน Vercel → Settings → Environment Variables เท่านั้น

```bash
cp .env.local.example .env.local   # local ว่าง = demo mode
```

### 3. ล้างข้อมูลบนเว็บ (เริ่มใหม่)

**ถ้า header ขึ้น "DEMO"** = Vercel ยังไม่มี Supabase env → แสดงข้อมูลปลอมจากโค้ด ไม่ใช่ DB  
→ ใส่ `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน **Vercel → Settings → Environment Variables (Production)** แล้ว **Redeploy**

**หลังต่อ Supabase แล้ว** ล้างข้อมูลจริง:
1. Supabase → **SQL Editor** → รัน `supabase/reset-data.sql`
2. **Authentication → Users** → ลบ user เก่า
3. สมัครใหม่บนเว็บ

### 4. รันแอป

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
