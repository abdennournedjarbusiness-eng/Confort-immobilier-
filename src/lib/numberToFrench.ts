/**
 * Converts a numeric amount to formal French words.
 * Tailored for Algerian Dinars (DZD) in legal documents.
 */

export function convertToFrenchWords(num: number): string {
  if (num === 0) return "zéro";

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];

  function convertLessThanThousand(n: number): string {
    let result = "";

    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
      if (hundreds === 1) {
        result += "cent";
      } else {
        result += units[hundreds] + " cent";
        // plural s if it ends exactly on hundred
        if (remainder === 0) {
          result += "s";
        }
      }
    }

    if (remainder > 0) {
      if (result !== "") result += " ";
      if (remainder < 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        
        if (t === 7) {
          if (u === 1) {
            result += "soixante-et-onze";
          } else {
            result += "soixante-" + teens[u];
          }
        } else if (t === 8) {
          if (u === 0) {
            result += "quatre-vingts";
          } else {
            result += "quatre-vingt-" + units[u];
          }
        } else if (t === 9) {
          result += "quatre-vingt-" + teens[u];
        } else {
          if (u === 1) {
            result += tens[t] + "-et-un";
          } else if (u > 1) {
            result += tens[t] + "-" + units[u];
          } else {
            result += tens[t];
          }
        }
      }
    }

    return result.trim();
  }

  let result = "";
  let temp = num;

  const billions = Math.floor(temp / 1000000000);
  temp %= 1000000000;
  const millions = Math.floor(temp / 1000000);
  temp %= 1000000;
  const thousands = Math.floor(temp / 1000);
  const remaining = temp % 1000;

  if (billions > 0) {
    result += convertLessThanThousand(billions) + " milliard" + (billions > 1 ? "s" : "");
  }

  if (millions > 0) {
    if (result !== "") result += " ";
    result += convertLessThanThousand(millions) + " million" + (millions > 1 ? "s" : "");
  }

  if (thousands > 0) {
    if (result !== "") result += " ";
    if (thousands === 1) {
      result += "mille";
    } else {
      result += convertLessThanThousand(thousands) + " mille";
    }
  }

  if (remaining > 0) {
    if (result !== "") result += " ";
    result += convertLessThanThousand(remaining);
  }

  return result.trim();
}

/**
 * Converts a floor level into ordinal French formatting.
 */
export function convertFloorToFrenchOrdinal(floor: string): string {
  const cleanFloor = floor.trim();
  if (cleanFloor === "0" || cleanFloor.toLowerCase() === "rdr" || cleanFloor === "أرضي" || cleanFloor === "الأرضي") {
    return "rez-de-chaussée";
  }
  const num = parseInt(cleanFloor);
  if (isNaN(num)) return floor;
  if (num === 1) return "premier (1er)";
  return `${num}ème`;
}
