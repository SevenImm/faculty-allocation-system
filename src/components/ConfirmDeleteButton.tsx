"use client";

// A submit button that asks "are you sure?" first.
// Used for deleting faculty and offices.
export default function ConfirmDeleteButton({
  name,
  label = "Delete Faculty",
  warning = "This also removes their office assignments.",
}: {
  name: string;
  label?: string;
  warning?: string;
}) {
  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-lg border border-transparent bg-white px-3 py-[calc(--spacing(1.5)-1px)] text-sm font-medium whitespace-nowrap text-maroon shadow-sm ring-1 ring-maroon/25 hover:bg-maroon-50"
      onClick={(event) => {
        const ok = window.confirm(`Delete ${name}? ${warning}`);
        if (!ok) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
