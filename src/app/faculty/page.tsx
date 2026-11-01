import { EmptyState, PageShell } from "@/components/ui";

export default function FacultyPage() {
  return (
    <PageShell
      eyebrow="Faculty"
      title="Faculty Dashboard"
      description="View your assigned office and location."
    >
      <EmptyState
        title="Your office details will appear here"
        description="Faculty sign-in and personal office lookup are coming soon."
      />
    </PageShell>
  );
}
