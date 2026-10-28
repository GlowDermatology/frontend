import { encode } from "uqr";

/**
 * The personal QR token (`GD1:` + 22 characters, contract §2.9.3) as one SVG
 * path: a module per dark cell, merged into horizontal runs so the path stays
 * short. ECC level M survives a scratched phone screen; a 4-module quiet zone
 * is what cashier scanners expect. Pure; unit-tested.
 */
export interface QrDrawing {
  size: number;
  path: string;
}

export function qrDrawing(text: string, quietZone = 4): QrDrawing {
  const { data, size } = encode(text, { ecc: "M", border: 0 });
  const parts: string[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = data[y] ?? [];
    let x = 0;
    while (x < size) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < size && row[x + run]) run += 1;
      parts.push(`M${x + quietZone} ${y + quietZone}h${run}v1h-${run}z`);
      x += run;
    }
  }
  return { size: size + quietZone * 2, path: parts.join("") };
}
