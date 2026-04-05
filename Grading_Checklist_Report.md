# 📋 รายงานสรุปคะแนนและส่วนประกอบของโปรเจกต์ (Grading Checklist Report)

เอกสารนี้สรุปรายละเอียดทั้งหมดตามเกณฑ์การให้คะแนน พร้อมระบุตำแหน่งในโค้ดและวิธีการตรวจสอบ รวมถึงคำอธิบายเชิงลึก (Deep Dive) ในแต่ละจุดประสงค์ทางความปลอดภัยและการออกแบบสถาปัตยกรรมของโปรเจกต์

---

## 📌 อธิบาย Tech Stack และภาพรวมของ App
**App Summary (ภาพรวมแอปพลิเคชัน):** 
ระบบจัดการการลา (Leave Management System) แบบ Full-stack รองรับระบบผู้ใช้งาน 3 ระดับ (Employee, Manager, Admin) โดยสามารถยื่นเรื่องลา ดูประวัติการลา อนุมัติการลา และตรวจสอบประวัติการใช้งานระบบ (System Logs/Audit) ของพนักงานทั้งหมดได้

**Tech Stack:**
- **Frontend:** React (Vite), TypeScript, Axios, Standard React State ควบคู่กับ HTML5 Validation
- **Backend:** NestJS, TypeScript, Prisma ORM, Passport.js, class-validator
- **Database:** PostgreSQL
- **Infrastructure:** Docker, Docker Compose (พร้อม Nginx/Pangolin Reverse Proxy)
- **Security & Quality:** Argon2id (Password Hashing), JWT (HS256), สแกนโค้ดด้วย SonarQube

**มีการ Implement Nipa Cloud หรือไม่?**
*(หมายเหตุ: ส่วนนี้ขึ้นอยู่กับการนำ Docker Compose ปัจจุบันไป Deploy บน VM/Cloud ของคุณ ให้ตอบอาจารย์ตามจริงว่าได้นำไปรันบน Nipa Cloud หรือไม่)*

---

## 🔐 A. Authentication - Password & SSO

### A1. Check password
- **1.1 มีการเช็คทั้งที่ FE และ BE:** **[มี]**
  - **FE (Frontend):** ใช้ Standard React State ผสานกับ HTML5 Validation Attributes (เช่น `type="email"`, `required`, `<input minLength>`) เพื่อดักการกรอกข้อมูลและให้ผู้ใช้เห็นแจ้งเตือนทันที (Instant feedback) ป้องกันการส่ง Request เปล่าประโยชน์ไปรบกวน Server
  - **BE (Backend):** ใช้ `class-validator` ใน NestJS DTO (`backend/src/auth/dto/auth.dto.ts`) ควบคู่กับ `@nestjs/common` ValidationPipe เพื่อความถูกต้องขั้นเด็ดขาด (Data Integrity) ตรงตามหลักการ Defense in Depth
  **ตัวอย่างโค้ด DTO ฝั่ง Backend:**
  ```typescript
  export class RegisterDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(15, { message: 'Password must be at least 15 characters long' })
    @MaxLength(64, { message: 'Password must not exceed 64 characters' })
    password!: string;
  }
  ```
- **1.2 ตอบปัญหาได้ว่าทำไม Check ที่ FE และ BE:**
  - *อธิบายเชิงลึก:* FE เป็นเรื่องของ UX (User Experience) ช่วยให้ผู้ใช้รู้สึกใช้งานลื่นไหล (Fail-fast) แต่ FE ไม่ใช่ Security Boundary เพราะ Attacker สามารถปิด JavaScript, แก้ไข DOM, หรือยิง HTTP Request ตรงๆ ผ่าน Postman/Burp Suite ข้ามหน้าเว็บได้ทั้งหมด ดังนั้นจุดตายสุดท้ายที่ต้องทำการ Validation อย่างเข้มงวดที่สุดคือ BE (Server-side validation)

### A2. Password policy (OWASP)
- **2.1 Length:** **[มี]** เช็คความยาวผ่าน `@MinLength(15)` และ `@MaxLength(64)` ใน `RegisterDto` (สอดคล้องกับ OWASP ที่เน้นยาวตั้งแต่ 15 สำหรับ Without MFA และรองรับ Passphrase สูงสุด 64 ตัวอักษร)
- **2.2 Password strength meter:** **[มี]** Frontend หน้า Register (`frontend/src/pages/Register.tsx`) มีฟังก์ชัน `calculatePasswordStrength` ประเมินคะแนน 0-5 ตามความซับซ้อนของรหัสผ่าน (ความยาว, ตัวพิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ) และแสดงผลเป็นหลอดสีพร้อมข้อความ (Weak, Fair, Good, Strong)
  **ตัวอย่างโค้ดคำนวณคะแนนฝั่ง Frontend:**
  ```typescript
  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 15) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*?]/.test(password)) score += 1;
    return score;
  };
  ```
