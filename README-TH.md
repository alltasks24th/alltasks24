# alltasks24.online — โครงเว็บแอป (HTML+CSS+JS+Firebase)

> พร้อมใช้งาน 100% ฝั่งหน้าเว็บ + หลังบ้าน (CRUD) ในภาษาไทย โทนสีสว่าง ใช้รูปจากลิงก์/โฟลเดอร์เท่านั้น  
> เวอร์ชันสร้างไฟล์: 2025-08-15 15:04 UTC

## โครงสร้างโปรเจกต์
```
.
├─ index.html                 # หน้าเว็บผู้ใช้
├─ login.html                 # หน้าเข้าสู่ระบบหลังบ้าน (อีเมล/รหัสผ่าน)
├─ admin.html                 # หลังบ้านครบชุด
├─ assets/
│  ├─ css/styles.css
│  └─ js/
│     ├─ firebase-init.js
│     ├─ public.js
│     ├─ admin.js
│     ├─ auth.js
│     └─ utils.js
└─ firestore.rules            # กติกาความปลอดภัย Firestore (นำไปวางใน Firebase Console)
```

## วิธีติดตั้ง & ตั้งค่า
1) **สร้าง/เลือก Firebase Project** แล้วคัดลอก *Web App Config* (ในไฟล์ `assets/js/firebase-init.js` ใส่ให้แล้วตามที่ส่งมา)  
2) เปิดใช้บริการใน Firebase Console:
   - **Authentication**: เปิด Sign-in method → Email/Password และ **Anonymous** (สำหรับแชท/ผู้ใช้ทั่วไป)
   - **Firestore**: สร้างฐานข้อมูลโหมด Production
   - (ถ้าใช้ Analytics) เปิด Analytics ตามต้องการ
3) ไปที่เมนู **Build → Firestore Database → Rules** แล้ววางเนื้อหาใน `firestore.rules` เพื่อกำหนดสิทธิ์เบื้องต้น (ปรับตามนโยบายจริงก่อนขึ้นโปรดักชัน)
4) สร้างผู้ใช้แอดมินในเมนู **Authentication** (อีเมล/รหัสผ่าน) จากนั้นไปหน้า `admin.html` → แท็บ **ผู้ใช้** เพิ่มบทบาทให้เป็น `admin` หรือ `owner`  
   - หากเป็นการเริ่มต้นครั้งแรก กดปุ่ม **ตั้งฉันเป็น Owner** ในแถบแจ้งเตือนสีเหลือง (จะแสดงเมื่อยังไม่มีเอกสาร `users/*` เลย)
   - UID เจ้าของที่ให้มา `2gJTJh0R9TNAAPqtHOtNkerLOIm2` จะถูกตั้งเป็น owner โดยอัตโนมัติเมื่อเข้าใช้งานครั้งแรก
5) เติมข้อมูลขั้นต่ำ (หลังบ้าน):
   - แท็บ **บริการ**, **พื้นที่**, **แบนเนอร์**, **โปรโมชัน** (กำหนดช่วงวันที่เริ่ม-สิ้นสุด), **FAQ**, และ **ตั้งค่า** (เบอร์โทร/LINE/Facebook/แผนที่)
6) ทดสอบหน้าเว็บ `index.html` เปิดดูว่า:
   - แบนเนอร์สไลด์, การ์ดโปรโมชัน, บริการ, พื้นที่, แผนที่, จองงาน, รีวิว, FAQ, ปุ่มลอย, แชทสด ทำงานครบ
   - ส่งแบบฟอร์ม (จอง/ใบเสนอราคา/รีวิว) → ไปดูที่หลังบ้านแท็บที่เกี่ยวข้อง
7) **Deploy**
   - วิธี A: GitHub Pages (Static) — ใส่ทั้งโฟลเดอร์เข้า repo สาขา `main` แล้วเปิด Pages  
   - วิธี B: **Firebase Hosting** (แนะนำ)
     ```bash
     npm i -g firebase-tools
     firebase login
     firebase init hosting   # public directory = ., single-page app = N
     firebase deploy
     ```
   - ที่ Firebase Hosting → **Connect custom domain** ใส่ `alltasks24.online` แล้วทำตามขั้นตอนยืนยันโดเมน (เพิ่ม DNS records) จนสถานะเป็นสีเขียว

## คำแนะนำด้านความปลอดภัย
- กำหนด **Rules** ให้เหมาะสมก่อนใช้งานจริง โดยเฉพาะ collection ที่สาธารณะเขียนได้ (`bookings`, `tickets`, `reviews`, `chatThreads/*/messages`)
- ใช้บทบาท `owner` สำหรับเจ้าของเพียง 1-2 คนเท่านั้น, ที่เหลือให้ `admin` หรือ `viewer`
- ถ้าต้องการอัปโหลดไฟล์รูปเข้าที่โฟลเดอร์ (แทนลิงก์) แนะนำ Push รูปไว้ใน repo GitHub แล้วใช้ URL นั้น

## โครงสร้าง Collection ที่ใช้
- `services` { name, category, description, imageUrl, createdAt }
- `serviceAreas` { name, province, note, createdAt }
- `banners` { title, subtitle, imageUrl, createdAt }
- `promotions` { title, description, imageUrl, start(Date), end(Date), createdAt }
- `faqs` { q, a, createdAt }
- `settings/public` { siteName, heroText, phone, line, facebook, mapUrl, mediaPolicy }
- `bookings` { name, phone, service, area, date, time, details, status, createdAt }
- `tickets` { type('quote'|'issue'), name, contact, details, status, createdAt }
- `reviews` { name, rating(1-5), text, imageUrl, approved(bool), createdAt }
- `users/{uid}` { uid, email, role('viewer'|'admin'|'owner'), createdAt }
- `chatThreads/{threadId}/messages` { sender('user'|'agent'|'bot'), text, createdAt }

## หมายเหตุ
- แผนที่ใช้ **Google Maps Embed URL** (ไม่ต้องใช้ API Key) — ตั้งค่าได้ในหลังบ้าน → ตั้งค่า
- รูปภาพทุกส่วนรองรับ **ลิงก์/รูปในโฟลเดอร์** ตามนโยบายที่ระบุ
- Live Chat ในเวอร์ชันนี้มีผู้ช่วยตอบอัตโนมัติแบบง่าย และให้แอดมินตอบกลับจากหลังบ้านได้
