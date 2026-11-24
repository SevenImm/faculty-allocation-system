/**
 * Official TAMIU building names, by the abbreviation used for offices.
 *
 * Source: TAMIU campus map (tamiu.edu/map.shtml) and the TAMIU style
 * guide's list of approved building abbreviations.
 */

export const BUILDING_NAMES: Record<string, string> = {
  AIC: "Academic Innovation Center",
  ANX: "Annex Building",
  BLK: "Bob Bullock Hall",
  CHS: "Clinical Health Sciences Center",
  CNS: "Dr. F.M. Canseco Hall",
  CWT: "Dr. Billy F. Cowart Hall",
  ECHS: "Hector J. Garcia Early College High School",
  FPA: "Center for the Fine and Performing Arts",
  KCB: "Kinesiology-Convocation Building",
  KLM: "Sue and Radcliffe Killam Library",
  LBV: "Lamar Bruni Vergara Science Center",
  PLA: "Lamar Bruni Vergara Planetarium",
  PLG: "Anthony J. and Georgia A. Pellegrino Hall",
  REC: "Kinesiology, Wellness and Recreation Center",
  STC: "Student Center",
  UPD: "University Police Department",
  WHT: "Western Hemispheric Trade Center",
  ZSC: "Senator Judith Zaffirini Student Success Center",
};

/** Full name of a building, or null if the abbreviation is not in the list. */
export function buildingName(code: string | null | undefined): string | null {
  if (!code) return null;
  return BUILDING_NAMES[code.trim().toUpperCase()] ?? null;
}
