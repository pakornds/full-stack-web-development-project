# รายงานการแก้ไขปัญหา SonarQube
**โปรเจกต์:** full-stack-web-dev  
**วันที่สแกน:** 31 มีนาคม 2026  
**เครื่องมือ:** SonarQube Community Edition  

---

## รายงานก่อนการแก้ไข (Before Correction Report)

| หมวดหมู่ | จำนวนปัญหา |
|---|---|
| CODE_SMELL | 70 |
| BUG | 3 |
| VULNERABILITY / CRITICAL | 1 |
| **รวม** | **74** |

### ไฟล์ที่มีปัญหา

| ไฟล์ | จำนวนปัญหา |
|---|---|
| `frontend/src/index.css` | 16 |
| `frontend/src/pages/LeaveManagement.tsx` | 9 |
| `frontend/src/pages/DepartmentLeaveDashboard.tsx` | 8 |
| `frontend/src/pages/LogLeaveDashboard.tsx` | 8 |
| `frontend/src/pages/Login.tsx` | 7 |
| `frontend/src/axios.ts` | 6 |
| `frontend/src/components/LeaveLayout.tsx` | 5 |
| `frontend/src/pages/TwoFactorSetup.tsx` | 4 |
| `backend/src/auth/auth.service.ts` | 4 |
| `frontend/src/pages/PersonalLeaveDashboard.tsx` | 2 |
| `frontend/src/pages/Register.tsx` | 2 |
| `backend/src/main.ts` | 1 |
| `frontend/src/services/authService.ts` | 1 |
| `backend/src/auth/roles.guard.ts` | 1 |
| `backend/src/auth/strategies/google.strategy.ts` | 1 |

### ตัวอย่างปัญหาที่พบ (ก่อนแก้ไข)

```ts
// ❌ ใช้ window แทน globalThis
window.location.href = `${API_URL}/auth/google`;

// ❌ ใช้ Promise.reject แทน throw
return Promise.reject(refreshError);

// ❌ sort() ไม่มี comparator function (CRITICAL BUG)
departments.sort();

// ❌ div ที่กดได้ แต่ไม่มี role และ keyboard handler
<div className="modal-overlay" onClick={closeModal}>

// ❌ label ไม่ได้เชื่อมกับ input
<label>Start Date</label>
<input type="date" ... />

// ❌ ใช้ replace() แทน replaceAll()
value.replace(/\D/g, "")

// ❌ ไม่มี readonly บน injected dependency
constructor(private reflector: Reflector) {}

// ❌ CSS มี semicolon เกิน และสีที่ contrast ต่ำเกินไป
color: #f87171; /* ความเปรียบต่างไม่ผ่าน WCAG AA */
```

---

## รายงานหลังการแก้ไข (After Correction Report)

| หมวดหมู่ | จำนวนปัญหาที่แก้ไข | สถานะ |
|---|---|---|
| CODE_SMELL | 70 | ✅ แก้ไขแล้วทั้งหมด |
| BUG | 3 | ✅ แก้ไขแล้วทั้งหมด |
| VULNERABILITY / CRITICAL | 1 | ✅ แก้ไขแล้วทั้งหมด |
| **รวม** | **74** | ✅ **ครบ 100%** |

### สรุปการแก้ไขรายไฟล์

| ไฟล์ | การแก้ไขหลัก |
|---|---|
| `frontend/src/index.css` | ลบ semicolon เกิน, ปรับสี text ให้ผ่าน WCAG AA |
| `frontend/src/pages/LeaveManagement.tsx` | เพิ่ม htmlFor/id, globalThis.confirm, แก้ nested ternary |
| `frontend/src/pages/DepartmentLeaveDashboard.tsx` | role="button", globalThis.confirm, แก้ nested ternary |
| `frontend/src/pages/LogLeaveDashboard.tsx` | localeCompare sort, modal accessibility attrs |
| `frontend/src/pages/Login.tsx` | แก้ FormEvent type, replaceAll |
| `frontend/src/axios.ts` | optional chain, throw, ??=, globalThis |
| `frontend/src/components/LeaveLayout.tsx` | role="button" + onKeyDown, JSX spacing |
| `frontend/src/pages/TwoFactorSetup.tsx` | FormEvent\<HTMLFormElement\>, replaceAll |
| `backend/src/auth/auth.service.ts` | ??=, optional chain, flip negated condition |
| `frontend/src/pages/PersonalLeaveDashboard.tsx` | แก้ nested ternary |
| `frontend/src/pages/Register.tsx` | แก้ FormEvent type |
| `backend/src/main.ts` | top-level await |
| `frontend/src/services/authService.ts` | globalThis แทน window |
| `backend/src/auth/roles.guard.ts` | เพิ่ม readonly |
| `backend/src/auth/strategies/google.strategy.ts` | เพิ่ม readonly |

