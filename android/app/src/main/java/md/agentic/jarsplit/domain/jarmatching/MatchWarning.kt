package md.agentic.jarsplit.domain.jarmatching

sealed class MatchWarning {
    abstract val name: String
    abstract val amount: Int

    data class Unknown(
        override val name: String,
        override val amount: Int,
        val availableNames: List<String>,
    ) : MatchWarning()

    data class NonUAH(override val name: String, override val amount: Int) : MatchWarning()
    data class Ambiguous(override val name: String, override val amount: Int) : MatchWarning()
}
