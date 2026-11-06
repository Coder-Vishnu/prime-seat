export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#0a0a0a] text-neutral-100">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm flex flex-col gap-6 text-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PLF Vacancy Reclamation Stream Active</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Prime <span className="text-sky-400">Seat</span>
        </h1>
        <p className="max-w-xl text-neutral-400 text-sm sm:text-base">
          Next-generation Next.js 15 / React 19 Progressive Web App for AMC Dolby Cinema &amp; IMAX with Laser prime seat reclamation monitoring.
        </p>
      </div>
    </main>
  );
}