---

## คำอธิบายปัญหาและการแก้ไข

---

### 1. การเข้าถึง (Accessibility) — `<div>` ที่กดได้แต่ไม่รองรับ keyboard

**ปัญหาที่พบ:**  
มีหลาย `<div>` ที่ทำหน้าที่เป็นปุ่ม (มี `onClick`) แต่ไม่มี `role="button"`, `tabIndex`, หรือ `onKeyDown` ทำให้ผู้ใช้ที่ใช้แป้นพิมพ์แทน mouse ไม่สามารถโต้ตอบกับ UI ได้

**การแก้ไข:**
```tsx
// ❌ ก่อน
<div className="modal-overlay" onClick={closeModal}>

// ✅ หลัง
<div
  className="modal-overlay"
  role="button"
  tabIndex={0}
  aria-label="Close modal"
  onClick={closeModal}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") closeModal(); }}
>
```

**ความเสี่ยงที่ลดได้:**  
เพิ่ม accessibility ให้ผู้ใช้ที่ต้องพึ่ง keyboard navigation (เช่น ผู้พิการทางสายตา, ผู้ใช้ screen reader) สามารถใช้งานแอปได้ครบถ้วน ลดความเสี่ยงในการละเมิด Web Accessibility Guidelines (WCAG 2.1)

---

### 2. Label ไม่เชื่อมกับ Input (Accessibility)

**ปัญหาที่พบ:**  
Form inputs หลายตัวมี `<label>` แต่ไม่ได้เชื่อมด้วย `htmlFor` และ `id` ที่ตรงกัน ทำให้ screen reader ไม่สามารถบอกได้ว่า label ไหนเป็นของ input ไหน

**การแก้ไข:**
```tsx
// ❌ ก่อน
<label>Start Date</label>
<input type="date" value={startDate} onChange={...} />

// ✅ หลัง
<label htmlFor="startDate">Start Date</label>
<input id="startDate" type="date" value={startDate} onChange={...} />
```

**ความเสี่ยงที่ลดได้:**  
ลดปัญหา UX สำหรับผู้ใช้ screen reader และผู้ใช้ทั่วไป (สามารถคลิก label เพื่อ focus input ได้)

---

### 3. `.sort()` ไม่มี Comparator Function (CRITICAL BUG)

**ปัญหาที่พบ:**  
การเรียก `.sort()` โดยไม่มี comparator จะใช้การเรียงแบบ **lexicographic** ซึ่งให้ผลลัพธ์ไม่ถูกต้องสำหรับข้อมูลภาษาไทย/อักษรพิเศษ และอาจแตกต่างกันในแต่ละ browser/engine

**การแก้ไข:**
```ts
// ❌ ก่อน
departments.sort();

// ✅ หลัง
departments.sort((a, b) => a.localeCompare(b));
```

**ความเสี่ยงที่ลดได้:**  
ลด BUG ที่อาจทำให้การแสดงผลข้อมูลผิดพลาด (ผลลัพธ์จะพังเพราะลำดับของ Unicode ไม่สอดคล้องกับหลักพจนานุกรมไทย) โดยเฉพาะกับข้อมูลหลายภาษา รับประกันผลลัพธ์ที่สม่ำเสมอทุก runtime

Default Sort: จะเรียงตามรหัส Unicode ซึ่งสระ (เช่น เ, แ, โ) มีค่ารหัสสูงกว่าพยัญชนะ (ก-ฮ)
    ผลลัพธ์อาจออกมาเป็น: เกษตร ไปอยู่หลังสุด หรือลำดับสลับกันมั่ว เพราะมันมองว่า "เก" เริ่มต้นด้วยสระ "เ" ซึ่งรหัส Unicode อยู่คนละกลุ่มกับ "บ" หรือ "ฝ"
`.localeCompare('th')`: จะใช้กฎการเรียงลำดับตามภาษา (Linguistic Sorting) ซึ่งฉลาดพอที่จะรู้ว่า "เกษตร" ควรขึ้นต้นด้วย "ก" และจัดลำดับให้ถูกต้องตามพจนานุกรม

