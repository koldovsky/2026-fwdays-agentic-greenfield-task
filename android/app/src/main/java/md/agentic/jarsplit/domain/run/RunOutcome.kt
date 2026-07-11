package md.agentic.jarsplit.domain.run

import md.agentic.jarsplit.domain.jarmatching.MatchWarning
import md.agentic.jarsplit.domain.linkgen.Link
import md.agentic.jarsplit.domain.planvalidation.PlanValidationWarning

sealed class UiWarning {
    data class Validation(val warning: PlanValidationWarning) : UiWarning()
    data class Matching(val warning: MatchWarning) : UiWarning()
}

data class RunResult(
    val links: List<Link>,
    val total: Int,
    val warnings: List<UiWarning>,
    val skippedTotal: Int,
    val skippedCount: Int,
)

sealed class FatalReason {
    object MissingToken : FatalReason()
    object InvalidToken : FatalReason()
    object RateLimited : FatalReason()
    data class Unreachable(val detail: String) : FatalReason()
    object NoValidEntries : FatalReason()
    data class NothingMatched(val warnings: List<UiWarning>) : FatalReason()
}

/** The UI analog of the CLI's exit codes 0/1/2 (FR-ANDROID-RESULT-01). */
sealed class RunOutcome {
    data class Complete(val result: RunResult) : RunOutcome()
    data class Partial(val result: RunResult) : RunOutcome()
    data class Fatal(val reason: FatalReason) : RunOutcome()
}