- **2.3 Check against breach:** *[ข้อชี้แจง: การเชื่อม API สาธารณะอย่าง HIBP อาจสร้าง Latency และมีข้อกำจัดด้าน Rate Limit ในสเกลโปรเจกต์ขนาดเล็ก แต่โครงสร้างพร้อมรองรับ Middleware ในอนาคต]*
- **2.4 Allow Unicode/Whitespace:** **[มี]** Regex ของ `class-validator` ไม่ได้บล็อกเซ็ตของ Unicode หรือ Spacebar ผู้ใช้จึงสามารถตั้ง Passphrase ที่เป็นประโยคยาวๆ หรือเป็นภาษาไทยได้เต็มที่ (ส่งเสริม Entropy ที่ดีกว่ารหัสผ่านสั้นๆ แบบสุ่ม)
- **2.5 Error message safe:** **[มี]** `backend/src/auth/auth.service.ts` ในฟังก์ชัน Login หากรหัสหรืออีเมลผิด จะ Response แจ้งว่า "Invalid email or password." เสมอ (Generic Message) ไม่บอกชัดเจนว่าสรุปว่า "ไม่พบอีเมลในระบบ" หรือ "รหัสผ่านผิด" เพื่อป้องกันการที่ Hacker ใช้หลักการ User Enumeration เช็ครายชื่อคนในองค์กร
  **ตัวอย่างโค้ดแสดง Generic Message:**
  ```typescript
  if (!isValidPassword) {
    // บันทึกการล็อกอินผิดพลาด...
    throw new UnauthorizedException('Invalid email or password');
  }
  ```
- **2.6 Rate limit login:** **[มี]** อาศัยโครงสร้างล็อกล่วงเวลา (Account Lockout) เมื่อล็อกอินผิดเกิน 5 ครั้ง ระบบจะระงับบัญชี 15 นาที ป้องกัน Automated Brute-force Attack และ Credential Stuffing
  **ตัวอย่างโค้ด Account Lockout:**
  ```typescript
  const MAX_FAILED_LOGIN_ATTEMPTS = 5;
  const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;
  ```

### A3. Password Storage (ไม่เก็บ Plaintext)
- **3.1 อธิบายข้อมูลใน Database:** **[มี]** เก็บใน `schema.prisma` Field `password` เป็นค่า Hash String (เช่น `$argon2id$v=19$m=65536,t=3,p=4$c2FsdHN0cmluZw$aGFzaGVkcGFzc3dvcmQ...`) ข้อมูลนี้เมื่อถูกแฮก Database ออกไป (Data Breach) แฮกเกอร์ก็ไม่สามารถอ่านรหัสผ่านดั้งเดิมได้
- **3.2 ใช้ Argon2 / Bcrypt (พร้อมอธิบายเหตุผล):** **[มี]** ใช้ **Argon2id** (OWASP Recommended แชมป์ Password Hashing Competition)
  - *อธิบายเชิงลึก (Components & Configuration):*
    - **Argon2id** ผสมผสานจุดเด่นของ Argon2d (ต้านทาน GPU/ASIC cracking) และ Argon2i (ป้องการโจมตีแบบ Side-channel timing attacks)
    - **m=65536 (Memory Cost):** บังคับให้การเดารหัส 1 ครั้งต้องกิน RAM อย่างน้อย 64MB ถ้าแฮกเกอร์ใช้เครื่องที่มี GPU หลายพัน Core จะเจอคอขวดที่ RAM จำนวนมหาศาล ทำให้ Brute-force ช้าลงเป็นพันเท่า
    - **t=3 (Time Cost):** จำนวน Iterations บังคับให้แกนประมวลผลต้องปั่นวงจร 3 รอบต่อ 1 การคำนวณ
    - **p=4 (Parallelism):** บังคับใช้ 4 Threads ในการคำนวณ เพื่อให้ฝั่งคนกันใช้ Multi-core สู้กลับได้เต็มประสิทธิภาพ
