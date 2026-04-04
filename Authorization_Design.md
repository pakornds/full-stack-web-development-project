# Authorization Design

## Overview

โปรเจกต์นี้ใช้กลยุทธ์การยืนยันตัวตนแบบ cookie-based JWT ร่วมกับ Role-Based Access Control (RBAC) เพื่อให้มั่นใจถึงความปลอดภัยในการเข้าถึงระบบจัดการการลา (Leave management system)

### Core Mechanisms

1. **JWT & Refresh Tokens via Cookies**
   - **Access Token:** JSON Web Token (JWT) อายุสั้นที่ถูกส่งอย่างปลอดภัยผ่าน `HttpOnly` cookies (เซ็นด้วย `JWT_SECRET`)
   - **Refresh Token:** โทเคนอายุยาวที่จะถูกจัดเก็บในฐานข้อมูลเป็นค่าที่ทำการแฮช (hashed value) และถูกส่งอย่างปลอดภัยบนเบราว์เซอร์ผ่าน `HttpOnly` cookie (เซ็นด้วย `REFRESH_TOKEN_HASH_SECRET` แยกกันตามหลัก Key Separation)
   - **Security Benefits:** การใช้ `HttpOnly` ช่วยป้องกันการโจมตีแบบ cross-site scripting (XSS) ไม่ให้เข้าถึงโทเคนได้ นอกจากนี้การตั้งค่า cookies เป็น `Secure` ใน production จะช่วยให้แน่ใจได้ว่าการรับส่งข้อมูลจะเกิดขึ้นผ่าน HTTPS เท่านั้น

2. **Role-Based Access Control (RBAC)**
   - จัดการผ่าน metadata โดยใช้ `RolesGuard` ควบคู่กับ `@Roles` decorator
   - **Hierarchy & Types:** ผู้ใช้งานจะถูกแบ่งออกเป็นบทบาท (roles) เช่น `employee`, `manager`, และ `admin`
   - ตัว `@Roles(..)` decorator บน endpoint จะทำหน้าที่กำหนด role ที่ต้องการ ส่วน `RolesGuard` จะทำการตรวจสอบข้อมูลใน JWT payload เทียบกับ role ที่อนุญาตให้ใช้งาน

3. **Two-Factor Authentication (2FA)**
   - เพิ่มชั้นความปลอดภัยอีกระดับโดยให้ผู้ใช้สามารถผูก TOTP (Time-based One-Time Password)
   - หากเปิดใช้งาน 2FA การ `login` แบบปกติจะทำเพียงคืนค่าสถานะชั่วคราว (temporary state) ซึ่งจะต้องผ่านขั้นตอน `/2fa/verify` เสียก่อน ระบบจึงจะทำการกำหนด auth cookies เพื่อให้สิทธิ์การใช้งานจริง

4. **Rate Limiting & Account Lockout**
   - กระบวนการ Login มีการตรวจจับ `failedLoginAttempts` หากมีการเข้าสู่ระบบล้มเหลวเกินจำนวนครั้งที่กำหนด (max threshold) ระบบจะทำการล็อกบัญชีนั้นชั่วคราว (Account Lockout)

5. **Event Logging & Audit Trails**
   - บันทึกพฤติกรรมการเรียกใช้งาน API และการเคลื่อนไหวในระบบ (เช่น Request method, IP, Duration) ผ่านโมเดล `EventLog` เพื่อผลด้านความปลอดภัยและ Audit ระบบในระยะยาว

6. **Password Recovery (Forgot Password & Reset Password)**
   - รองรับกระบวนการกู้คืนรหัสผ่าน โดยสร้าง token อายุสั้น (short-lived reset token) และส่งผ่านบริการอีเมล (SMTP/Nodemailer) ไปยังผู้ใช้ เพื่อนำมาใช้ยืนยันและกำหนดรหัสผ่านใหม่ได้อย่างปลอดภัยใน endpoint `/auth/reset-password`

## Endpoint Protections

- **Public Endpoints:** `/auth/login`, `/auth/register`, `/auth/google`, `/auth/forgot-password`, `/auth/reset-password` - เป็น endpoints มาตรฐานที่สามารถเข้าถึงได้ทั่วไปแบบอิสระ
- **Protected Endpoints:** route ทุกการเข้าใช้งานภายใต้ `/dashboard` และ `/leaves`
  - ถูกรับรองความปลอดภัยและปกป้องอย่างครบทั่วทั้งระบบ (global) ด้วย `AuthGuard('jwt')`
  - มีการคัดกรอง roles ให้แคบลงตามลักษณะเฉพาะของแต่ละ endpoint (เช่น การดึงข้อมูล leave logs ของทั้งองค์กร จะจำกัดสิทธิ์ให้เพียงเฉพาะ `admin` หรือ `manager` เท่านั้น)

## OAuth Integration

- **Google Strategy:** อาศัยไลบรารี Passport ในการดึงข้อมูล Google profiles โดยระบบจะพยายามค้นหาบัญชีดังกล่าวหรือสร้างบัญชีผู้ใช้ใหม่ในฐานข้อมูลโดยอัตโนมัติ ซึ่งสามารถทำงานควบคู่เข้ากันกับ cookie-based JWT flow ได้อย่างไร้รอยต่อ
