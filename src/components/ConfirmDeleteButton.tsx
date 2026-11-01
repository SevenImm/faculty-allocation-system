"use client";

export default function ConfirmDeleteButton({ name }: { name: string }) {
  return (
    <button
      type="submit"
      className="border p-2 font-semibold text-red-600"
      onClick={(event) => {
        const ok = window.confirm(
          `Delete ${name}? This also removes their office assignments.`
        );
        if (!ok) event.preventDefault();
      }}
    >
      Delete Faculty
    </button>
  );
}