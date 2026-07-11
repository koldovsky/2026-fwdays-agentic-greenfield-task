package md.agentic.jarsplit.domain.planvalidation

/** A validated plan row, ready for matching. */
data class PlanEntry(
    val name: String,
    val amount: Int,
)
