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
      className="border p-2 font-semibold text-red-600"
      onClick={(event) => {
        const ok = window.confirm(`Delete ${name}? ${warning}`);
        if (!ok) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
