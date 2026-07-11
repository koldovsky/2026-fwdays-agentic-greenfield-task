package md.agentic.jarsplit.domain.jarmatching

import md.agentic.jarsplit.data.monoclient.Jar
import md.agentic.jarsplit.domain.planvalidation.PlanEntry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private const val UAH = 980
private const val USD = 840

class JarMatcherTest {

    private val jars = listOf(
        Jar(title = "Заощадження", sendId = "jar/aaa", currencyCode = UAH),
        Jar(title = "Подорожі", sendId = "jar/bbb", currencyCode = UAH),
        Jar(title = "Подарунки", sendId = "jar/ccc", currencyCode = UAH),
        Jar(title = "Подарунки", sendId = "jar/ddd", currencyCode = UAH),
        Jar(title = "USD only", sendId = "jar/eee", currencyCode = USD),
    )

    @Test
    fun `case-insensitive exact match resolves`() {
        val (matched, warnings) = JarMatcher.match(listOf(PlanEntry("заощадження", 1000)), jars)
        assertEquals(listOf(Matched("заощадження", 1000, "jar/aaa")), matched)
        assertTrue(warnings.isEmpty())
    }

    @Test
    fun `unknown name lists available UAH titles`() {
        val (matched, warnings) = JarMatcher.match(listOf(PlanEntry("Немає такої", 500)), jars)
        assertTrue(matched.isEmpty())
        val warning = warnings.single() as MatchWarning.Unknown
        assertEquals("Немає такої", warning.name)
        assertTrue(warning.availableNames.containsAll(listOf("Заощадження", "Подорожі", "Подарунки")))
    }

    @Test
    fun `non-UAH match is a distinct warning from unknown`() {
        val (matched, warnings) = JarMatcher.match(listOf(PlanEntry("USD only", 100)), jars)
        assertTrue(matched.isEmpty())
        assertTrue(warnings.single() is MatchWarning.NonUAH)
    }

    @Test
    fun `ambiguous UAH match is skipped`() {
        val (matched, warnings) = JarMatcher.match(listOf(PlanEntry("Подарунки", 200)), jars)
        assertTrue(matched.isEmpty())
        assertTrue(warnings.single() is MatchWarning.Ambiguous)
    }

    @Test
    fun `plan order is preserved`() {
        val entries = listOf(PlanEntry("Подорожі", 1), PlanEntry("Заощадження", 2))
        val (matched, _) = JarMatcher.match(entries, jars)
        assertEquals(listOf("Подорожі", "Заощадження"), matched.map { it.name })
    }

    @Test
    fun `mixed matched and skipped entries`() {
        val entries = listOf(
            PlanEntry("Заощадження", 1000),
            PlanEntry("typo", 500),
            PlanEntry("USD only", 300),
        )
        val (matched, warnings) = JarMatcher.match(entries, jars)
        assertEquals(1, matched.size)
        assertEquals(2, warnings.size)
    }
}