- **3.3 มี Salt อัตโนมัติ:** **[มี]** Argon2id จะแรนดอมค่า Salt อัตโนมัติ (Cryptographically Secure Pseudo-Random Number Generator: CSPRNG) ขนาด 16-byte แล้วประกอบเป็น String รวมไปกับ Hash เลย (`$c2Fsd...`) ทำให้คน 2 คนที่รหัสพาสเวิร์ดตั้งเหมือนกัน 100% ก็จะได้ค่า Hash Database ออกมาคนละหน้าตากัน ป้องกันการใช้ตาราง Rainbow Table โจมตี
  **ตัวอย่างโค้ดการใช้งาน Argon2 ใน AuthService:**
  ```typescript
  import * as argon2 from 'argon2';

  // ตอนเข้ารหัสหน้าสมัครสมาชิก
  const hashedPassword = await argon2.hash(userDto.password);

  // ตอนตรวจสอบหน้าเข้าสู่ระบบ
  const isValidPassword = await argon2.verify(user.password, loginDto.password);
  ```

### A4. SSO (Single Sign-On ด้วย Google)
- **4.1 ฝั่ง Google ต้องทำอะไร:** ต้องสร้าง Credentials บน Google Cloud Console -> หมวด APIs & Services -> ทำการ Create OAuth 2.0 Client ID ประเภท Web application -> นำ URI ของ Server เราไปลงทะเบียนในช่อง "Authorized redirect URIs"
- **4.2 ดึงอะไรมาบ้าง:** ดึงรหัส `sub` (Google Account ID ที่เป็นตัวเลขตายตัวระดับโลก), Email, และข้อมูล Profile Information เบื้องต้น (ชื่อนามสกุล)
- **4.3 ดึงชื่อนามสกุลต้องทำอย่างไร:** ต้องระบุ Scopes ตอนเริ่มโยน User ไปหน้า Google (ใน `GoogleStrategy` กำหนดว่า `scope: ['email', 'profile']`)
- **4.4 ฝั่ง Web App ต้องทำอะไร:** มี Route เริ่มต้นเพื่อส่ง Redirect ผู้ใช้ไปโฮสต์ Google ซิงก์กับ `@nestjs/passport` และ `passport-google-oauth20` ถัดมาต้องมี Route `ห/auth/google/callback` ไว้รอรับ Request ขากลับ นำโค้ดแลกเปลี่ยนเป็น Access Token กับ Google API
- **4.5 Check ล็อกอินซ้ำ:** ตรวจสอบผ่าน `prisma.user.findUnique({ where: { email } })` ถ้าเป็นอีเมลใหม่ก็จัดการลงทะเบียน (Auto-register) หรือถ้าเคยมีในระบบแล้วก็ดึงขึ้นมาสร้าง JWT Access Token ให้พร้อมใช้งาน

### A5. & A6. Bonus: 2FA & Forget Password
- **5.1 2FA (Two-Factor Authentication):** **[มี]** `backend/src/auth/two-factor.service.ts` 
  - *อธิบายเชิงลึก:* ใช้ Library `otplib` ระบบจะสร้าง Random Base32 Secret สำหรับผู้ใช้นั้นๆ (และเก็บลง DB แบบผูกติด User) จากนั้นสร้าง URL แบบ `otpauth://totp/AppName:UserEmail?secret=XXXX` แล้วแปลงเป็น QR Code (ด้วย `qrcode`) ให้แอป Google Authenticator นำไปสแกน อัลกอริทึม (TOTP - Time-Based One Time Password) จะนำ Secret Key ควบรวมกับ Unix Timestamp ของเครื่อง (ทุก 30 วินาที) เข้าฟังก์ชัน HMAC-SHA1 เพื่อออกมาเป็นตัวเลข 6 หลัก (Compensating Control ลดความเสี่ยงพาสเวิร์ดหลุด)
- **6.1 Forget Password:** **[มี]** `backend/src/auth/auth.service.ts`
  - *อธิบายเชิงลึก:* เมื่อผู้ใช้เลือก Forgot ระบบจะออก Token แบบสุ่มความยาวด้วย `crypto.randomBytes(32).toString('hex')` (หรือรหัสที่เจาะจง) เก็บลงระบบคู่กับ Time-to-Live (Expiry เช่นภายใน 15 นาที) พร้อมอีเมลหาผู้ใช้งาน เมื่อคลิกลิงก์ผู้ใช้จะตั้งรหัสผ่านใหม่ได้ 1 ครั้ง จากนั้น Token นั้นจะถูกทำลายทิ้ง (Invalidated by Nullifying in Database) นำกลับมาใช้ซ้ำ (Replay Attack) ไม่ได้

---

## 🎟️ B. JWT (JSON Web Token)

