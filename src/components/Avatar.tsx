import { initials, colorForName } from "@/lib/format";

export default function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: colorForName(name),
        fontSize: Math.round(size * 0.4),
      }}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
