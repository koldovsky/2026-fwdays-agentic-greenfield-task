package md.agentic.jarsplit.domain.linkgen

import md.agentic.jarsplit.domain.jarmatching.Matched

/**
 * Builds send.monobank.ua top-up links (FR-LINK-01). The amount is carried
 * 1:1 in UAH, no unit conversion. sendId sometimes arrives already prefixed
 * with "jar/" (a real API quirk, not a Go-specific artifact) — strip it
 * before rejoining, or every link doubles up as ".../jar/jar/..." and 404s.
 */
object LinkGenerator {
    private const val BASE_URL = "https://send.monobank.ua/jar/"

    fun generate(matched: List<Matched>): List<Link> =
        matched.map { Link(name = it.name, amount = it.amount, url = buildUrl(it.sendId, it.amount)) }

    private fun buildUrl(sendId: String, amount: Int): String {
        val id = sendId.removePrefix("jar/")
        return "$BASE_URL$id?a=$amount"
    }
}
