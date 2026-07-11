package md.agentic.jarsplit.domain.planvalidation

/** Raw form-row UI state; [id] is a stable per-row key (e.g. a LazyColumn item key). */
data class PlanRow(
    val id: Long,
    val name: String,
    val amountText: String,
)
