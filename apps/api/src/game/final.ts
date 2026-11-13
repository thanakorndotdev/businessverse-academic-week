import type { BusinessState, ObjectiveId } from "./engine";

export const FINAL_BUDGET = 300000;
export const FINAL_VERSION = "perfect-storm-v1";
export const finalScenario = {
  title: "The Perfect Storm — แผนกู้ธุรกิจ 12 เดือน",
  scenario:
    "ยอดขายลดลง 25% ลูกค้าบางส่วนร้องเรียนเรื่องคุณภาพสินค้า Supplier ส่งของล่าช้า ต้นทุนขนส่งเพิ่มขึ้น มีข่าวว่าข้อมูลลูกค้าอาจรั่วไหล ขณะเดียวกันมีโอกาสขยายไปต่างประเทศและมีชุมชน E-sport เสนอร่วมกิจกรรม บริษัทมีทรัพยากรจำกัด จงจัดทำแผนรับมือที่รักษาธุรกิจและพาไปสู่ Objective ของทีม",
};

type Impact = Record<ObjectiveId, number>;
interface Action {
  id: string;
  title: string;
  benefit: string;
  tradeoff: string;
  /** Positive = allocation/spend; negative = financing received. */
  coins: number;
  quality: 0 | 1 | 2;
  impact: Impact;
}
const action = (
  id: string,
  title: string,
  benefit: string,
  tradeoff: string,
  coins: number,
  quality: 0 | 1 | 2,
  impact: Impact,
): Action => ({ id, title, benefit, tradeoff, coins, quality, impact });
export const finalSections = [
  {
    id: "management",
    title: "Management",
    prompt: "จะให้เรื่องใดเป็นลำดับแรก และยอมชะลอเรื่องใด",
    options: [
      action(
        "stabilize",
        "เดือน 1–3 ฟื้นคุณภาพและความเชื่อมั่น แล้วค่อยขยาย",
        "กำหนดเจ้าภาพและจุดตรวจรายเดือนก่อนลงทุนเพิ่ม",
        "เลื่อนการเปิดตลาดเต็มรูปแบบและงานใหญ่จนกว่าจะผ่านจุดตรวจ",
        20000,
        2,
        { growth: 1, premium: 2, cost: 2, customer: 2 },
      ),
      action(
        "stage",
        "แก้วิกฤตควบคู่การทดลองที่มีจุดหยุดขาดทุน",
        "แบ่งทีมแก้คุณภาพ/ข้อมูล และทดลองตลาดเล็กในเดือน 4–6",
        "ต้องกันเงินและกำลังคนให้การแก้วิกฤตก่อนโครงการทดลอง",
        30000,
        2,
        { growth: 2, premium: 1, cost: 1, customer: 1 },
      ),
      action(
        "sprint",
        "เร่งทุกโครงการพร้อมกันในไตรมาสแรก",
        "สร้างโอกาสยอดขายหลายทางทันที",
        "กำลังคนกระจายและไม่มีลำดับแก้ปัญหาคุณภาพหรือข้อมูล",
        50000,
        0,
        { growth: 2, premium: 0, cost: 0, customer: 0 },
      ),
      action(
        "freeze",
        "หยุดโครงการใหม่และรอดูสถานการณ์",
        "ประหยัดงบจัดการระยะสั้น",
        "ไม่มีเจ้าภาพแก้ปัญหาหรือกำหนดเวลาฟื้นธุรกิจ",
        0,
        1,
        { growth: 0, premium: 0, cost: 1, customer: 0 },
      ),
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    prompt: "จะรักษาคุณค่าที่เสนอให้ลูกค้ากลุ่มไหนอย่างไร",
    options: [
      action(
        "retain",
        "ดูแลลูกค้าเดิมที่ร้องเรียน พร้อมรับประกันและติดตามผล",
        "คืนความมั่นใจและลดการสูญเสียลูกค้าที่มีมูลค่า",
        "ต้องมีระบบบริการและสินค้าทดแทน ลดงบหาลูกค้าใหม่",
        40000,
        2,
        { growth: 1, premium: 1, cost: 0, customer: 3 },
      ),
      action(
        "assure",
        "เจาะกลุ่มที่ยอมจ่ายเพื่อคุณภาพ พร้อมหลักฐานตรวจสินค้า",
        "รักษาคุณค่าแบรนด์และราคาที่มีกำไร",
        "ต้องแก้คุณภาพจริงก่อนสื่อสาร และเข้าถึงคนจำนวนน้อยลง",
        40000,
        2,
        { growth: 1, premium: 3, cost: 1, customer: 1 },
      ),
      action(
        "value",
        "โฟกัสกลุ่มคุ้มค่า ขายชุดสินค้าหลักที่ส่งมอบได้",
        "ลดความซับซ้อนและรักษากำไรต่อคำสั่งซื้อ",
        "ตัดสินค้าบางรุ่นและจำกัดโปรโมชั่น ต้องมีสต็อกเชื่อถือได้",
        20000,
        2,
        { growth: 2, premium: 0, cost: 3, customer: 1 },
      ),
      action(
        "discount",
        "ลดราคาทั้งร้านเพื่อดึงลูกค้าทุกกลุ่ม",
        "เพิ่มยอดสั่งซื้อระยะสั้น",
        "กำไรบางลงและอาจเร่งคำร้องเรียนถ้าส่งของหรือคุณภาพยังไม่พร้อม",
        50000,
        0,
        { growth: 2, premium: 0, cost: 0, customer: 0 },
      ),
    ],
  },
  {
    id: "esport",
    title: "E-sport",
    prompt: "จะใช้ความร่วมมือกับชุมชนหรือพักกิจกรรมไว้ก่อน",
    options: [
      action(
        "community",
        "ร่วมกิจกรรมออนไลน์เล็กกับชุมชนในเดือน 4",
        "ทดลองเข้าถึงกลุ่มใหม่ วัดผลด้วยผู้สนใจที่สมัครใจ",
        "ขยายผลช้ากว่างานใหญ่ และต้องมีของพร้อมส่งก่อนเริ่ม",
        20000,
        2,
        { growth: 2, premium: 1, cost: 1, customer: 2 },
      ),
      action(
        "service",
        "ให้ชุมชนร่วมทดสอบสินค้าและฟังข้อเสนอแนะ",
        "ได้ข้อมูลคุณภาพและความสัมพันธ์โดยไม่จัดงานขายใหญ่",
        "การเรียนรู้ใช้เวลาและยอดขายไม่เกิดทันที",
        10000,
        2,
        { growth: 1, premium: 2, cost: 1, customer: 2 },
      ),
      action(
        "pause",
        "พักกิจกรรม 6 เดือน แล้วทบทวนเมื่อธุรกิจนิ่ง",
        "คืนกำลังคนให้บริการลูกค้าและแก้ Supplier",
        "เสียโอกาสเข้าถึงชุมชนระยะสั้น",
        0,
        2,
        { growth: 0, premium: 1, cost: 2, customer: 0 },
      ),
      action(
        "arena",
        "จัดงานแข่งใหญ่พร้อมขายสินค้าในไตรมาสแรก",
        "สร้างการรับรู้และคำสั่งซื้อได้รวดเร็ว",
        "ใช้ทรัพยากรมาก ต้องพร้อมทั้งสต็อก คุณภาพ และเงินสำรอง",
        100000,
        1,
        { growth: 3, premium: 0, cost: 0, customer: 1 },
      ),
    ],
  },
  {
    id: "digitalMarketing",
    title: "Digital Marketing",
    prompt: "จะใช้ช่องทางและข้อมูลลูกค้าอย่างไรในภาวะงบจำกัด",
    options: [
      action(
        "consent",
        "ใช้ CRM เฉพาะข้อมูลที่ตรวจสอบสิทธิ์และความยินยอมแล้ว",
        "ติดตามลูกค้าเดิมด้วยต้นทุนต่ำและวัดการกลับมาซื้อ",
        "ต้องตรวจเหตุข้อมูลรั่วและสิทธิ์เข้าถึงก่อนเปิดแคมเปญ",
        20000,
        2,
        { growth: 1, premium: 1, cost: 2, customer: 3 },
      ),
      action(
        "context",
        "ใช้เนื้อหาและโฆษณาตามบริบทโดยไม่ส่งข้อมูลลูกค้า",
        "ทดสอบช่องทางใหม่ด้วยวงเงินรายสัปดาห์และหยุดช่องที่ไม่คุ้ม",
        "ต้องสร้างเนื้อหาและเรียนรู้กลุ่มเป้าหมายใหม่",
        30000,
        2,
        { growth: 3, premium: 1, cost: 1, customer: 1 },
      ),
      action(
        "owned",
        "ใช้ช่องทางของบริษัท สื่อสารสถานะสินค้าและการแก้ปัญหา",
        "รักษาความเชื่อมั่นโดยไม่ซื้อการเข้าถึงจำนวนมาก",
        "ขยายฐานลูกค้าช้า ต้องอัปเดตข้อมูลอย่างสม่ำเสมอ",
        10000,
        2,
        { growth: 1, premium: 2, cost: 2, customer: 2 },
      ),
      action(
        "blast",
        "อัปโหลดฐานลูกค้าทั้งหมดซื้อโฆษณาเร่งยอด",
        "เข้าถึงลูกค้าเก่าได้เร็ว",
        "เพิ่มความเสี่ยงข้อมูลระหว่างที่ยังตรวจข่าวรั่วไหลไม่เสร็จ",
        40000,
        0,
        { growth: 2, premium: 0, cost: 0, customer: 0 },
      ),
    ],
  },
  {
    id: "innovation",
    title: "Digital & Innovation",
    prompt: "จะจัดการความเสี่ยงข้อมูลและใช้เทคโนโลยีแก้ปัญหาใด",
    options: [
      action(
        "contain",
        "จำกัดสิทธิ์ ตรวจเหตุข้อมูล และเชื่อมระบบติดตามสินค้า",
        "มีผู้รับผิดชอบเหตุรั่ว พร้อมลดปัญหาส่งมอบ",
        "ต้องอบรมทีมและเลื่อนฟีเจอร์ใหม่บางส่วน",
        50000,
        2,
        { growth: 1, premium: 2, cost: 2, customer: 2 },
      ),
      action(
        "audit",
        "ตรวจและกักเหตุข้อมูล ใช้ระบบที่มีพร้อมตารางติดตามร่วม",
        "คุมความเสี่ยงได้ด้วยงบจำกัดและแยกข้อมูลที่ยังใช้ไม่ได้",
        "งานติดตามยังใช้คน หากความเสี่ยงเดิมสูงต้องเพิ่มมาตรการเต็มชุด",
        30000,
        2,
        { growth: 0, premium: 2, cost: 2, customer: 1 },
      ),
      action(
        "automate",
        "ลงทุนระบบอัตโนมัติใหม่ แต่เลื่อนตรวจข้อมูล",
        "ลดงานซ้ำเมื่อระบบเริ่มใช้",
        "ความเสี่ยงรั่วไหลยังอยู่และมีช่วงเปลี่ยนระบบ",
        70000,
        1,
        { growth: 2, premium: 0, cost: 2, customer: 0 },
      ),
      action(
        "ignore",
        "รอหลักฐานชัดก่อนใช้งบตรวจข้อมูล",
        "ไม่เสียค่าใช้จ่ายตอนนี้",
        "ตรวจพบความเสียหายช้าและไม่มีมาตรการจำกัดเหตุ",
        0,
        0,
        { growth: 0, premium: 0, cost: 0, customer: 0 },
      ),
    ],
  },
  {
    id: "international",
    title: "International Business",
    prompt: "จะเข้าตลาดใหม่ตอนนี้ ชะลอ หรือทดลองขนาดเล็ก",
    options: [
      action(
        "pilot",
        "ทดลองตลาดเดียวกับคู่ค้า ตรวจมาตรฐานก่อนรับยอดจำกัด",
        "เรียนรู้ความต้องการและต้นทุนจริงในเดือน 7–9",
        "ต้องแก้ Supplier ก่อนเริ่ม และยังไม่เกิดยอดขายระดับใหญ่",
        40000,
        2,
        { growth: 3, premium: 1, cost: 1, customer: 1 },
      ),
      action(
        "research",
        "ศึกษากฎตลาดและทดสอบความสนใจโดยไม่ส่งสินค้า",
        "เก็บหลักฐานเพื่อการตัดสินใจเดือน 10–12 โดยไม่เพิ่มภาระส่งมอบ",
        "รายได้ต่างประเทศถูกเลื่อนออกไป",
        10000,
        2,
        { growth: 1, premium: 2, cost: 2, customer: 1 },
      ),
      action(
        "defer",
        "ชะลอต่างประเทศ 12 เดือน เน้นฟื้นตลาดเดิม",
        "รักษาเงินและกำลังคนให้ธุรกิจหลัก",
        "พลาดจังหวะตลาดใหม่และต้องเริ่มศึกษาภายหลัง",
        0,
        2,
        { growth: 0, premium: 1, cost: 2, customer: 1 },
      ),
      action(
        "launch",
        "เปิดหลายประเทศเต็มรูปแบบในไตรมาสแรก",
        "เข้าถึงยอดขายใหม่ได้มากหากส่งมอบสำเร็จ",
        "ภาระสต็อก กฎระเบียบ และเงินทุนสูงก่อนแก้ปัญหาเดิม",
        120000,
        1,
        { growth: 3, premium: 0, cost: 0, customer: 0 },
      ),
    ],
  },
  {
    id: "logistics",
    title: "Logistics",
    prompt: "จะจัดการ Supplier สินค้าขาด และคุณภาพอย่างไร",
    options: [
      action(
        "dual",
        "ตรวจคุณภาพทุกล็อต เพิ่ม Supplier สำรอง และจัดเส้นทางใหม่",
        "ลดความเสี่ยงสินค้าขาดและแยกสินค้ามีปัญหาได้",
        "ค่าเริ่มต้นสูงและต้องตรวจมาตรฐานคู่ค้าใหม่",
        60000,
        2,
        { growth: 2, premium: 2, cost: 2, customer: 2 },
      ),
      action(
        "repair",
        "แก้ SLA กับ Supplier เดิม ตรวจล็อต และกันสต็อกสินค้าหลัก",
        "ลดของขาดและคุมคุณภาพโดยไม่เปลี่ยนทุกคู่ค้า",
        "ยังพึ่ง Supplier เดิม หาก Operations ต่ำต้องกระจายความเสี่ยงเพิ่ม",
        40000,
        2,
        { growth: 1, premium: 2, cost: 3, customer: 2 },
      ),
      action(
        "express",
        "ส่งด่วนทุกออเดอร์โดยไม่เปลี่ยนการตรวจคุณภาพ",
        "ลดเวลาขนส่งระยะสั้น",
        "ต้นทุนเพิ่มและข้อร้องเรียนคุณภาพยังไม่ถูกแก้",
        70000,
        1,
        { growth: 1, premium: 0, cost: 0, customer: 1 },
      ),
      action(
        "wait",
        "ใช้ Supplier เดิม ไม่กันสต็อกหรือเพิ่มการตรวจ",
        "เก็บเงินลงทุนไว้ก่อน",
        "การส่งช้า สินค้าขาด และคุณภาพยังเป็นจุดเสี่ยง",
        0,
        0,
        { growth: 0, premium: 0, cost: 0, customer: 0 },
      ),
    ],
  },
  {
    id: "finance",
    title: "Finance & Investment",
    prompt: "จะจัดสรร Business Coins และรักษาสภาพคล่องอย่างไร",
    options: [
      action(
        "reserve",
        "กันเงินฉุกเฉินและทบทวนกระแสเงินสดทุกเดือน",
        "คงเงินในวงเงิน Final อย่างน้อย 60,000 หากเงินสดเดิมต่ำกว่า 200,000 หรือ 30,000 ในกรณีอื่น",
        "ต้องลดหรือเลื่อนบางโครงการเพื่อเก็บเงินสำรอง",
        0,
        2,
        { growth: 0, premium: 1, cost: 3, customer: 1 },
      ),
      action(
        "credit",
        "รับวงเงินหมุนเวียน 50,000 พร้อมเพดานหนี้และแผนชำระ",
        "มีเงินเพิ่มและต้องเหลือสำรองอย่างน้อย 40,000 เมื่อเงินสดเดิมต่ำกว่า 200,000 หรือ 20,000 ในกรณีอื่น",
        "มีภาระหนี้ในอนาคต ต้องคุมโครงการที่ไม่สร้างกระแสเงินสด",
        -50000,
        2,
        { growth: 2, premium: 0, cost: 1, customer: 1 },
      ),
      action(
        "weekly",
        "ลงทุนระบบติดตามเงินสด 13 สัปดาห์และจ่ายตามจุดตรวจ",
        "คุมเงินรายสัปดาห์ ต้องเหลือสำรอง 40,000 เมื่อเงินสดเดิมต่ำกว่า 200,000 หรือ 15,000 ในกรณีอื่น",
        "ใช้เงินตั้งระบบและต้องเก็บข้อมูลจริงทุกสัปดาห์",
        10000,
        2,
        { growth: 1, premium: 1, cost: 3, customer: 1 },
      ),
      action(
        "drain",
        "ดึงเงินสำรองเดิม 80,000 มาเร่งโครงการ โดยไม่ทำแผนเงินสด",
        "เพิ่ม Coins ที่ใช้ได้ทันที",
        "ไม่มีเงินฉุกเฉินหรือแผนชำระภาระเดิม ธุรกิจเปราะบางกว่าเดิม",
        -80000,
        0,
        { growth: 2, premium: 0, cost: 0, customer: 0 },
      ),
    ],
  },
] as const;
export type FinalSectionId = (typeof finalSections)[number]["id"];
export interface FinalSelection {
  sectionId: string;
  optionId: string;
}

/** Explicit allowlist: no quality, impacts, scoring rules or answer key crosses this boundary. */
export const publicFinalScenario = () => ({
  ...finalScenario,
  budget: FINAL_BUDGET,
  sections: finalSections.map((s) => ({
    id: s.id,
    title: s.title,
    prompt: s.prompt,
    options: s.options.map((o) => ({
      id: o.id,
      title: o.title,
      benefit: o.benefit,
      tradeoff: o.tradeoff,
      coins: o.coins,
    })),
  })),
});

export function validateFinalPlan(selections: FinalSelection[]) {
  if (
    selections.length !== finalSections.length ||
    new Set(selections.map((s) => s.sectionId)).size !== finalSections.length
  )
    throw new Error("กรุณาเลือกหนึ่งการกระทำให้ครบทั้ง 8 สาขา โดยไม่ซ้ำสาขา");
  const chosen = finalSections.map((s) => {
    const selection = selections.find((x) => x.sectionId === s.id);
    const option = s.options.find((o) => o.id === selection?.optionId);
    if (!option) throw new Error(`ตัวเลือกไม่ถูกต้องสำหรับ ${s.title}`);
    return { sectionId: s.id, option };
  });
  const spent = chosen.reduce((sum, x) => sum + x.option.coins, 0);
  if (spent > FINAL_BUDGET)
    throw new Error(
      `งบรวมต้องไม่เกิน ${FINAL_BUDGET.toLocaleString()} Business Coins (รวม Coins ที่ได้รับ)`,
    );
  return { chosen, spent, remaining: FINAL_BUDGET - spent };
}

/** Server-only deterministic rubric, 8 × 0–2 + four one-point plan checks. */
export function scoreFinalPlan(
  objective: ObjectiveId,
  state: BusinessState,
  selections: FinalSelection[],
) {
  const plan = validateFinalPlan(selections);
  const pick = (id: FinalSectionId) =>
    plan.chosen.find((s) => s.sectionId === id)!.option.id;
  const logisticsReady = ["dual", "repair"].includes(pick("logistics"));
  const dataReady = ["contain", "audit"].includes(pick("innovation"));
  const highDemand =
    pick("esport") === "arena" ||
    ["pilot", "launch"].includes(pick("international"));
  const issues: string[] = [];
  if (highDemand && !logisticsReady)
    issues.push("เพิ่มความต้องการโดยยังไม่แก้ Supplier และคุณภาพ");
  if (pick("esport") === "arena" && pick("international") === "launch")
    issues.push("เปิดต่างประเทศเต็มรูปแบบพร้อมงานใหญ่ทั้งที่ทรัพยากรจำกัด");
  if (
    pick("management") === "stabilize" &&
    (pick("esport") === "arena" || pick("international") === "launch")
  )
    issues.push("กำหนดให้ฟื้นธุรกิจก่อน แต่เริ่มโครงการใหญ่ตั้งแต่ไตรมาสแรก");
  if (pick("management") === "freeze" && highDemand)
    issues.push("หยุดโครงการใหม่แต่ยังลงทุนขยายความต้องการ");
  if (pick("digitalMarketing") === "consent" && !dataReady)
    issues.push("ใช้ข้อมูลลูกค้าก่อนตรวจและจำกัดเหตุรั่วไหล");
  if (
    ["retain", "assure", "value"].includes(pick("marketing")) &&
    !logisticsReady
  )
    issues.push("สัญญาคุณค่ากับลูกค้าโดยยังไม่แก้การส่งมอบและคุณภาพ");
  if (pick("finance") === "drain" && highDemand)
    issues.push("ดึงเงินสำรองไปเร่งขยายโดยไม่มีแผนเงินสด");
  const minimumReserve =
    pick("finance") === "reserve"
      ? state.cash < 200000
        ? 60000
        : 30000
      : pick("finance") === "credit"
        ? state.cash < 200000
          ? 40000
          : 20000
        : state.cash < 200000
          ? 40000
          : 15000;
  const liquidity =
    pick("finance") !== "drain" && plan.remaining >= minimumReserve;
  const stateIssues: string[] = [];
  if (state.operations < 70 && pick("logistics") !== "dual")
    stateIssues.push("Operations ต่ำกว่า 70 ต้องกระจาย Supplier พร้อมตรวจคุณภาพ");
  if ((state.risk >= 55 || !state.cyber) && pick("innovation") !== "contain")
    stateIssues.push("ความเสี่ยงสูงหรือยังไม่มี Cyber ต้องจำกัดเหตุและติดตามเต็มชุด");
  if (state.customer < 70 && !["retain", "assure"].includes(pick("marketing")))
    stateIssues.push("Customer ต่ำกว่า 70 ต้องฟื้นความมั่นใจด้วยบริการหรือหลักฐานคุณภาพ");
  const disciplines = plan.chosen.map(({ sectionId, option }) => {
    let points: number = option.quality;
    if (
      sectionId === "logistics" &&
      state.operations < 70 &&
      option.id === "repair"
    )
      points = 1;
    if (
      sectionId === "innovation" &&
      (state.risk >= 55 || !state.cyber) &&
      option.id === "audit"
    )
      points = 1;
    if (sectionId === "marketing" && !logisticsReady)
      points = Math.min(points, 1);
    if (
      sectionId === "digitalMarketing" &&
      option.id === "consent" &&
      !dataReady
    )
      points = 0;
    if (
      sectionId === "international" &&
      ["pilot", "launch"].includes(option.id) &&
      !logisticsReady
    )
      points = 0;
    if (sectionId === "esport" && option.id === "arena" && !logisticsReady)
      points = 0;
    if (sectionId === "finance" && !liquidity) points = Math.min(points, 1);
    return { sectionId, optionId: option.id, points };
  });
  // Count impact only where the chosen action is supported well enough to earn 2 points.
  const objectiveImpact = plan.chosen.reduce(
    (sum, x, i) =>
      sum + (disciplines[i].points === 2 ? x.option.impact[objective] : 0),
    0,
  );
  const checks = {
    coherence: issues.length === 0,
    budgetAndLiquidity: liquidity,
    companyState: stateIssues.length === 0,
    objective: objectiveImpact >= 12,
  };
  const disciplinePoints = disciplines.reduce((sum, s) => sum + s.points, 0);
  const planPoints = Object.values(checks).filter(Boolean).length;
  return {
    version: FINAL_VERSION,
    total: disciplinePoints + planPoints,
    disciplinePoints,
    planPoints,
    disciplines,
    checks,
    issues,
    stateIssues,
    spent: plan.spent,
    remaining: plan.remaining,
    minimumReserve,
    objectiveImpact,
    objective,
    companyState: state,
  };
}
export type FinalAssessment = ReturnType<typeof scoreFinalPlan>;
