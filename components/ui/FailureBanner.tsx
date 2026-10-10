export function FailureBanner({
  title,
  detail,
  actionLabel,
  actionHref,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div role="alert" className="rounded-xl border-2 border-[#B45309] bg-amber-50 p-5">
      <p className="text-xl font-bold text-amber-900">⚠ {title}</p>
      <p className="mt-1 text-lg leading-7 text-amber-900">{detail}</p>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-3 inline-flex min-h-[48px] items-center rounded-xl bg-amber-900 px-5 text-lg font-semibold text-white"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
