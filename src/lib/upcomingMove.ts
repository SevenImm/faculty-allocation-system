/**
 * Upcoming office move for a faculty member.
 *
 * Faculty should only learn about a move once it is final, so this will
 * read from the approved allocation proposals (Admin -> Dean -> Provost)
 * when that feature exists. Until then there is nothing approved to show
 * and the Faculty Portal displays "No upcoming office changes".
 */

export type UpcomingMove = {
  building: string;
  roomNumber: string;
  effectiveDate: string; // ISO date, e.g. "2027-01-05"
};

export async function getUpcomingMove(facultyId: number): Promise<UpcomingMove | null> {
  void facultyId; // will be used to find this member's approved move
  // TODO: return the move from the latest Provost-approved proposal.
  return null;
}
