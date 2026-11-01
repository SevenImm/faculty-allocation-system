/**
 * Import Spreadsheet Page
 *
 * Lets the administrator upload the master spreadsheet
 * ("Current Faculty Office Spaces") and add any offices, faculty and
 * current assignments that are not in the system yet.
 *
 * Existing records are never duplicated or overwritten.
 */

import { ButtonLink, PageShell } from "@/components/ui";
import ImportForm from "./ImportForm";

export default function ImportPage() {
  return (
    <PageShell
      eyebrow="Admin · Data"
      title="Import Spreadsheet"
      description="Upload the Current Faculty Office Spaces file (.xlsx). Press Preview to see what will be added, then Import to save it. Only records that are missing are added; nothing already in the system is changed."
      actions={
        <ButtonLink href="/admin" variant="secondary">
          Back to Dashboard
        </ButtonLink>
      }
    >
      <ImportForm />
    </PageShell>
  );
}
