/**
 * Skeleton loading placeholders — layout-approximating pulse boxes per variant.
 */
export default function SkeletonLoader({
  variant,
}: {
  variant: "lobby" | "join" | "game" | "whatami";
}) {
  const pulse = "animate-pulse bg-gray-200 rounded-lg";

  if (variant === "lobby") {
    return (
      <div className="h-screen overflow-y-auto py-6 px-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-center relative">
            <div className={`${pulse} h-6 w-16 absolute left-0`} />
            <div className={`${pulse} h-9 w-52`} />
            <div className="flex gap-2 ml-3">
              <div className={`${pulse} h-6 w-24 rounded-full`} />
              <div className={`${pulse} h-6 w-14 rounded-full`} />
            </div>
          </div>

          {/* Room code + invite bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`${pulse} h-8 w-20 rounded-full`} />
              <div className={`${pulse} h-8 w-40`} />
              <div className={`${pulse} h-8 w-9`} />
            </div>
            <div className={`${pulse} h-11 w-40 rounded-2xl`} />
          </div>

          {/* Two-column grid: players + settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Players card */}
            <div className="bg-white/80 rounded-3xl shadow-xl p-4 sm:p-6 space-y-3">
              <div className={`${pulse} h-6 w-28`} />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`${pulse} h-10 w-10 rounded-full`} />
                  <div className={`${pulse} h-5 flex-1`} />
                </div>
              ))}
            </div>
            {/* Settings card */}
            <div className="bg-white/80 rounded-3xl shadow-xl p-4 sm:p-6 space-y-4">
              <div className={`${pulse} h-6 w-32`} />
              <div className={`${pulse} h-10 w-full`} />
              <div className={`${pulse} h-10 w-full`} />
              <div className={`${pulse} h-10 w-full`} />
              <div className={`${pulse} h-10 w-3/4`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "join") {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className={`${pulse} h-10 w-40 mx-auto`} />
          <div className={`${pulse} h-14 w-full`} />
          <div className={`${pulse} h-14 w-full`} />
          <div className={`${pulse} h-12 w-full`} />
        </div>
      </div>
    );
  }

  if (variant === "whatami") {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-6">
          <div className={`${pulse} h-10 w-56 mx-auto`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${pulse} h-32 w-full`} />
            ))}
          </div>
          <div className={`${pulse} h-12 w-full max-w-sm mx-auto`} />
        </div>
      </div>
    );
  }

  // variant === "game"
  return (
    <div className="h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className={`${pulse} h-8 w-40 mx-auto`} />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(16)].map((_, i) => (
            <div key={i} className={`${pulse} h-12 w-full`} />
          ))}
        </div>
        <div className={`${pulse} h-10 w-full max-w-xs mx-auto`} />
      </div>
    </div>
  );
}
