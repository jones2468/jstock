interface Props {
  message?: string;
}

export function EmptyState({ message = "No data" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <p className="text-sm">{message}</p>
    </div>
  );
}
