import { Planner } from "@/app/components/planner/Planner";

/**
 * Home — the Prokhidnyi planner. Renders inside the global shell (header,
 * deadline banner, disclaimer — see layout.tsx). The planner is a client
 * island; everything below the fold recomputes live from the applicant's
 * profile (score-input → scoring-engine → recommendations / comparison /
 * shortlist).
 */
export default function Home() {
  return (
    <>
      <section style={{ marginBottom: "var(--pk-space-6)", maxWidth: "44rem" }}>
        <p className="pk-label">Куди я вступлю</p>
        <h1 className="pk-h2">Оціни свої шанси на бюджет</h1>
        <p className="pk-body" style={{ marginTop: "var(--pk-space-3)" }}>
          Введи бали НМТ і пільги — і побач реалістичний список програм із чесною
          оцінкою шансу, діапазоном невизначеності та порівнянням. Це заміна
          ручному аналізу в Excel.
        </p>
      </section>
      <Planner />
    </>
  );
}
