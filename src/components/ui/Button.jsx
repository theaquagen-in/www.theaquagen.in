// shadcn-like Button
export default function Button({ className = "", ...props }) {
  return (
    <button
      className={
        "inline-flex items-center justify-center whitespace-nowrap rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors " +
        "bg-black text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black " +
        "disabled:pointer-events-none disabled:opacity-50 " +
        className
      }
      {...props}
    />
  );
}