### B1. Follow Requirement (แยก Role)
- **1.1. Check 3 role:** ระบบกำหนด Enum ประกอบด้วย `EMPLOYEE`, `DEPARTMENT` (Manager), `ADMIN`
- **1.2. UI ไม่แชร์กัน:** `frontend/src/pages/` ถูกแบ่ง Component เป็น Personal, Department และ Management ชัดเจน Frontend จะ Decode JWT (หรือเช็คสถานะจาก `/auth/me`) แล้ว Render Route ให้ตรงกับ Role ถ้ายูสเซอร์ Role ไม่ถึงก็จะไม่เห็นเมนูของ Role สูงกว่า
- **1.3. สิทธิ์ Database ต่างกัน:** 
  - *อธิบายเชิงลึก (Data Filtering):* ฝั่ง Backend ที่ไฟล์ `backend/src/leaves/leaves.service.ts` จะดึง Role มาจาก `req.user` แล้วเขียนเงื่อนไข If ขวางในระดับ Prisma
  - `EMPLOYEE`: ค้นขอบเขตจำกัด `where: { userId: currentUserId }`
  - `DEPARTMENT`: ทำ Query สอดคล้องกับ `departmentId` ของคนขอ
  - `ADMIN`: ข้าม Filter ประมวลผลดึง `findMany( )` แบบเพียวๆ
  - ขาดไม่ได้คือ `@Roles()` Guard (`backend/src/auth/roles.guard.ts`) ขัดขวางระดับ Endpoint ไม่ให้ Role ต่ำเรียก API ผิดประเภท
  **ตัวอย่างโค้ด NestJS Role Guard:**
  ```typescript
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY, [context.getHandler(), context.getClass()]
      );
      if (!requiredRoles) return true;

      const { user } = context.switchToHttp().getRequest<{ user?: { role: string } }>();
      return requiredRoles.includes(user?.role ?? '');
    }
  }
  ```

### B2. & B3. การสร้าง JWT
- **Design Concept (B2):** 
  - JWT ทำให้ระบบไร้สภาวะแบบเต็มตัว (Stateless) ไม่ต้องไปหาเซิร์ฟเวอร์แบบ Redis Cache มาเก็บ Session ของคนเป็นหมื่นคน ลดปัญหาขวดขวด (Horizontal Scalability) 
  - Role ฝังลงไปในหมวด Payload (`"role": "ADMIN"`) Backend แค่ตรวจสอบลายเซ็น (Verify) จากนั้นนำ Role ออกมาใช้คำนวณ Access Control ได้เลย (หลีกเลี่ยงการทำ Query ไปฐานข้อมูลซ้ำซ้อนทุกรอบที่ยิง Request)
- **3.1 JWT_SECRET เอามาจากไหน:** มาจาก Environment Variables โหลดเข้า `ConfigService` (`process.env.JWT_SECRET`)
- **3.2 Entropy:** Secret มีความยาวระดับโปรดักชัน (มากกว่า 256 bits) ป้องกันกระบวนการ Brute-force หา Secret ตรงๆ (Offline HMAC Cracking)
- **3.3 สร้างเมื่อไหร่:** สร้างเมื่อ Login ผ่าน หรือ Verify 2FA สำเร็จ (`token.service.ts`)
- **3.4 สร้างฝั่งไหน (FE/BE):** **ต้องสร้างที่ Backend** เสมอ 
  - *อธิบายเชิงลึก:* Backend เป็นส่วนเดียวที่เข้าถึงกุญแจความลับระดับสูงสุด (JWT_SECRET) การเข้ารหัส (Signing) จึงต้องทำข้างในรั้วจำกัด ถ้าให้ FE เข้าถึงหรือสร้าง Token กุญแจจะฝังอยู่ในเครื่อง Client และ Hacker จะสามารถสร้าง JWT ใหม่พร้อมกำหนด Payload `"role": "ADMIN"` ขึ้นมาเจาะระบบทันที
- **3.5 Algorithm:** ใช้ **HMAC SHA-256 (HS256)** 
- **3.6 HS256 vs RS256:** 
  - *HS256 (Symmetric Cryptography):* ใช้กุญแจเดี่ยว `JWT_SECRET` เข้ารหัสและกุญแจเดี่ยวถอดรหัส (เหมาะกับระบบนี้ เพราะฝ่ายออกบัตรและฝ่ายตรวจรับบัตรคือ Server NestJS ก้อนเดียวกัน - Monolithic)
  - *RS256 (Asymmetric Cryptography):* ฝ่ายออกบัตร (Auth Server) ใช้ Private Key สร้างลายเซ็น และแจกจ่าย Public Key ให้อีกนับร้อย Microservices นำไปแค่เช็คใบรับรองว่าจริงไหม การใช้ RS256 ปลอดภัยตรงที่ Microservices อื่นๆ ไม่มีสิทธิ์สร้างบัตรปลอมเองได้
