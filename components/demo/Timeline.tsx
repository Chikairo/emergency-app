export function DemoTimeline({
  events,
}: {
  events: { id: string; at: string; kind: string; label: string; actor: string }[];
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-label="Demo timeline">
      <h2 className="text-2xl font-bold">Timeline</h2>
      {events.length === 0 ? (
        <p className="mt-2 text-lg text-zinc-600">No events yet.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-lg">
              <span className="font-mono text-base text-zinc-500">
                {new Date(e.at).toLocaleTimeString()}
              </span>
              <span>{e.label}</span>
              <span className="rounded-full bg-zinc-100 px-2 text-sm font-semibold text-zinc-600">
                {e.actor}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
