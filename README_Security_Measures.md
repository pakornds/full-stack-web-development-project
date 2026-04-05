# มาตรการรักษาความปลอดภัยของแอปพลิเคชัน & การชี้วัดตาม OWASP Top 10 (2025)

เอกสารฉบับนี้อธิบายถึงการนำโปรโตคอลรักษาความปลอดภัยมาปรับใช้กับระบบลาหยุด (Leave Management System) ตามหัวข้อและกรอบความปลอดภัยใหม่ล่าสุดของ **OWASP Top 10 ประจำปี 2025** เพื่อแสดงให้เห็นถึงกลยุทธ์การป้องกันแบบเชิงรุกและหลายระดับ (Defense-in-Depth)

## การตั้งรับและจัดหมวดหมู่ตาม OWASP Top 10 - 2025

### A01:2025 - Broken Access Control (การควบคุมการเข้าถึงที่หละหลวม)
* **Role-Based Access Control (RBAC):** ระบบมีนโยบายควบคุมการเข้าถึงตามบทบาทอย่างเข้มงวด (`admin`, `manager`, `employee`) โดบจำกัดสิทธิ์ในระดับ API Endpoint (เช่น การอนุมัติการลา, การอัปเดตบทบาทพนักงาน) ให้เฉพาะบัญชีที่มีระดับสิทธิที่เหมาะสมเท่านั้น
* **Component Visibility:** ในฝั่ง Frontend (UI) มีการซ่อนและแสดงผลองค์ประกอบตามบทบาทผู้ใช้และแผนกอย่างเคร่งครัด
* **Session Revocation:** เมื่อมีการรีเซ็ตรหัสผ่านหรือล็อกเอาต์ ระบบจะเพิกถอนเซสชันปัจจุบันที่ใช้งานอยู่ในฐานข้อมูลทันที (`currentSessionId = null`) ตัดสิทธิการเข้าถึงของช่องทางที่อาจค้างอยู่ออกทั้งหมด

### A02:2025 - Security Misconfiguration (การกำหนดค่าระบบหลวมหรือผิดพลาด)
* **Data Validation Pipelines:** ฝั่ง Backend สร้างระบบคัดกรองส่วนกลาง (NestJS global validation pipes) `whitelist: true` เพื่อขจัด Request Parameters หรือ Payload ที่ไม่ตรงตาม Schema (ผ่าน `class-validator`)
* **CORS Policies:** อัปเดตและรักษาความปลอดภัยเฉพาะ Environment โดเมนที่อนุญาตมาเอง (เช่น ระบุที่ `FRONTEND_URL`) และอนุญาตเฉพาะคุกกี้ระดับ `credentials: true` บล็อกการฝากข้อมูลจากข้ามแกนที่ไม่พึงประสงค์ได้อย่างเด็ดขาด

### A03:2025 - Software Supply Chain Failures (ความล้มเหลวในห่วงโซ่อุปทานซอฟต์แวร์)
* **Continuous Scanning & Monitoring:** มีการตรวจสอบ Code Smells, Dependency และจุดเปราะบางในไลบรารีอย่างต่อเนื่องผ่าน SonarQube (`SonarQube_Correction_Report.md`) เพื่อให้แน่ใจว่าเครื่องมือ Third-party ไม่มีช่องโหว่แฝง
* **Update Verification:** มีการอ้างอิงและใช้งานเวอร์ชันไลบรารีที่เสถียร รวมถึงมีการตรวจสอบ `npm audit` เพื่ออุดช่องโหว่ด้าน Dependency เบื้องต้นเป็นระยะ

### A04:2025 - Cryptographic Failures (ความล้มเหลวด้านการเข้ารหัสลับ)
* **Strong Password Hashing:** รหัสผ่านเข้ารหัสด้วยกระบวนการขั้นสูงอย่าง `argon2` ซึ่งให้การป้องกันการโจมตีแบบ Brute-force และ Rainbow Table ด้วยความหน่วงเวลาและพารามิเตอร์หน่วยความจำที่เหมาะสม
* **Data in Transit:** ออกแบบมารองรับการบังคับใช้ HTTPS/TLS นโยบายคุกกี้บนโปรดักชันจะเปิดโหมดรัดกุม 
* **Token & MFA Secrets Security:** กุญแจความลับของ TOTP ถูกสร้างและจัดเก็บเฉพาะบัญชี ส่วน Refresh Token จะทำกระบวนการเข้ารหัสแฮช (เช่น `hashRefreshToken()`) เพื่อไม่ให้หลุดเป็น Plaintext ออกไป

