package md.agentic.jarsplit.domain.run

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import md.agentic.jarsplit.data.monoclient.ClientInfoDto
import md.agentic.jarsplit.data.monoclient.FixtureJarFetcher
import md.agentic.jarsplit.data.monoclient.Jar
import md.agentic.jarsplit.data.monoclient.JarFetcher
import md.agentic.jarsplit.data.monoclient.MonoClientException
import md.agentic.jarsplit.domain.planvalidation.PlanRow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Same JSON shape as the Go CLI's MONO_CLIENT_INFO_FILE fixture. */
private fun loadSampleJars(): List<Jar> {
    val text = object {}.javaClass.getResourceAsStream("/fixtures/client-info-sample.json")!!
        .bufferedReader().readText()
    val dto = Json { ignoreUnknownKeys = true }.decodeFromString(ClientInfoDto.serializer(), text)
    return dto.jars.map { Jar(it.title, it.sendId, it.currencyCode) }
}

private class ThrowingJarFetcher(private val exception: MonoClientException) : JarFetcher {
    override suspend fun fetchJars(): List<Jar> = throw exception
}

class RunUseCaseTest {

    private val jars = loadSampleJars()

    private fun rows(vararg pairs: Pair<String, String>) =
        pairs.mapIndexed { i, (name, amount) -> PlanRow(i.toLong(), name, amount) }

    @Test
    fun `all matched with no warnings is Complete`() = runTest {
        val useCase = RunUseCase(FixtureJarFetcher(jars))
        val outcome = useCase.run(rows("Заощадження" to "1000", "Подорожі" to "500"))

        val complete = outcome as RunOutcome.Complete
        assertEquals(2, complete.result.links.size)
        assertEquals(1500, complete.result.total)
        assertTrue(complete.result.warnings.isEmpty())
    }

    @Test
    fun `mixed matched and skipped rows is Partial`() = runTest {
        val useCase = RunUseCase(FixtureJarFetcher(jars))
        val outcome = useCase.run(rows("Заощадження" to "1000", "typo jar" to "200"))

        val partial = outcome as RunOutcome.Partial
        assertEquals(1, partial.result.links.size)
        assertEquals(1, partial.result.warnings.size)
    }

    @Test
    fun `zero matched despite a successful fetch is Fatal NothingMatched`() = runTest {
        val useCase = RunUseCase(FixtureJarFetcher(jars))
        val outcome = useCase.run(rows("no such jar" to "100"))

        val fatal = (outcome as RunOutcome.Fatal).reason
        assertTrue(fatal is FatalReason.NothingMatched)
    }

    @Test
    fun `zero valid rows is Fatal NoValidEntries before any fetch`() = runTest {
        var fetchCalled = false
        val fetcher = object : JarFetcher {
            override suspend fun fetchJars(): List<Jar> {
                fetchCalled = true
                return jars
            }
        }
        val outcome = RunUseCase(fetcher).run(rows("" to "-1"))

        assertEquals(RunOutcome.Fatal(FatalReason.NoValidEntries), outcome)
        assertTrue("fetch must not run before validation (FR-FAIL-01 spirit)", !fetchCalled)
    }

    @Test
    fun `missing token maps to Fatal MissingToken`() = runTest {
        val outcome = RunUseCase(ThrowingJarFetcher(MonoClientException.MissingToken)).run(rows("x" to "1"))
        assertEquals(RunOutcome.Fatal(FatalReason.MissingToken), outcome)
    }

    @Test
    fun `invalid token maps to Fatal InvalidToken`() = runTest {
        val outcome = RunUseCase(ThrowingJarFetcher(MonoClientException.InvalidToken)).run(rows("x" to "1"))
        assertEquals(RunOutcome.Fatal(FatalReason.InvalidToken), outcome)
    }

    @Test
    fun `rate limited maps to Fatal RateLimited`() = runTest {
        val outcome = RunUseCase(ThrowingJarFetcher(MonoClientException.RateLimited)).run(rows("x" to "1"))
        assertEquals(RunOutcome.Fatal(FatalReason.RateLimited), outcome)
    }

    @Test
    fun `unreachable maps to Fatal Unreachable`() = runTest {
        val outcome = RunUseCase(ThrowingJarFetcher(MonoClientException.Unreachable())).run(rows("x" to "1"))
        assertTrue((outcome as RunOutcome.Fatal).reason is FatalReason.Unreachable)
    }
}
