# The Perfect Storm — แผนกู้ธุรกิจ 12 เดือน

Developer / organizer reference. Do not publish the scoring keys to players.

ทุกทีมรับโจทย์เดียวกันตามข้อความที่กำหนด: ยอดขายลด 25%, คุณภาพถูกร้องเรียน, Supplier ล่าช้า, ขนส่งแพง, ข่าวข้อมูลลูกค้ารั่ว และโอกาสต่างประเทศ/ชุมชน E-sport ทุกทีมส่งหนึ่งแผน ประกอบด้วยหนึ่งการกระทำต่อสาขาทั้ง 8 และเหตุผลรวมหนึ่งครั้ง (3–300 ตัวอักษรหลัง trim) ไม่ใช้กรรมการหรือการประเมินภาษาธรรมชาติ เหตุผลเก็บเพื่อทบทวน ไม่ให้คะแนนจากถ้อยคำ

## Allocation and timing

- วงเงิน Final ที่กำหนดในรุ่นนี้: **300,000 Business Coins เท่ากันทุกทีม** แยกจาก Coins เดิมของรอบคัดเลือก เพื่อไม่ปิดโอกาสทำคะแนนเต็มของทีมที่มีสถานะต่างกัน
- แต่ละสาขามี 4 การกระทำ พร้อมข้อดี ข้อแลกเปลี่ยน และ Coins ใช้/ได้รับ ไม่มีตัวเลือกชื่อ Objective
- `spent = sum(action.coins)`, `remaining = 300000 - spent`. ค่า Coins ติดลบคือเงินได้รับจากแผนการเงิน ไม่ใช่ค่าใช้จ่าย เลือก Finance ได้ครั้งเดียวจึงรับเงินได้ครั้งเดียว
- ต้องเลือกครบและงบสุทธิไม่เกินวงเงินก่อนส่ง แผนงบเกินถูกปฏิเสธ ไม่ใช่ส่งแล้วได้คะแนนลด
- เงินคงเหลือขั้นต่ำขึ้นกับแผน Finance และสถานะเงินสดเดิม แผนที่ยังอยู่ในวงเงินแต่ไม่มีสภาพคล่องเพียงพอส่งได้ แต่ไม่ได้คะแนนเต็ม
- **คงเวลา Final เดิม 3 นาที** นับพร้อมกันจากผู้จัดเปิดรอบ และเผื่อการส่งผ่านเครือข่าย 5 วินาทีทางเซิร์ฟเวอร์ ไม่ใช่ระยะเวลา 12 เดือนของเรื่องสมมติ
- ร่างแผนเก็บใน sessionStorage แยกทีมและเวลาเปิดรอบ เพื่อกู้คืนหลังรีเฟรชในแท็บเดิม แผนจริงเก็บใน PostgreSQL เมื่อส่งสำเร็จ

## Rubric `perfect-storm-v1`

Source of truth: `apps/api/src/game/final.ts`. คะแนนเต็ม **20 = รายสาขา 16 + แผนรวม 4**

แต่ละ action มี `quality` ตั้งต้น 0, 1 หรือ 2 และเวกเตอร์สนับสนุน Objective 4 ค่า (`impact`) ฝั่งเซิร์ฟเวอร์ คะแนนรายสาขาไม่เลือกตามชื่อ Objective แต่พิจารณาทักษะและเงื่อนไขรองรับการลงมือจริง:

- Logistics แบบแก้คู่ค้าเดิมได้สูงสุด 1 หาก Operations เดิมต่ำกว่า 70
- Innovation แบบตรวจเหตุเบื้องต้นได้สูงสุด 1 หาก Risk เดิมตั้งแต่ 55 หรือยังไม่มี Cyber
- Marketing ได้สูงสุด 1 หากไม่แก้ Supplier/คุณภาพด้วย `dual` หรือ `repair`
- Digital Marketing แบบ CRM ได้ 0 หากไม่ตรวจ/กักเหตุด้วย `contain` หรือ `audit`
- การเปิด/ทดลองต่างประเทศและงาน E-sport ใหญ่ได้ 0 หากไม่แก้ Supplier/คุณภาพ
- Finance ได้สูงสุด 1 หากเงินสำรองไม่ถึงขั้นต่ำ