### A05:2025 - Injection (ช่องโหว่ประเภทการฉีดคำสั่ง)
* **ORM Usage:** มีการใช้งาน `Prisma ORM` อย่างสมบูรณ์แบบ รูปแบบการคิวรีฐานข้อมูลจะเป็น Parameterized Queries เชิงโครงสร้างโดยปริยาย เป็นการอุดช่องโหว่ SQL Injection แบบสมบูรณ์
* **Cross-Site Scripting (XSS) Prevention:** การรับส่งข้อมูลฝั่ง Frontend เช่น ช่องกรอก "เหตุผลในการลาหยุด" จะถูกคัดกรองผ่านไลบรารี `sanitize-html` เพื่อทำความสะอาดและลบแท็กโค้ดคุกคาม HTML/JS ก่อนเรนเดอร์ลงใน UI

### A06:2025 - Insecure Design (การออกแบบที่ไม่ปลอดภัยจากจุดเริ่มต้น)
* **Account Lockout Policy:** ระบบมีการเขียนตรรกะเพื่อจัดการ Credential Stuffing / Brute-force เชิงลึก บัญชีจะถูกล็อกเป็นเวลา **15 นาที หากกรอกรหัสผ่านผิด 5 ครั้ง** (`failedLoginAttempts`)
* **Secure Defaults (Principle of Least Privilege):** พนักงานที่เริ่มใช้งานใหม่และลงทะเบียน จะถูกจำกัดสิทธิ์ในบทบาทพื้นฐานอย่าง "employee" เสมอ
* **Anti-Enumeration Flow:** การคืนค่ารีเซ็ตรหัสผ่าน (Forgot Password) จะตอบกลบแบบเป็นมิตรและเป็นกลาง เพื่อไม่ให้ผู้โจมตีสามารถเดาสุ่ม (Enumerate) อีเมล์ในระบบได้

### A07:2025 - Authentication Failures (ความล้มเหลวในการระบุและยืนยันตัวตน)
* **Two-Factor Authentication (2FA):** รองรับระบบสแกนตรวจสอบสิทธิ์ 2 ขั้นตอน (TOTP/Time-based) โดยใช้มาตรฐานไลบรารี `otplib`
* **JWT Handling & Strict Verification:** มีการออก Access Token แยกร่วมกับ Refresh Token (Rotation) และในระหว่างทำ 2FA จะไม่มีการแจก Token จริงจนกว่าจะยืนยันเลขชุดผ่าน (ออกเพียง Temp token)

### A08:2025 - Software or Data Integrity Failures (ซอฟต์แวร์และการคงสภาพข้อมูลบกพร่อง)
* **Token Integrity:** JSON Web Token ทั้งหมดที่ใช้ถูกรับรองการตรวจสอบความถูกต้องด้วยกุญแจสมมาตรของ Backend หากผู้ไม่หวังดีลงนามเปลี่ยนแปลง Token ปลอมแปลง สิทธิ์นั้นจะถูกริบคืนทันทีเพราะ Middleware อ่านค่าขยะได้
* **OAuth Integrity Check:** มีการทำลายการแทรกแซงและตรวจสอบข้อมูลจากฝั่ง Google OAuth20 ด้วยมาตรฐานที่แม่นยำ ฝั่งเซิร์ฟเวอร์จะตรวจสอบ Data Provider เทียบกับอีเมล์ที่มีในระะบบตลอดดเวลา

### A09:2025 - Security Logging and Alerting Failures (ความล้มเหลวด้านการบันทึกข้อมูลและตรวจสอบการแจ้งเตือน)
* **Comprehensive Audit Trails:** บริการ `AuditService` พิเศษถูกสร้างมารองรับการจับเวลา, อีเมล, ผลลัพธ์ Action และเป้าหมาย Resource จากกิจกรรมในระบบและจะถูกบรรทึกลงในไฟล์ประวัติเชิงลึกที่ตรวจสอบแกะรอยย้อนหลังได้ (`logs/audit.log`)
* **Tracking Activity Logs:** โมเดลตาราง `EventLog` ดักจับ Method, Route, IP Addresses, និងระยะเวลาตอบสนองในแต่ละ Endpoint เพื่อเอาไว้ทำรายงานแจ้งเตือนกรณีถูก Request โจมตีหนักเกินไป 

### A10:2025 - Mishandling of Exceptional Conditions (การจัดการความผิดพลาดและการโยนเงื่อนไขที่ไม่เหมาะสม)
* **Global Exception Filters:** ระบบ NestJS ใช้งานตัวจัดการ Error ระดับ Global ทำให้ข้อผิดพลาด (Exception Errors/Stack traces) ภายในเซิร์ฟเวอร์ ไม่ถูกส่งหรือรั่วไหลกลับไปให้ Client/User เห็นโดยตรง (จะจำกัดให้อยู่ในโครงสร้าง HTTP Status ปกติ เช่น 400 Bad Request, 500 Internal Server Error แบบไร้การแสดงผลโครงสร้างเชิงลึก) ทำให้ผู้ไม่หวังดีไม่สามารถแกะโครงสร้างภายในจากการส่งข้อมูลผิดพลาดไปกวนระบบได้
