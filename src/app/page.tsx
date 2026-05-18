export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--surface)] text-[var(--ink)]">
      <section className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
        <div className="absolute inset-x-6 top-12 h-px bg-linear-to-r from-transparent via-[var(--line)] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-16 left-0 h-80 w-80 rounded-full bg-amber-300/15 blur-3xl" />
        <p className="relative text-sm font-semibold uppercase tracking-[0.48em] text-cyan-300">
          Auto Delivery
        </p>
        <h1 className="relative mt-5 max-w-2xl text-5xl font-black tracking-[-0.06em] text-white sm:text-7xl">
          卡密兑换
        </h1>
        <p className="relative mt-6 max-w-xl text-lg leading-8 text-slate-300">
          输入卡密后领取对应货物。当前页面是项目骨架，后续任务会接入完整兑换流程。
        </p>
      </section>
    </main>
  );
}
