function sha256(str: string): string {
  function rotateRight(n: number, x: number) {
    return (x >>> n) | (x << (32 - n));
  }
  
  const buffer = new TextEncoder().encode(str);
  const words = new Uint32Array(64);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);
  
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const len = buffer.length;
  // pad length safely
  const paddingLen = (120 - (len % 64)) % 64 || 64;
  const padded = new Uint8Array(len + paddingLen + 8);
  padded.set(buffer);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, len * 8);

  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      words[j] = view.getUint32(i + j * 4);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotateRight(7, words[j-15]) ^ rotateRight(18, words[j-15]) ^ (words[j-15] >>> 3);
      const s1 = rotateRight(17, words[j-2]) ^ rotateRight(19, words[j-2]) ^ (words[j-2] >>> 10);
      words[j] = (words[j-16] + s0 + words[j-7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h0] = h;
    for (let j = 0; j < 64; j++) {
      const S1 = rotateRight(6, e) ^ rotateRight(11, e) ^ rotateRight(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h0 + S1 + ch + k[j] + words[j]) | 0;
      const S0 = rotateRight(2, a) ^ rotateRight(13, a) ^ rotateRight(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h0 = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + h0) | 0;
  }

  return Array.from(h).map(v => v.toString(16).padStart(8, '0')).join('');
}

export interface ContractDataInput {
  price: number;
  clientId: string;
}

export function generateReference(
  projectCode: string,
  manualClientNum: string,
  contractData: ContractDataInput
): {
  projectCode: string;
  manualClientNum: string;
  dateCode: string;
  hash: string;
  combined: string;
} {
  // Ensure projectCode is upper case and sliced/formatted cleanly
  // If empty, default to "PRJ"
  let cleanProj = (projectCode || "PRJ").trim().toUpperCase();
  if (cleanProj.length < 3) {
    cleanProj = cleanProj.padEnd(3, "X");
  } else {
    cleanProj = cleanProj.substring(0, 3);
  }

  // Handle client num - keep it clean and Alphanumeric
  let cleanClient = (manualClientNum || "000").trim().replace(/\s+/g, "").toUpperCase();
  if (!cleanClient) {
    cleanClient = "000";
  }

  // Date code: MMYY
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).substring(2);
  const dateCode = `${month}${year}`;

  // Encrypt contractData: price and clientId with SHA-256
  const dataString = `${contractData.price || 0}-${(contractData.clientId || "000").trim()}`;
  const fullHash = sha256(dataString);

  // Generate 4 characters (numbers and uppercase letters only)
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let shortHash = "";
  for (let i = 0; i < 4; i++) {
    const chunk = fullHash.substring(i * 8, (i + 1) * 8);
    const val = parseInt(chunk, 16);
    shortHash += alphabet[val % 36];
  }

  const combined = `${cleanProj}${cleanClient}${dateCode}${shortHash}`;

  return {
    projectCode: cleanProj,
    manualClientNum: cleanClient,
    dateCode,
    hash: shortHash,
    combined
  };
}
