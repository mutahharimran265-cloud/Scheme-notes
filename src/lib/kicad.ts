import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let cachedCli: string | undefined;
let cachedInstalled: boolean | undefined;

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
 * Whether kicad-cli is actually usable on this host. Serverless environments
 * (Vercel etc.) will always return false — no way to install KiCad there — so
 * the upload path can reject `.kicad_sch` with a clear message instead of a
 * generic failure. Cached: KiCad's presence doesn't change while the app runs.
 */
export function isKicadAvailable(): boolean {
  if (cachedInstalled !== undefined) return cachedInstalled;
  const cli = findKicadCli();
  // If findKicadCli returned an absolute path we verified above that it exists.
  // The bare "kicad-cli" fallback is only usable if PATH contains it — we
  // don't invoke `--version` synchronously here (that would need async), so
  // treat it as "unknown → try it": on Vercel it'll fail and the upload path
  // converts that failure into the friendly message.
  if (cli.includes("/") || cli.includes("\\")) return (cachedInstalled = existsSync(cli));
  return (cachedInstalled = true); // optimistic — let the actual exec surface the truth
}

/**
 * Render the first page of a KiCad schematic to SVG using kicad-cli.
 * Returns the path of the produced SVG. kicad-cli names its output after the
 * schematic's root-sheet name (not the input filename), so we don't try to
 * predict it — we run in an isolated dir and pick whatever .svg turns up.
 */
export async function convertKicadSchToSvg(
  inputPath: string,
  outDir: string,
): Promise<string> {
  const cli = findKicadCli();

  const before = new Set(
    existsSync(outDir)
      ? (await readdir(outDir)).filter((f) => f.toLowerCase().endsWith(".svg"))
      : [],
  );

  await execFileAsync(
    cli,
    ["sch", "export", "svg", "-o", outDir, "--pages", "1", inputPath],
    { timeout: 60_000, windowsHide: true },
  );

  const after = (await readdir(outDir)).filter((f) => f.toLowerCase().endsWith(".svg"));
  const produced = after.find((f) => !before.has(f)) ?? after[0];
  if (!produced) {
    throw new Error("KiCad export did not produce an SVG.");
  }
  return path.join(outDir, produced);
}
