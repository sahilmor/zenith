export function SectionHeader({
  title,
  description,
}: Readonly<{ title: string; description?: string }>) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
    </div>
  );
}
