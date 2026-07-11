package md.agentic.jarsplit.domain.planvalidation

sealed class PlanValidationWarning {
    data class EmptyName(val rowId: Long) : PlanValidationWarning()
    data class InvalidAmount(val rowId: Long, val name: String, val rawAmount: String) : PlanValidationWarning()
    data class DuplicateName(val name: String, val rowIds: List<Long>) : PlanValidationWarning()
}