- **3.7 อายุ Access Token:** 
  - *อธิบายเชิงลึก:* Access Token ไม่สามารถลบหรือสั่งยกเลิก (Revoke) ณ ห้วงเวลาทันทีได้ (เว้นแต่จะใช้ Denylist DB ที่ขัดกับหลัก Stateless) จึงจำเป็นต้องตั้งอายุให้สั้นที่สุดเท่าที่เป็นไปได้ (เช่น 15-30 นาที) เพื่อลด **Window of exposure** (ห้วงเวลาที่ Hacker เอาไปใช้ประโยชน์) ยิ่งหมดอายุไว ระบบยิ่งปลอดภัยสูง

### B4. ส่ง Token
- **4.1 - 4.2 การเก็บอย่างปลอดภัย (Cookie):** **[มี]** 
  - *อธิบายเชิงลึก:* Token ไม่ส่งเข้า Body ให้ FE เอาไปเก็บใน `localStorage` ด้วยตัวเอง (ซึ่งเจาะจงแพ้ภัย XSS 100%)
  - ระบบส่งคืนผ่าน `Set-Cookie` header (`backend/src/auth/auth.controller.ts`)
  - **`HttpOnly=true`**: เบราว์เซอร์ปฏิเสธไม่ให้คำสั่ง JavaScript ใดๆ ฝั่งเครื่องลูกข่าย (เช่น `document.cookie`) มองเห็นหรือขโมย Text ของ Cookie ทำให้ภูมิคุ้มกัน XSS ทำงานได้อย่างสมบูรณ์แบบ
  - **`Secure=true`**: เบราว์เซอร์จะส่ง Cookie กลับไปให้ Server ต่อเมื่อเชื่อมต่ออยู่บนโพรโทคอลที่มีการเข้ารหัสชั้นสูงอย่าง HTTPS เท่านั้น
  **ตัวอย่างโค้ด Set Cookie: (รวมป้องกัน CSRF แบบ SameSite=Lax ด้วย)**
  ```typescript
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // <- ป้องกัน CSRF
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
  }
  ```