---

### 4. `window` แทน `globalThis`

**ปัญหาที่พบ:**  
การใช้ `window.location`, `window.confirm` ผูกติดกับ browser environment เท่านั้น ไม่สามารถทำงานใน SSR (Server-Side Rendering) หรือ test environment ได้

**การแก้ไข:**
```ts
// ❌ ก่อน
window.location.href = `${API_URL}/auth/google`;
window.confirm("Are you sure?");

// ✅ หลัง
globalThis.location.href = `${API_URL}/auth/google`;
globalThis.confirm("Are you sure?");
```

**ความเสี่ยงที่ลดได้:**  
ลดความเสี่ยงของ runtime error เมื่อ code ถูกใช้ใน non-browser environment เพิ่ม portability ของ codebase

---

### 5. `Promise.reject()` แทน `throw`

**ปัญหาที่พบ:**  
ใน `async` function, การใช้ `return Promise.reject(error)` เป็น anti-pattern ที่ SonarQube ตรวจพบ เพราะมีความหมายเหมือน `throw error` แต่อ่านยากกว่า

**การแก้ไข:**
```ts
// ❌ ก่อน
return Promise.reject(refreshError);

// ✅ หลัง
throw refreshError;
```

**ความเสี่ยงที่ลดได้:**  
เพิ่มความอ่านง่ายของ code และลดโอกาสเกิด unhandled Promise rejection ที่ซ่อนอยู่

---

### 6. Nullish Assignment Operator (`??=`)

**ปัญหาที่พบ:**  
ใช้ `if (!variable) { variable = value }` แทนที่จะใช้ `??=` ซึ่งกระชับกว่าและถูกต้องกว่า (truthy check vs nullish check)

**การแก้ไข:**
```ts
// ❌ ก่อน
if (!role) {
  role = await this.prisma.role.create({ data: { name: "employee" } });
}

// ✅ หลัง
role ??= await this.prisma.role.create({ data: { name: "employee" } });
```

**ความเสี่ยงที่ลดได้:**  
ลด logical bug: `!role` จะเป็น true แม้ role เป็นค่า falsy อื่น (เช่น `""`, `0`) ในขณะที่ `??=` จะ assign เฉพาะเมื่อค่าเป็น `null` หรือ `undefined` เท่านั้น

---

### 7. Optional Chaining บน Nullable Property

**ปัญหาที่พบ:**  
การ access property บน object ที่อาจเป็น `null` โดยไม่มีการตรวจสอบ อาจทำให้เกิด `TypeError: Cannot read properties of null`

**การแก้ไข:**
```ts
// ❌ ก่อน
if (user.resetPasswordExpiresAt < new Date())

// ✅ หลัง
if (user?.resetPasswordExpiresAt < new Date())
```

**ความเสี่ยงที่ลดได้:**  
ป้องกัน runtime crash เมื่อ user object เป็น null ซึ่งอาจเกิดขึ้นได้จาก database query ที่ไม่พบข้อมูล

---

### 8. `readonly` บน Injected Dependencies (NestJS)

**ปัญหาที่พบ:**  
Constructor parameter ที่ inject เข้ามาไม่ได้ถูก mark ว่า `readonly` ทำให้สามารถ reassign ได้โดยไม่ตั้งใจ

**การแก้ไข:**
```ts
// ❌ ก่อน
constructor(private reflector: Reflector) {}
constructor(private configService: ConfigService) {}

// ✅ หลัง
constructor(private readonly reflector: Reflector) {}
constructor(private readonly configService: ConfigService) {}
```

**ความเสี่ยงที่ลดได้:**  
ป้องกัน bug จากการ reassign dependency โดยไม่ตั้งใจ ทำให้ design intent ชัดเจนขึ้น

---

### 9. `FormEventHandler` Type ที่ล้าสมัย

**ปัญหาที่พบ:**  
การใช้ `React.FormEventHandler<HTMLFormElement>` เป็น type annotation สำหรับ `async function` ทำให้ TypeScript ตรวจจับ return type ของ async ไม่ตรง

**การแก้ไข:**
```tsx
// ❌ ก่อน
const handleLogin: React.FormEventHandler<HTMLFormElement> = async (e) => { ... }

// ✅ หลัง
const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => { ... }
```

