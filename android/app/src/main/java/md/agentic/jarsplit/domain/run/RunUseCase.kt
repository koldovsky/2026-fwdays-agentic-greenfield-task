package md.agentic.jarsplit.domain.run

import md.agentic.jarsplit.data.monoclient.JarFetcher
import md.agentic.jarsplit.data.monoclient.MonoClientException
import md.agentic.jarsplit.domain.jarmatching.JarMatcher
import md.agentic.jarsplit.domain.linkgen.LinkGenerator
import md.agentic.jarsplit.domain.planvalidation.PlanRow
import md.agentic.jarsplit.domain.planvalidation.PlanValidator

/**
 * The one orchestration class, mirroring cmd/jarsplit/run.go's ordering:
 * validate rows before any network call (FR-FAIL-01's spirit), fetch once,
 * match, generate links, then classify into Complete/Partial/Fatal — the UI
 * analog of exit codes 0/1/2 (FR-ANDROID-RESULT-01).
 */
class RunUseCase(private val jarFetcher: JarFetcher) {

    suspend fun run(rows: List<PlanRow>): RunOutcome {
        val (entries, validationWarnings) = PlanValidator.validate(rows)
        if (entries.isEmpty()) {
            return RunOutcome.Fatal(FatalReason.NoValidEntries)
        }

        val jars = try {
            jarFetcher.fetchJars()
        } catch (e: MonoClientException) {
            return RunOutcome.Fatal(e.toFatalReason())
        }

        val (matched, matchWarnings) = JarMatcher.match(entries, jars)
        val warnings: List<UiWarning> =
            validationWarnings.map { UiWarning.Validation(it) } + matchWarnings.map { UiWarning.Matching(it) }

        if (matched.isEmpty()) {
            return RunOutcome.Fatal(FatalReason.NothingMatched(warnings))
        }

        val links = LinkGenerator.generate(matched)
        val total = links.sumOf { it.amount }
        val skippedTotal = matchWarnings.sumOf { it.amount }
        val skippedCount = matchWarnings.size

        val result = RunResult(
            links = links,
            total = total,
            warnings = warnings,
            skippedTotal = skippedTotal,
            skippedCount = skippedCount,
        )

        return if (warnings.isEmpty()) RunOutcome.Complete(result) else RunOutcome.Partial(result)
    }

    private fun MonoClientException.toFatalReason(): FatalReason = when (this) {
        is MonoClientException.MissingToken -> FatalReason.MissingToken
        is MonoClientException.InvalidToken -> FatalReason.InvalidToken
        is MonoClientException.RateLimited -> FatalReason.RateLimited
        is MonoClientException.Unreachable -> FatalReason.Unreachable(message ?: "unreachable")
    }
}
