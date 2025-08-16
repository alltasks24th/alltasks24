
# alltasks24.online — Full Firebase-Ready (r6b)

ธีม: **Grape & Indigo** — สว่าง อ่านง่าย โมเดิร์น  
ฟีเจอร์: หน้าเว็บผู้ใช้ครบ + แชทสด (anonymous), รีวิวอนุมัติ, โปรโมชันตามช่วงเวลา, แบนเนอร์, FAQ, การจอง, คำขอใบเสนอราคา, พื้นที่บริการ+แผนที่, ปุ่มลอย โทร/LINE/Facebook  
หลังบ้าน (Admin): แดชบอร์ด, บริการ, พื้นที่, จองงาน, คำขอ, รีวิว (อนุมัติ/ลบ), โปรโมชัน, แบนเนอร์, FAQ, ตั้งค่า, แชทสด (ตอบได้), บทบาทผู้ใช้ (ผ่านคอลเลกชัน `roles`)

## ตั้งค่า Firebase (สรุป)
1) เปิด Authentication → Sign-in method: **Email/Password** และ **Anonymous**  
2) สร้างผู้ดูแล (Email/Password) แล้วเพิ่ม doc: `roles/{uid}` เป็น `{ "role": "owner" }`  
3) Firestore → Rules: อัปโหลด `firestore.rules` และ Publish

เปิดใช้งาน:
- ผู้ใช้: เปิด `index.html` (anonymous auto)  
- แอดมิน: `login.html` → `admin.html`

Deploy Hosting (ตัวอย่าง):
```bash
npm i -g firebase-tools
firebase login
firebase init hosting   # เลือกโปรเจกต์ alltasks24-f75ec, public = .
firebase deploy
```
