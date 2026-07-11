package md.agentic.jarsplit.domain.planvalidation

/**
 * Row-scoped form validation (FR-ANDROID-INPUT-02): positive whole-UAH
 * amount tolerant of internal whitespace as a thousands separator
 * (FR-AMOUNT-01's rule), non-empty name, and duplicate-name detection by
 * case-insensitive equality on the trimmed name — a deliberate divergence
 * from the CLI's byte-exact FR-DUP-01, decided at the change's human gate
 * (see design.md D6): a phone keyboard makes a case-only duplicate a more
 * plausible accident, and jar matching already treats those two names as
 * the same jar.
 */
object PlanValidator {

    fun validate(rows: List<PlanRow>): Pair<List<PlanEntry>, List<PlanValidationWarning>> {
        val warnings = mutableListOf<PlanValidationWarning>()
        val candidates = mutableListOf<Candidate>()

        for (row in rows) {
            val name = row.name.trim()
            if (name.isEmpty()) {
                warnings.add(PlanValidationWarning.EmptyName(row.id))
                continue
            }
            val amount = parseAmount(row.amountText)
            if (amount == null) {
                warnings.add(PlanValidationWarning.InvalidAmount(row.id, name, row.amountText))
                continue
            }
            candidates.add(Candidate(row.id, name, amount))
        }

        val entries = mutableListOf<PlanEntry>()
        for (group in candidates.groupBy { it.name.lowercase() }.values) {
            if (group.size > 1) {
                warnings.add(PlanValidationWarning.DuplicateName(group.first().name, group.map { it.rowId }))
            } else {
                val candidate = group.single()
                entries.add(PlanEntry(candidate.name, candidate.amount))
            }
        }

        return entries to warnings
    }

    private fun parseAmount(raw: String): Int? {
        val stripped = raw.filterNot { it.isWhitespace() }
        if (stripped.isEmpty() || !stripped.all { it.isDigit() }) return null
        val value = stripped.toIntOrNull() ?: return null
        return value.takeIf { it > 0 }
    }

    private data class Candidate(val rowId: Long, val name: String, val amount: Int)
}