คะแนนแผนรวมให้ข้อละ **1 คะแนน**:

| Check              | เงื่อนไข                                                                    |
| ------------------ | ------------------------------------------------------------------------- |
| coherence          | ไม่มีความขัดกันของแผนตามรายการด้านล่าง                                          |
| budgetAndLiquidity | งบผ่านการตรวจและเงินคงเหลือถึงขั้นต่ำตาม Finance; ไม่ใช้ `drain`                   |
| companyState       | รองรับเงื่อนไข Operations, Risk/Cyber และ Customer เดิมครบ                    |
| objective          | ผลรวม impact ต่อ Objective ที่ได้รับ ≥12 โดยนับเฉพาะ action ที่ได้คุณภาพจริง 2 คะแนน |

ความขัดกัน: เพิ่มความต้องการโดยไม่แก้ Supplier, จัดงานใหญ่พร้อมเปิดหลายประเทศเต็มรูปแบบ, Management ให้ฟื้นก่อนแต่เริ่มโครงการใหญ่ไตรมาสแรก, Management หยุดโครงการแต่ยังขยาย, ใช้ CRM ก่อนตรวจเหตุข้อมูล, สัญญาคุณค่าทั้งที่ยังไม่แก้คุณภาพ/ส่งมอบ และเร่งขยายด้วยการดึงสำรองโดยไม่มีแผนเงินสด

เงื่อนไขสถานะเดิม: Operations <70 ต้อง `dual`; Risk ≥55 หรือไม่มี Cyber ต้อง `contain`; Customer <70 ต้อง `retain` หรือ `assure`. Sales/Brand และความสามารถอื่นยังแสดงเป็นบริบทธุรกิจ โดยไม่มีการอ้างว่าให้คะแนนทุกตัวชี้วัด

| Finance | เงินคงเหลือขั้นต่ำ เมื่อ Cash เดิม <200,000 |               กรณีอื่น |
| ------- | ----------------------------------: | ------------------: |
| reserve |                              60,000 |              30,000 |
| credit  |                              40,000 |              20,000 |
| weekly  |                              40,000 |              15,000 |
| drain   |                 ไม่ผ่านเงื่อนไขสภาพคล่อง | ไม่ผ่านเงื่อนไขสภาพคล่อง |

## Contract and persistence

`GET /api/final` ให้ `phase`, `open`, `isFinalist`, `objective`, `companyState`, `timer`, `question` และ `saved`. ก่อนเปิด Final `question` เป็น null; หลังเปิดเป็นโจทย์เดียวกันพร้อม `budget` และ `sections`. แต่ละ action เปิดเผยเฉพาะ `id`, `title`, `benefit`, `tradeoff`, `coins`. ไม่ส่ง quality, impact, score, assessment, อันดับ หรือ answer key ให้ผู้เล่น

`POST /api/final/answer` เปลี่ยนจาก `{optionId, reason}` เป็น:

```json
{
  "selections": [
    { "sectionId": "management", "optionId": "stabilize" },
    { "sectionId": "marketing", "optionId": "retain" },
    { "sectionId": "esport", "optionId": "community" },
    { "sectionId": "digitalMarketing", "optionId": "context" },
    { "sectionId": "innovation", "optionId": "contain" },
    { "sectionId": "international", "optionId": "pilot" },
    { "sectionId": "logistics", "optionId": "dual" },
    { "sectionId": "finance", "optionId": "credit" }
  ],
  "reason": "แก้วิกฤตก่อนทดลองตลาด พร้อมเงินสำรองและแผนชำระหนี้"
}
```

ต้องมี 8 สาขาไม่ซ้ำและแต่ละ action ต้องอยู่ในสาขานั้น ตรวจราคาและคำนวณสถานะเดิมใหม่จากคำตอบรอบคัดเลือกฝั่งเซิร์ฟเวอร์ ไม่รับราคา คะแนน Objective หรือสถานะบริษัทจาก client. บันทึกภายใต้ transaction พร้อมล็อกทีมและ phase ป้องกันการส่งซ้ำ/ปิดรอบระหว่างให้คะแนน: 400 สำหรับข้อมูลหรืองบไม่ถูกต้อง; 403 สำหรับไม่ใช่ผู้เล่นหรือยังไม่เปิด/ปิดรอบ; 409 สำหรับหมดเวลาหรือส่งแล้ว

