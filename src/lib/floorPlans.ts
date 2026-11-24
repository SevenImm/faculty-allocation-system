/**
 * Floor plan images for the "Find My Office" card on the Faculty Portal.
 *
 * No floor plans are included yet. To add one, put an image in
 * public/floorplans/ named after the building and floor, for example:
 *
 *   public/floorplans/PLG-2.png     (Pellegrino Hall, 2nd floor)
 *   public/floorplans/AIC-3.svg     (Academic Innovation Center, 3rd floor)
 *
 * Accepted formats: .svg, .png, .jpg, .jpeg, .webp. The Faculty Portal
 * picks the image up automatically; until then it shows a placeholder.
 */

import { existsSync } from "node:fs";
import path from "node:path";

const EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".webp"];

/** Public URL of the floor plan for this building and floor, or null if none exists yet. */
export function findFloorPlan(building: string | null, floor: number | null): string | null {
  if (!building || floor === null || floor === undefined) return null;

  // Only letters and digits, so a building name can never point outside the folder.
  const safeBuilding = building.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!safeBuilding) return null;

  for (const extension of EXTENSIONS) {
    const file = `${safeBuilding}-${floor}${extension}`;
    if (existsSync(path.join(process.cwd(), "public", "floorplans", file))) {
      return `/floorplans/${file}`;
    }
  }
  return null;
}
