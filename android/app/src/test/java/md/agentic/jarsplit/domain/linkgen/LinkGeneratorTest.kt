package md.agentic.jarsplit.domain.linkgen

import md.agentic.jarsplit.domain.jarmatching.Matched
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class LinkGeneratorTest {

    @Test
    fun `builds exact URL shape`() {
        val links = LinkGenerator.generate(listOf(Matched("Заощадження", 5000, "4xRabc")))
        assertEquals("https://send.monobank.ua/jar/4xRabc?a=5000", links.single().url)
    }

    @Test
    fun `sendId with jar prefix is not doubled`() {
        val links = LinkGenerator.generate(listOf(Matched("Заощадження", 3000, "jar/5x3KgGN3es")))
        assertEquals("https://send.monobank.ua/jar/5x3KgGN3es?a=3000", links.single().url)
    }

    @Test
    fun `amount is not scaled to kopiykas`() {
        val links = LinkGenerator.generate(listOf(Matched("x", 1, "id")))
        assertEquals("https://send.monobank.ua/jar/id?a=1", links.single().url)
    }

    @Test
    fun `link contains no token or extra params`() {
        val url = LinkGenerator.generate(listOf(Matched("x", 42, "id"))).single().url
        assertFalse(url.contains("token", ignoreCase = true))
        assertEquals(1, url.count { it == '?' })
    }

    @Test
    fun `order is preserved`() {
        val matched = listOf(Matched("b", 1, "idb"), Matched("a", 2, "ida"))
        val links = LinkGenerator.generate(matched)
        assertEquals(listOf("b", "a"), links.map { it.name })
    }
}
