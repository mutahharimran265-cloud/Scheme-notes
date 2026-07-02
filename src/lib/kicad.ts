import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let cachedCli: string | undefined;

/**
 * Locate the `kicad-cli` binary:
 *   1. the KICAD_CLI env override,
 *   2. standard Windows install locations (newest major version first),
 *   3. fall back to PATH (typical on Linux/macOS).
 */
export function findKicadCli(): string {
  if (cachedCli !== undefined) return cachedCli;

  const override = process.env.KICAD_CLI?.trim();
  if (override && existsSync(override)) return (cachedCli = override);

  const roots = ["C:/Program Files/KiCad", "C:/Program Files (x86)/KiCad"];
  for (let major = 16; major >= 6; major--) {
    for (const root of roots) {
      const bin = `${root}/${major}.0/bin/kicad-cli.exe`;
      if (existsSync(bin)) return (cachedCli = bin);
    }
  }

  return (cachedCli = "kicad-cli");
}

/**
 * Render the first page of a KiCad schematic to SVG using kicad-cli.
 * Returns the path of the produced SVG (named after the input's basename).
 */
export async function convertKicadSchToSvg(
  inputPath: string,
  outDir: string,
): Promise<string> {
  const cli = findKicadCli();
  const base = path.basename(inputPath).replace(/\.kicad_sch$/i, "");

  await execFileAsync(
    cli,
    ["sch", "export", "svg", "-o", outDir, "--pages", "1", inputPath],
    { timeout: 60_000, windowsHide: true },
  );

  const out = path.join(outDir, `${base}.svg`);
  if (!existsSync(out)) {
    throw new Error("KiCad export did not produce an SVG.");
  }
  return out;
}