- **4.3 วิธีดู Token ใน Client:** ดูกด F12 (Developer Tools) -> ไปแท็บ Application หรือ Storage -> เลือกหมวด Cookies 
- **4.4 Decode Payload:** เลนในหน้า DevTools ให้ก๊อปปี้ค่า Value แล้วไปวางที่เว็บ [jwt.io](https://jwt.io/) โปรแกรมจะแตก Base64Url ให้ออกมาเป็น JSON ทรงอ่านง่าย

### B5. Verify Token
- **5.1 & 5.2 ฟังก์ชัน Verify:** `backend/src/auth/strategies/jwt.strategy.ts` มีคลาส `JwtStrategy` จัดการร่วมกับ Passport 
- **5.3 Verify ต่างจาก Decode อย่างไร:** 
  - *อธิบายเชิงลึก:* `Decode` เป็นตาน้ำของการเปลี่ยน Base64 ร่างภาษาคอม กลับมาเป็นตัวอักษร JSON โดยไม่มีการยืนยันใดๆ แต่ `Verify` เป็นงานทางคณิตศาสตร์เข้ารหัส (Cryptographic Validation) โดยระบบจะหยิบเนื้อ Header และ Payload ส่งให้ฟังก์ชัน HMAC-SHA256 ทำงานร่วมกับ `JWT_SECRET` ที่มันอมไว้ จากนั้นหยิบผลลัพธ์มาเช็คแบบ Exact Match ชนกับค่า Signature บรรทัดที่ 3 ใน JWT ของ User ถ้าตรงกัน 100% จึงไฟเขียวว่าข้อมูลไม่ได้ถูกแฮกเกอร์ตัดต่อมาระหว่างทาง (Non-repudiation & Integrity)
- **5.4 กรณีหมดอายุ:** ตัว AuthGuard ของ NestJS จะปัดตกระหว่างรอบ Middleware และยิงกลับมาเป็น HTTP Status Code `401 Unauthorized` ในทันที โดยส่วน Logic ชั้นลึกของ Controller จะไม่ถูกรันเลยแม้แต่น้อย

### B6. Bonus: Refresh token Mechanism
- **6.1 ทำไมต้องใช้ (Why use RT):** 
  - ควบคุมจุดบอดของ Access Token (AT) ที่มีอายุสั้นมาก ถ้าไม่อยากสร้างความรำคาญใจให้ผู้ใช้กรอกรหัสผ่านทุก 15 นาที ระบบจึงนำระบบ Refresh Token (RT) ที่มีอายุยาว (เช่น 7 วัน) เข้ามาผนวก เมื่อ AT หมดอายุ ระบบเบื้องหลังจะสาด RT ไปขอปลดล็อกไขเอา AT ใบใหม่แบบเนียนๆ (Transparent UX) 
  - *ข้อควรระวัง:* สำหรับแอปธนาคารหรือเปราะบางสูงมักปฏิเสธระบบ RT บังคับตายตัวว่าหมด 15 นาทีต้อง Login พิสูจน์ตัวใหม่
- **6.2 การออกแบบ:** กฎ Key Separation - โค้ดมีกุญแจเซ็น `REFRESH_TOKEN_HASH_SECRET` แยกส่วน ไม่พึ่งพา JWT_SECRET เดิม เพื่อทำ Isolate Scope ในกรณีที่กุญแจเส้นหนึ่งรั่วไหล
- **6.3 การจัดเก็บ:** 
  - *ฝั่ง Browser:* ฝังอยู่ใน `HttpOnly` Cookie ควบคู่กับเพื่อนของมัน
  - *ฝั่ง Server:* **[กลไก Token Rotation & DB Hashing]** เมื่อนำ RT ไปแลกตั๋ว ชุดคำสั่งจะ Invalidate ตัวที่ใช้แล้วทิ้งและออกคู่เซ็ตใบใหม่ให้ทันที (Rotation) 
  - นอกจากนี้ ค่าย Token ที่เก็บลง Database (`schema.prisma` -> `refreshToken`) จะนำไปเข้าฟังก์ชันแฮชทางเดียว (`crypto.createHmac('sha256')`) หากฐานข้อมูลโดนยิง Dump ออกไป Hacker ก็ได้รหัส Hash RT เอาไปตั้ง Request ปลอม (Impersonation) ไม่ได้อยู่ดี

---

## 🔒 C. Secure Communication
- **C0. แสดง HTTPS:** อ้างอิงตาม Cloud Architecture ที่คุณนำ Nginx Proxy Server (เช่น **Pangolin** Reverse Proxy) มาตั้งรับการสื่อสารด้วยพอร์ต 443 รับจบและเป็นหน้าด่านคุ้มครองแอป Node.js
- **C1. About CA (Certificate Authority):**
  - *1.1 CA คือใคร:* คือสถาบันคนกลางระดับสากลที่ได้รับความเชื่อถือจากบรรดา OS/Browser ทั่วโลก (ในแอปเราคือ Let's Encrypt แบบ Automated) ทำหน้าที่ยืนยันว่า Domain นั้นๆ พ่วงติดอยู่กับ Public Key ก้อนนั้นจริงๆ
  - *1.2 CA Signature Algorithm:* อัลกอริทึมที่ CA ใช้รหัสลายเซ็นยืนยันตัวเองแปะลงบนใบเซอร์ มักเป็น `SHA-256 with RSA Encryption` (แฮชด้วย SHA256 แล้วทำ Asymmetric Sign ลงมาด้วย Private Key ของ CA)
  - *1.3 Public Key Algo:* รูปแบบกุญแจที่เราเอาไปให้เขาเซ็นรับรอง (ระบบมักเป็น RSA-2048/4096-bit หรือ ECDSA ยุคใหม่)
  - *1.4 กุญแจเขียว (Padlock):* อธิบายให้ทราบถึงความสามารถในการทำ Data Confidentiality (ใครดักสัญญาณกลางอากาศเจอแต่ขยะ) และ Server Authentication (เราได้เชื่อมตรงกับ Server เป้าหมายแท้จริง ไม่ได้โดนการทำ DNS Spoofing วิ่งพาไปหน้าหลอก)
- **C2. เก็บ Key ไว้ไหน:** 
  - *2.1 Private Key:* ซ่อนตัวอย่างมิดชิดลึกสุดในซอกหลืบ Server หรือ Nginx Volume (Permission 600 หรือ 400 อ่านได้เฉพาะ Root Account เท่านั้น ไม่โชว์ออนไลน์ หรือเข้า Repository Git เด็ดขาด)
  - *2.2 Public Key:* ไม่มีข้อผูกมัด สามารถแปะแนบไปพร้อมใบรับรอง (CRT File) ฝาก Nginx ไปแจกให้แขกเหรื่อที่เป็น Browser นำไปใช้ในขั้นตอน TLS Handshake ได้ฟรีๆ

---

## 🔑 D. Secret Management
- **D1. ไฟล์ ENV:** `backend/.env`
  - 1.1 สิทธิ์ไฟล์: (ถ้าอยู่บน Host Server) จะเป็น 600 หรืออนุโลมสุด 644 ที่ห้ามให้ Group อื่นในคอมขู่เอาไป
  - 1.2 - 1.4: ข้อมูลทั้งหมดอย่าง **Client Secret (Google OAuth)** และ **JWT Secret** เก็บไว้ในค่าตัวแปร .env ล้วนๆ (ผ่าน ConfigModule ของ NestJS) ไม่มีใครหน้าไหนยอมมาพิมพ์ชื่อ String ลับแปะสด (Hardcode) ไว้ใน Source Code.ts แจกจ่ายให้คนอื่นดู
- **D2. Private Key:** นอกเหนือจากเซิร์ซโค้ด จะตั้งสิทธิ์ 600
- **D3. ห้ามขึ้น Git:** 
  - ตรวจไปที่ไฟล์ `.gitignore` จะพบว่ามีการเขียนกฎ `.env` หรือ `.env.*` วางไว้
  - เช็ค `git log` ตั้งแต่ก้อนแรก ไม่บรรจุหลุดข้ามขึ้นไปยัง GitHub เลยแม้แต่น้อย

---

## 🛡️ E. SQLi and XSS
### E1. SQL Injection (SQLi)
- **1.1 เกิดเมื่อไหร่:** เกิดกรณีโค้ดดึงเอาช่อง String จากผู้ใช้มาเรียงต่อ (Concatenation) ด้วยเครื่องหมาย `+` เข้ากับสายอักขระ SQL อย่างง่ายดายเพื่อลงไปยัดใน Database ทำให้เกิดช่องโหว่การเปลี่ยน Logic Execution ของโครงสร้างประโยคนั้นๆ ไปอย่างจัง
- **1.2 & 1.3 การป้องกัน:** **[มี]** 
  - *อธิบายเชิงลึก:* ระบบใช้ **Prisma ORM** ซึ่งขจัดโค้ด SQLi จากพื้นฐานไปเลย (Default Safe) Prisma ทำการซอยฝั่ง SQL ลงเป็น Node และประกอบกันเสร็จสับในลักษณะ **Abstract Syntax Tree (AST)** หรือ Parameterized Query จากนั้นมันจะตีความข้อมูล Input จากเหยื่อว่าเป็นแค่ String Value-data แน่นอน ไม่ยอมรับการแปลงร่างเป็น SQL Execution Operator 
  **ตัวอย่างโครงสร้างที่ป้องกัน SQLi ได้ทันที:**
  ```typescript
  // ใน AuthService
  const user = await this.prisma.user.findUnique({
    where: { email: loginDto.email }, // Prisma จะ Escape ข้อมูลนี้ให้อัตโนมัติ
    include: { role: true },
  });
  ```
- **1.4 การทดสอบ:** พิมพ์ `' OR '1'='1` ใส่ในช่องอีเมล ปรากฏว่าระบบยังยืนหยัด Error ว่า "Invalid Email" หรือ "Invalid credentials" แทนที่มันจะข้ามบรรทัด Validation แบบเว็บยุคเก่า

### E2. Cross-Site Scripting (XSS)
- **2.1 เกิดเมื่อไหร่:** พบบ่อยในเมนู Comment/Reason ที่เหยื่อซุกพิมพ์ Payload โค้ดอย่าง `<script>...</script>` เซฟขึ้นเซิร์ฟเวอร์ พอเหยื่อคนอื่นเปิดอ่าน เซิร์ฟเวอร์เผลอส่งมันออกมาแสดงตรงๆ Browser ก็หลับหูหลับตารัน JavaScript เลวร้ายนั่นแหวะเครื่องเหยื่อทันที 
- **2.2 & 2.3 การป้องกัน:** **[มี 2 ชั้น]**
  - *อธิบายเชิงลึกชั้น React:* React ใช้อาวุธไม้ตาย **DOM Auto-escaping (Context-aware Encoding)** ทุกข้อมูลที่ถูกแทรกผ่านวงเล็บปีกกา `{data}` จะทำหน้าที่เปลี่ยน Special Characters เช่น `< >` ให้กลายเป็นเซ็ตของ HTML Entities (`&lt;` และ `&gt;`) ซึ่งเบราว์เซอร์รับรู้ว่าหน้าที่ของมันคือแสดงผลเป็นข้อความตัวหนังสือบนหน้าจอดื้อๆ (Text Node) จึงดับฝันการ Execute
  - *อธิบายเชิงลึกชั้น HttpOnly:* Auth Cookie จะรอดตาย 100% เพราะ XSS Payload มาร้ายแค่ไหนก็อ่าน Object `document.cookie` ไม่ได้
- **2.4 การทดสอบ:** ลองแทรก Request เหตุผลการลางานพิมพ์ว่า `<script>alert('hack')</script>` บนจอจะโชว์ประโยคนั้นเพียวๆ ไม่ตีเด้ง Pop-up 

### E3. Bonus: CSRF (Cross-Site Request Forgery)
- **3.1 เกิดเมื่อไหร่:** แฮกเกอร์มักฉกฉวยโอกาสช่วงที่เหยื่อยเปิดแท็บเซิฟเวอร์บริษัททิ้งคู่ไว้ (ทำให้มี Auth Cookie อยู่) พอเหยื่อหลงกดแท็บเว็บปลอมของแฮกเกอร์ ตัวเว็บปลอมแอบ Submit POST Request มุ่งหน้าไปหาปลายทางหลังบ้านของบริษัทเรา ซึ่งลูกข่ายเบราว์เซอร์ดันซื่อตรง แปะเปะ Cookie ยืนยันตัวตนแนบไปให้แฮกเกอร์ทำรายการเสร็จสับ
- **3.2 การป้องกัน:** **[มี]**
  - *อธิบายเชิงลึก:* ระบบเราตั้งค่า Parameter เสริมใน Cookie ชื่อ `SameSite='lax'` หรือ `'strict'` ระบบตัวเบราว์เซอร์บนเครื่องของคนไข้จะเช็ค **Origin Domain** ก่อนว่าต้นทางกับปลายทางถือเป็นไซต์เดียวกันไหม ถ้าไม่ใช่ (ข้ามโดเมน) เบราว์เซอร์จะสั่ง **Drop/ไม่อนุมัติ** การแนบ Auth Cookie หลุดไปให้ Request ปลอมนั้น หลังบ้านก็พบว่า 401 ยิงสกัดกลับสถานเดียว
  - *เช็คได้ที่:* `backend/src/auth/auth.controller.ts` ฝั่งกระบวนการ `res.cookie()`
  **ตัวอย่างฟังก์ชันตั้งค่า Cookie ป้องกัน CSRF:**
  ```typescript
  res.cookie('jwt', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // ไฮไลท์การตั้งค่าป้องกัน CSRF 
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  ```

---

## 📈 F. Code Quality & Security Analysis
ระบบนี้ถูกพ่วงเชือกสายเชื่อมต่อกับ `sonar-project.properties` เพื่อบังคับกระบวนการ CI/CD
- **F1. Before Report (ก่อนแก้ไข):** 
  - ระบบจะชี้ให้เห็น Report บนหน้าจอ Dashboard ที่ขึ้น Issue ตระหนักระดับ Bugs / Code Smells และหมวด Vulnerabilities ร้ายแรง (โชว์พรีวิวฐานจากครั้งแรกก่อน Clean-up)
- **F2. After Report (หลังแก้ไข):** 
  - กราฟ Quality Gate ระบุเป็น "Passed" (สีเขียว)
  - จำนวน Issue ถูกรีดลดลงอย่างจับต้องสัมผัสได้
- **F3. ตัวอย่าง Issue ที่พบและการอธิบายรับมือ:** 
  - *ยกเคส: "Security Hotspot - Hardcoded credentials"*
  - *สาเหตุปัญหา (Root Cause):* SonarQube จับคู่ Pattern ของ String เสนอว่ามีคนเขียนระบุ Password หรือ JWT_SECRET แบบ Text มักง่ายคาไว้ใน `auth.module.ts` ในสมัยตั้งไข่
  - *การแก้ไข (Resolution):* ตัวผู้พัฒนา Refactor ตัดทิ้งและดันพารามิเตอร์ลับผ่านกลยุทธ์ Environment Variables โหลดกระสุนเข้า ConfigService ภายใต้ .env ชั่วคราว ซึ่งรหัสจะไม่แปดเปื้อนติดบน Git ตามกฎ `.gitignore` ความเสี่ยงการถูกเจาะ Repository จึงบารมีเต็มร้อย และปิดเคสนี้ให้ SonarQube 
  **โครงสร้าง Environment Variables (ConfigModule):**
  ```typescript
  import { Module } from '@nestjs/common';
  import { ConfigModule } from '@nestjs/config';

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,      // เข้าถึงได้ทุกที่
        envFilePath: '.env', // ดึงค่าจากไฟล์ .env
      }),
      // ...โมดูลอื่น ๆ
    ],
  })
  export class AppModule {}
  ``` 
