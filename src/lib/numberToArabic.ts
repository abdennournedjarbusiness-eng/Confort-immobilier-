
export function convertToArabicWords(amount: number): string {
  if (!amount || amount === 0) return "صفر دينار جزائري";
  
  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  function process(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const unit = n % 10;
      const ten = Math.floor(n / 10);
      return (unit === 0 ? "" : ones[unit] + " و") + tens[ten];
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      return (hundred === 0 ? "" : hundreds[hundred]) + (rest === 0 ? "" : " و" + process(rest));
    }
    if (n < 1000000) {
      const thousand = Math.floor(n / 1000);
      const rest = n % 1000;
      let thousandStr = "";
      if (thousand === 1) thousandStr = "ألف";
      else if (thousand === 2) thousandStr = "ألفين";
      else if (thousand >= 3 && thousand <= 10) thousandStr = process(thousand) + " آلاف";
      else thousandStr = process(thousand) + " ألف";
      
      return thousandStr + (rest === 0 ? "" : " و" + process(rest));
    }
    if (n < 1000000000) {
      const million = Math.floor(n / 1000000);
      const rest = n % 1000000;
      let millionStr = "";
      if (million === 1) millionStr = "مليون";
      else if (million === 2) millionStr = "مليونين";
      else if (million >= 3 && million <= 10) millionStr = process(million) + " ملايين";
      else millionStr = process(million) + " مليون";
      
      return millionStr + (rest === 0 ? "" : " و" + process(rest));
    }
    if (n < 1000000000000) {
      const billion = Math.floor(n / 1000000000);
      const rest = n % 1000000000;
      let billionStr = "";
      if (billion === 1) billionStr = "مليار";
      else if (billion === 2) billionStr = "مليارين";
      else if (billion >= 3 && billion <= 10) billionStr = process(billion) + " مليارات";
      else billionStr = process(billion) + " مليار";
      
      return billionStr + (rest === 0 ? "" : " و" + process(rest));
    }
    return n.toString();
  }

  try {
    return process(amount) + " دينار جزائري";
  } catch (error) {
    return amount.toLocaleString() + " دينار جزائري";
  }
}

export function convertFloorToOrdinal(floor: string): string {
  const floorMap: Record<string, string> = {
    "RDC": "الطابق الأرضي (RDC)",
    "0": "الطابق الأرضي (0)",
    "1": "الطابق الأول (1)",
    "2": "الطابق الثاني (2)",
    "3": "الطابق الثالث (3)",
    "4": "الطابق الرابع (4)",
    "5": "الطابق الخامس (5)",
    "6": "الطابق السادس (6)",
    "7": "الطابق السابع (7)",
    "8": "الطابق الثامن (8)",
    "9": "الطابق التاسع (9)",
    "10": "الطابق العاشر (10)"
  };

  return floorMap[floor] || `الطابق ${floor}`;
}