**ความเสี่ยงที่ลดได้:**  
ให้ TypeScript สามารถ infer return type (`Promise<void>`) ได้ถูกต้อง ลดโอกาสเกิด type error ที่ซ่อนอยู่

---

### 10. `.replace()` แทน `.replaceAll()`

**ปัญหาที่พบ:**  
เมื่อใช้ `.replace()` กับ string pattern (ไม่ใช่ regex) จะ replace เฉพาะ occurrence แรกเท่านั้น แม้ใช้ regex global flag แต่ SonarQube แนะนำให้ใช้ `.replaceAll()` เพื่อความชัดเจน

**การแก้ไข:**
```ts
// ❌ ก่อน
value.replace(/\D/g, "")

// ✅ หลัง
value.replaceAll(/\D/g, "")
```

**ความเสี่ยงที่ลดได้:**  
เพิ่มความชัดเจนและลด confusion สำหรับ developer คนอื่นที่อ่าน code

---

### 11. CSS Contrast ต่ำกว่ามาตรฐาน WCAG AA

**ปัญหาที่พบ:**  
สีตัวอักษรหลายจุดใน `index.css` มี contrast ratio ต่ำกว่า 4.5:1 (WCAG AA) ทำให้ยากต่อการอ่านสำหรับผู้ที่มีปัญหาด้านการมองเห็น

**การแก้ไข (ตัวอย่าง):**
```css
/* ❌ ก่อน */
.status-approved { color: #34d399; } /* contrast ต่ำมาก */
.form-error      { color: #f87171; }
.status-pending  { color: #fbbf24; }

/* ✅ หลัง */
.status-approved { color: #065f46; } /* เข้มขึ้น ผ่าน WCAG AA */
.form-error      { color: #991b1b; }
.status-pending  { color: #78350f; }
```

**ความเสี่ยงที่ลดได้:**  
ลดความเสี่ยงในการละเมิด Web Accessibility Guidelines (WCAG 2.1 Level AA) ซึ่งเป็นมาตรฐานสากลด้าน accessibility ทำให้แอปใช้งานได้กับผู้ที่มีความบกพร่องทางการมองเห็น

---

### 12. Extra Semicolons ใน CSS

**ปัญหาที่พบ:**  
มี semicolon เกิน (`;`) ใน CSS rules ซึ่งถือเป็น code smell และอาจทำให้ parser บางตัวแจ้ง error

**การแก้ไข:**
```css
/* ❌ ก่อน */
.leave-request-form-card {
  padding: 2rem;;  /* semicolon เกิน */
}

/* ✅ หลัง */
.leave-request-form-card {
  padding: 2rem;
}
```

**ความเสี่ยงที่ลดได้:**  
ลด parsing error ที่อาจเกิดขึ้นใน CSS processor หรือ browser บางตัว

---

### 13. Top-Level Await (Backend bootstrap)

**ปัญหาที่พบ:**  
`bootstrap().catch(console.error)` เป็น promise chain ที่ SonarQube แนะนำให้ใช้ top-level await แทน เพราะ target เป็น ES2023 และ module เป็น NodeNext

**การแก้ไข:**
```ts
// ❌ ก่อน
bootstrap().catch(console.error);

// ✅ หลัง
await bootstrap();
```

**ความเสี่ยงที่ลดได้:**  
ทำให้ unhandled error ใน bootstrap function ถูก propagate ขึ้นมาอย่างถูกต้อง แทนที่จะถูก swallow โดย `.catch()` ที่อาจจัดการ error ไม่ครบถ้วน

---

## สรุปภาพรวม

| ประเภทปัญหา | จำนวน | ความเสี่ยงที่ลดได้ |
|---|---|---|
| Accessibility (WCAG) | 20+ | ผู้ใช้ keyboard/screen reader ใช้งานได้ |
| Code Quality / Maintainability | 30+ | ลด technical debt, อ่านง่ายขึ้น |
| Runtime Bug | 3 | ป้องกัน crash และผลลัพธ์ผิดพลาด |
| Security/Critical | 1 | การเรียงข้อมูลถูกต้องทุก environment |
| CSS/Visual | 20+ | ผ่านมาตรฐาน WCAG AA contrast |

> **ผลลัพธ์:** ปัญหาทั้งหมด **74 รายการ** ได้รับการแก้ไขครบถ้วน คุณภาพโดยรวมของโปรเจกต์ดีขึ้นในด้าน maintainability, accessibility, และความปลอดภัย
