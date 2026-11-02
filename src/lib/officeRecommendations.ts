

type OfficeInfo = {
  id: number;
  building: string;
  roomNumber: string;
  status: string;
  capacity: number;
  spaceType: string;
  hasWindow: boolean;
};



type AllocationInfo = {
  officeId: number;
  endedAt: unknown;
};


// Buildings approved for each department.
// This mapping must be confirmed before using it for real assignments.

export const DEPARTMENT_BUILDINGS: Record<string, string[]> = {
  "Biology & Chemistry": ["LBV", "PLG"],
  Engineering: ["LBV", "PLG"],
  "Fine & Performing Arts": ["FPA"],
  Humanities: ["AIC", "PLG"],
  "Mathematics & Physics": ["LBV", "PLG"],
  "Psychology & Communication": ["AIC", "PLG"],
  "School of First Year Experiences": ["PLG"],
  "Social Sciences": ["AIC", "PLG"],
};


// Find offices that have room and belong to approved buildings.
export function getRecommendedOffices(
  departmentName: string,
  offices: OfficeInfo[],
  allocations: AllocationInfo[]
) {
  
const normalizedDepartment = departmentName
  .trim()
  .replace(/^Department of\s+/i, "");

const approvedBuildings =
  DEPARTMENT_BUILDINGS[normalizedDepartment] ?? [];


  const activeAllocations = allocations.filter(
    (allocation) => allocation.endedAt === null
  );

  return offices.filter((office) => {
    // Only consider offices in approved department buildings.
    if (!approvedBuildings.includes(office.building)) {
      return false;
    }

    // Exclude reserved or unavailable offices.
    if (office.status !== "AVAILABLE") {
      return false;
    }

    // Count current occupants.
    const occupants = activeAllocations.filter(
      (allocation) => allocation.officeId === office.id
    ).length;

    return occupants < office.capacity;
  });
}

type FacultyPriorityInfo = {
  facultyRank: string;
  tenureStatus: string;
};

// Priority values: smaller number = higher priority.
const FACULTY_PRIORITY: Record<string, number> = {
  TENURED_FULL: 1,
  TENURED_ASSOCIATE: 2,
  TENURE_TRACK_ASSISTANT: 3,
  FIXED_TERM_INSTRUCTIONAL_FULL: 4,
  FIXED_TERM_INSTRUCTIONAL_ASSOCIATE: 5,
  FIXED_TERM_INSTRUCTIONAL_ASSISTANT: 6,
  FIXED_TERM_SENIOR_LECTURER: 7,
  FIXED_TERM_LECTURER_INSTRUCTOR: 8,
  FIXED_TERM_VISITING_INSTRUCTIONAL_ASSISTANT: 9,
  FIXED_TERM_VISITING_LECTURER: 10,
};

// Returns a faculty member's assignment priority.
// null means their rank/tenure combination needs review.
export function getFacultyPriority(
  faculty: FacultyPriorityInfo
): number | null {
  const key = `${faculty.tenureStatus}_${faculty.facultyRank}`;

  return FACULTY_PRIORITY[key] ?? null;
}
