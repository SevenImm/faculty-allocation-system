/**
 * Readable labels for database values, shared by the pages
 * (dashboard filters, edit forms, history).
 */

export const RANK_LABELS: Record<string, string> = {
  FULL: "Full Professor",
  ASSOCIATE: "Associate Professor",
  ASSISTANT: "Assistant Professor",
  INSTRUCTIONAL_FULL: "Instructional Full Professor",
  INSTRUCTIONAL_ASSOCIATE: "Instructional Associate Professor",
  INSTRUCTIONAL_ASSISTANT: "Instructional Assistant Professor",
  SENIOR_LECTURER: "Senior Lecturer",
  LECTURER_INSTRUCTOR: "Lecturer / Instructor",
  VISITING_INSTRUCTIONAL_ASSISTANT: "Visiting Instructional Assistant Professor",
  VISITING_LECTURER: "Visiting Lecturer",
  VISITING_ASSISTANT: "Visiting Assistant Professor",
};

export const TENURE_LABELS: Record<string, string> = {
  TENURED: "Tenured",
  TENURE_TRACK: "Tenure Track",
  FIXED_TERM: "Fixed Term",
};

export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  UNAVAILABLE: "Unavailable",
};

export const SPACE_LABELS: Record<string, string> = {
  OFFICE: "Office",
  CUBICLE: "Cubicle",
};
