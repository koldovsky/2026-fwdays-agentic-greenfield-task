package md.agentic.jarsplit.domain.planvalidation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PlanValidatorTest {

    @Test
    fun `valid row produces an entry`() {
        val (entries, warnings) = PlanValidator.validate(listOf(PlanRow(1, "Заощадження", "5000")))
        assertEquals(listOf(PlanEntry("Заощадження", 5000)), entries)
        assertTrue(warnings.isEmpty())
    }

    @Test
    fun `thousands-separator whitespace is tolerated`() {
        val (entries, _) = PlanValidator.validate(listOf(PlanRow(1, "x", "12 000")))
        assertEquals(12000, entries.single().amount)
    }

    @Test
    fun `negative, zero, decimal and non-numeric amounts are invalid`() {
        listOf("-5", "0", "12.50", "abc", "").forEach { raw ->
            val (entries, warnings) = PlanValidator.validate(listOf(PlanRow(1, "x", raw)))
            assertTrue("amount '$raw' should be invalid", entries.isEmpty())
            assertTrue(warnings.single() is PlanValidationWarning.InvalidAmount)
        }
    }

    @Test
    fun `empty name is flagged and excluded`() {
        val (entries, warnings) = PlanValidator.validate(listOf(PlanRow(1, "   ", "100")))
        assertTrue(entries.isEmpty())
        assertTrue(warnings.single() is PlanValidationWarning.EmptyName)
    }

    @Test
    fun `byte-identical duplicate names are both flagged`() {
        val rows = listOf(PlanRow(1, "Заощадження", "100"), PlanRow(2, "Заощадження", "200"))
        val (entries, warnings) = PlanValidator.validate(rows)
        assertTrue(entries.isEmpty())
        val warning = warnings.single() as PlanValidationWarning.DuplicateName
        assertEquals(listOf(1L, 2L), warning.rowIds.sorted())
    }

    @Test
    fun `case-only duplicate names are flagged, not treated as distinct`() {
        val rows = listOf(PlanRow(1, "Заощадження", "100"), PlanRow(2, "заощадження", "200"))
        val (entries, warnings) = PlanValidator.validate(rows)
        assertTrue(entries.isEmpty())
        assertTrue(warnings.single() is PlanValidationWarning.DuplicateName)
    }

    @Test
    fun `other valid rows are unaffected by one invalid row`() {
        val rows = listOf(PlanRow(1, "Good", "100"), PlanRow(2, "Bad", "-1"))
        val (entries, warnings) = PlanValidator.validate(rows)
        assertEquals(listOf(PlanEntry("Good", 100)), entries)
        assertEquals(1, warnings.size)
    }
}
