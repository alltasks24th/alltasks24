# รับจ้างสารพัด 24 ชั่วโมง (alltasks24.online)

สแต็ก: HTML + CSS + JS + Bootstrap + Firebase (Auth, Firestore, Hosting)

## วิธีติดตั้ง
1) สร้าง Firebase Project
2) เปิด Firestore + Authentication (เปิด Anonymous และ Email/Password)
3) ตั้งค่า Rules: นำไฟล์ `firestore.rules` ไปวางที่ Firestore Rules แล้ว **Publish**
4) สร้างเอกสาร `settings/acl` และเพิ่มฟิลด์
   ```json
   {"admins": ["2gJTJh0R9TNAAPqtHOtNkerLOIm2"]}
   ```
5) ตั้งค่า `settings/public` (ครั้งแรกหลังเปิดเว็บ): siteName, heroText, phone, line, facebook, mapUrl, policyText

## วิธีดีพลอย (Firebase Hosting)
- ติดตั้ง Firebase CLI แล้ว `firebase init hosting`
- เลือกโปรเจกต์ → โฟลเดอร์ public เป็นราก (ที่มีไฟล์ index.html)
- `firebase deploy`

## หมายเหตุ
- ผู้ใช้ทั่วไปเข้าถึงทุกฟีเจอร์ฝั่งหน้าเว็บได้ **โดยไม่ต้องล็อกอิน**
- หลังบ้านเข้าถึงได้เฉพาะแอดมิน (ล็อกอินอีเมล/รหัสผ่าน + UID อยู่ใน `settings/acl.admins`)
- แชทสด: ไม่มีตอบกลับอัตโนมัติ เปิดกล่องเมื่อกดปุ่มเท่านั้น
- ใช้รูปผ่าน URL ลิงก์ หรือใส่ใน `assets/img/` ได้ตามเงื่อนไข
