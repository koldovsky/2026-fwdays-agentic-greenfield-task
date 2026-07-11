package md.agentic.jarsplit.domain.jarmatching

import md.agentic.jarsplit.data.monoclient.Jar
import md.agentic.jarsplit.domain.planvalidation.PlanEntry

/**
 * Resolves validated plan entries against fetched jars: exact
 * case-insensitive title match, UAH-only eligibility (FR-RESOLVE-01..04,
 * FR-CURRENCY-01). Pure, no I/O. This is the BC-SAFE-01-critical piece: a
 * match is only ever emitted when it is exact and unambiguous among UAH
 * jars, never guessed.
 */
object JarMatcher {
    private const val UAH_CURRENCY_CODE = 980

    fun match(entries: List<PlanEntry>, jars: List<Jar>): Pair<List<Matched>, List<MatchWarning>> {
        val matched = mutableListOf<Matched>()
        val warnings = mutableListOf<MatchWarning>()
        val availableUahTitles = jars.filter { it.currencyCode == UAH_CURRENCY_CODE }.map { it.title }

        for (entry in entries) {
            val allMatches = jars.filter { it.title.equals(entry.name, ignoreCase = true) }
            if (allMatches.isEmpty()) {
                warnings.add(MatchWarning.Unknown(entry.name, entry.amount, availableUahTitles))
                continue
            }

            val uahMatches = allMatches.filter { it.currencyCode == UAH_CURRENCY_CODE }
            when {
                uahMatches.isEmpty() -> warnings.add(MatchWarning.NonUAH(entry.name, entry.amount))
                uahMatches.size > 1 -> warnings.add(MatchWarning.Ambiguous(entry.name, entry.amount))
                else -> matched.add(Matched(entry.name, entry.amount, uahMatches.single().sendId))
            }
        }

        return matched to warnings
    }
}
