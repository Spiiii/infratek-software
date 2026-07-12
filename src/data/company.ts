// File: src/data/company.ts
export const company = {
  name: "Infratek Software",
  tagline: "Giải pháp AI đột phá cho doanh nghiệp",
  mission:
    "Help enterprises adopt AI through practical software solutions that create measurable business value.",
  missionVi:
    "Đồng hành cùng doanh nghiệp trong hành trình chuyển đổi số bằng AI — xây dựng giải pháp phần mềm thực tiễn, tạo giá trị kinh doanh đo lường được.",
  director: "Ngô Đức Trọng",
  email: "trong.ngo@infratek.vn",
  phone: "0901 671 671",
  phoneRaw: "+84901671671",
  address: "31–33 Phan Huy Ích",
  ward: "Phường Tân Sơn",
  city: "TP.HCM",
  fullAddress: "31–33 Phan Huy Ích, Phường Tân Sơn, TP.HCM",
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.848!2d106.6297!3d10.8231!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDQ5JzIzLjIiTiAxMDbCsDM3JzQ2LjkiRQ!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s",
  social: {
    linkedin: "https://linkedin.com/company/infratek",
    facebook: "https://facebook.com/infratek",
  },
} as const;

export const statistics = [
  { label: "Dự án AI hoàn thành", value: 50, suffix: "+" },
  { label: "Doanh nghiệp tin tưởng", value: 30, suffix: "+" },
  { label: "Năm kinh nghiệm", value: 8, suffix: "+" },
  { label: "Chuyên gia AI & Engineering", value: 25, suffix: "+" },
] as const;