Migration `0002_equal_zemo.sql` เพิ่ม `selections` และ `assessment` เป็น JSONB แบบไม่ลบข้อมูลเดิม เก็บ version, สถานะบริษัท ณ ส่ง, คะแนนรายสาขา, ผล checks, เหตุขัดกัน, งบและสำรอง สำหรับผู้จัดตรวจผ่าน `GET /api/admin/participants/:id/answers`. คำตอบเก่าเก็บคะแนนเดิมและแสดง `legacyChoice`; ไม่แปลงเป็นแผน 8 สาขาหรือให้คะแนนใหม่โดยเงียบ ๆ

ทุกทีมส่งได้ คะแนนของทุกทีมเก็บใน assessment แต่เพิ่ม `users.finalPoints` เฉพาะทีมที่มี `finalistRank` จาก Top 10 snapshot. Standings ใช้ qualifier + Final เฉพาะ finalist; Audience ไม่ได้สิทธิ์รางวัลหรือเพิ่มอันดับจาก Final

## Validation (2026-11-13)

- Local `bun test tests`: **20 tests / 456 assertions**, ผ่านทั้งหมด (DB suite เปิดเฉพาะ integration runtime); เพิ่ม guard ให้ Bun รุ่นเก่าไม่ลงทะเบียน DB hooks เมื่อ suite ถูกข้าม

- Exhaustive enumeration **65,536 ชุดต่อ Objective** ตรวจเพดานคะแนนทุกชุดที่งบผ่าน: ทั้ง Growth, Premium, Cost และ Customer มีหลายแผนที่ได้ 20 ในสถานะเริ่มต้น สถานะวิกฤต สถานะแข็งแรง และสถานะหลังเล่นครบ 24 ข้อจริง
- เพิ่ม witness ทดสอบครบทุกแขนงเงื่อนไขของ Cash, Operations, Risk, Cyber และ Customer เพื่อยืนยันว่าทุก Objective ยังได้ 20 เมื่อสถานะเดิมเปลี่ยน ไม่มีข้อกำหนดว่าจำนวนชุดคำตอบเต็มของแต่ละ Objective ต้องเท่ากัน
- API integration: **19 tests / 283 assertions**, PostgreSQL `businessverse_test` แยกจากเกมจริง ครอบคลุมครบ 8 ส่วน, ตัวเลือกข้ามสาขา, งบเกิน, บทบาท, ซ่อนคะแนน, หมดเวลา, ส่งพร้อมกัน 200/409, admin breakdown และ Audience ไม่เพิ่มคะแนน
- Postman live isolated API: **44 requests / 95 assertions**, ผ่านทั้งหมด ใช้ collection/environment เดิมที่เพิ่ม Final contract; ไม่เผยแพร่ผลไป Postman cloud
- Production frontend build, strict API/frontend typecheck และ `docker compose build api web` ผ่าน; รันทดสอบจากอิมเมจ API ที่ build จริงครบ **39 tests / 739 assertions** ผ่านทั้งหมด โดย mount เฉพาะ tests ไม่ใช้ source override
- Native Chrome: เลือกแผนครบ 8 ส่วน, งบ 180,000 เหลือ 120,000, เหตุผล/ตัวเลือกยังอยู่หลังรีเฟรช, ส่งสำเร็จและเห็นสรุป 8 สาขาโดยไม่มีคะแนน ตรวจภาพ desktop และ iPhone 16 (393×852); แก้และยืนยันสีข้อความบนแถบงบ
- [Independent Impeccable finish reviewer](final-design-review.md): **ship**, ไม่มี material fixes หลังตรวจภาพยืนยันและ source. ตรวจเฉพาะส่วนที่เปลี่ยน ไม่ได้อ้างการตรวจ screen reader เต็มรูปแบบหรือ Core Web Vitals

Changes are verified on the isolated test runtime; this record does not imply a production deployment or a reset of the live competition.
