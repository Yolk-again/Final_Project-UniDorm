"use client";

import { useRouter } from "next/navigation";

const features = [
  { icon: "⌂", title: "Room booking", description: "Explore rooms and send booking requests without paperwork." },
  { icon: "◷", title: "Clear updates", description: "Keep track of approvals, announcements, and important dates." },
  { icon: "▤", title: "Simple payments", description: "View your bills and stay on top of upcoming due dates." },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-5 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -left-32 top-32 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <header className="animate-ui-in flex items-center justify-between rounded-2xl border border-white/80 bg-white/65 px-5 py-4 shadow-sm backdrop-blur-xl sm:px-7">
          <a href="/" className="flex items-center gap-3" aria-label="UniDorm home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-200">U</span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight text-slate-900">UniDorm</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Smart booking, simple living</span>
            </span>
          </a>
          <nav className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push("/login")} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">Sign in</button>
            <button onClick={() => router.push("/register")} className="ui-button-primary rounded-xl px-4 py-2.5 text-sm font-semibold text-white sm:px-5">Get started <span aria-hidden="true">↗</span></button>
          </nav>
        </header>

        <section className="grid min-h-[calc(100dvh-7rem)] items-center gap-14 py-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:py-16">
          <div className="animate-ui-in relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" />
              A smarter way to live on campus
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.06] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.6rem]">
              Your campus life,
              <span className="mt-2 block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">made simpler.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Find your space, manage your stay, and keep everything in one place. UniDorm brings the essential parts of dorm living into one clear, connected experience.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => router.push("/register")} className="ui-button-primary inline-flex items-center justify-center gap-3 rounded-2xl px-7 py-4 text-sm font-bold text-white">
                Create your account <span className="text-lg">→</span>
              </button>
              <button onClick={() => router.push("/login")} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-7 py-4 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-white">
                I already have an account
              </button>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-slate-200/80 pt-7">
              <div><p className="text-2xl font-black tracking-tight text-slate-900">24/7</p><p className="mt-1 text-xs font-medium text-slate-500">Access to updates</p></div>
              <div className="h-9 w-px bg-slate-200" />
              <div><p className="text-2xl font-black tracking-tight text-slate-900">One</p><p className="mt-1 text-xs font-medium text-slate-500">Connected platform</p></div>
              <div className="h-9 w-px bg-slate-200" />
              <div><p className="text-2xl font-black tracking-tight text-slate-900">Easy</p><p className="mt-1 text-xs font-medium text-slate-500">Dorm management</p></div>
            </div>
          </div>

          <div className="animate-ui-in-delay relative mx-auto w-full max-w-xl">
            <div className="animate-ui-float absolute -right-5 -top-7 h-28 w-28 rounded-[2rem] bg-gradient-to-br from-blue-400/30 to-indigo-400/10 blur-xl" />
            <div className="ui-glass relative rounded-[2rem] p-5 sm:rounded-[2.5rem] sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Your overview</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">Everything in its place</h2>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-xl text-blue-600">✦</div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="ui-card rounded-2xl p-4">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Room status</span><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>
                  <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">Live</p>
                  <p className="mt-1 text-xs text-slate-500">Booking updates</p>
                </div>
                <div className="ui-card rounded-2xl p-4">
                  <span className="text-xs font-semibold text-slate-500">Stay organized</span>
                  <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">All-in-one</p>
                  <p className="mt-1 text-xs text-slate-500">Bills and notices</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-semibold text-blue-200">THE UNI DORM EXPERIENCE</p><p className="mt-2 text-lg font-bold">A better way to feel at home.</p></div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-2xl">⌂</span>
                </div>
                <div className="mt-5 flex gap-1.5"><span className="h-1.5 w-10 rounded-full bg-blue-400" /><span className="h-1.5 w-5 rounded-full bg-white/25" /><span className="h-1.5 w-5 rounded-full bg-white/25" /></div>
              </div>

              <div className="mt-5 space-y-3">
                {features.map((feature, index) => (
                  <div key={feature.title} className="ui-card flex items-center gap-4 rounded-2xl p-4" style={{ animationDelay: `${index * 100}ms` }}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-xl font-semibold text-blue-600">{feature.icon}</span>
                    <div className="min-w-0"><p className="font-bold text-slate-900">{feature.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{feature.description}</p></div>
                    <span className="ml-auto text-slate-300">↗</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-7 -left-7 -z-10 h-36 w-36 rounded-full bg-indigo-300/30 blur-3xl" />
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-slate-200/80 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} UniDorm. Smart booking, simple living.</p>
          <p>Built to make dorm life feel a little simpler.</p>
        </footer>
      </div>
    </main>
  );
}
