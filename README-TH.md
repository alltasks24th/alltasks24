# alltasks24.online — เวอร์ชันแก้บั๊ก
แก้ไข:
- Login ไม่ redirect → แก้ `assets/js/auth.js`
- ปุ่ม "ตั้งฉันเป็น Owner" ไม่ทำงาน → แก้ `assets/js/admin.js` (ตรวจ firstRun ถูกต้อง + try/catch)
- แชทสดย่อไม่ได้ → เพิ่ม toggle JS และ CSS class `.minimized`

## วิธีติดตั้งเร็ว
1) Firebase Console → Authentication → เปิด **Email/Password**
2) Firestore → สร้างฐานข้อมูล (Production) → Rules ใส่จากไฟล์ `firestore.rules` แล้ว **Publish**
3) อัปโหลดไฟล์ทั้งหมดขึ้นโฮสติ้ง (Firebase Hosting หรือเว็บเซิร์ฟเวอร์ของคุณ)
4) เข้า `login.html` → ล็อกอิน (อีเมล/รหัสที่สร้างใน Authentication)
5) เข้า `admin.html` → ถ้ายังไม่มี user เลย จะมีปุ่ม "ตั้งฉันเป็น Owner" ให้กดครั้งเดียว

อัปเดตล่าสุด: 2025-08-15 16:12 UTC
