export function convertToFrenchWords(amount: number): string {
  if (!amount || amount === 0) return "zéro dinar algérien";

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix"];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    let res = "";

    if (n >= 100) {
      const hundredDigits = Math.floor(n / 100);
      if (hundredDigits === 1) {
        res += "cent";
      } else {
        res += units[hundredDigits] + " cent";
        if (n % 100 === 0) res += "s";
      }
      n %= 100;
      if (n > 0) res += " ";
    }

    if (n >= 10 && n < 20) {
      res += teens[n - 10];
    } else if (n >= 20) {
      const tenDigit = Math.floor(n / 10);
      const unitDigit = n % 10;
      
      if (tenDigit === 7) {
        if (unitDigit === 1) {
          res += "soixante et onze";
        } else {
          res += "soixante-" + teens[unitDigit];
        }
      } else if (tenDigit === 9) {
        res += "quatre-vingt-" + teens[unitDigit];
      } else {
        res += tens[tenDigit];
        if (unitDigit > 0) {
          if (unitDigit === 1) {
            res += " et un";
          } else {
            res += "-" + units[unitDigit];
          }
        }
      }
    } else if (n > 0) {
      res += units[n];
    }

    return res;
  }

  function process(n: number): string {
    if (n === 0) return "";
    
    if (n >= 1000000000) {
      const billions = Math.floor(n / 1000000000);
      const rest = n % 1000000000;
      const bStr = convertLessThanThousand(billions) + " milliard" + (billions > 1 ? "s" : "");
      return bStr + (rest > 0 ? " " + process(rest) : "");
    }
    
    if (n >= 1000000) {
      const millions = Math.floor(n / 1000000);
      const rest = n % 1000000;
      const mStr = convertLessThanThousand(millions) + " million" + (millions > 1 ? "s" : "");
      return mStr + (rest > 0 ? " " + process(rest) : "");
    }

    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      const rest = n % 1000;
      let tStr = "";
      if (thousands === 1) {
        tStr = "mille";
      } else {
        tStr = convertLessThanThousand(thousands) + " mille";
      }
      return tStr + (rest > 0 ? " " + process(rest) : "");
    }

    return convertLessThanThousand(n);
  }

  try {
    const wordStr = process(amount).replace(/\s+/g, " ").trim();
    return wordStr.charAt(0).toUpperCase() + wordStr.slice(1);
  } catch (error) {
    return amount.toLocaleString();
  }
}

export function convertFloorToFrenchOrdinal(floor: string): string {
  const floorMap: Record<string, string> = {
    "RDC": "Rez-de-chaussée (RDC)",
    "0": "Rez-de-chaussée (0)",
    "1": "1er étage",
    "2": "2ème étage",
    "3": "3ème étage",
    "4": "4ème étage",
    "5": "5ème étage",
    "6": "6ème étage",
    "7": "7ème étage",
    "8": "8ème étage",
    "9": "9ème étage",
    "10": "10ème étage"
  };

  return floorMap[floor] || `${floor}ème étage`;
}
