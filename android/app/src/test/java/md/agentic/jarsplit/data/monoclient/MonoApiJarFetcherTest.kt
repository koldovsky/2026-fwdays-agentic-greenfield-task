package md.agentic.jarsplit.data.monoclient

import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

private const val FAKE_TOKEN = "super-secret-token-value"

class MonoApiJarFetcherTest {

    private lateinit var server: MockWebServer

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    private fun fetcher(token: String? = FAKE_TOKEN): MonoApiJarFetcher =
        MonoApiJarFetcher(
            tokenProvider = { token },
            baseUrl = server.url("/personal/client-info").toString(),
        )

    @Test
    fun `success decodes jars and issues exactly one request`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"jars":[{"title":"Заощадження","sendId":"jar/aaa","currencyCode":980}]}""",
            ),
        )

        val jars = fetcher().fetchJars()

        assertEquals(listOf(Jar("Заощадження", "jar/aaa", 980)), jars)
        assertEquals(1, server.requestCount)
        val request = server.takeRequest()
        assertEquals(FAKE_TOKEN, request.getHeader("X-Token"))
    }

    @Test
    fun `401 maps to InvalidToken`() = runTest {
        server.enqueue(MockResponse().setResponseCode(401))
        assertThrowsWithoutToken<MonoClientException.InvalidToken> { fetcher().fetchJars() }
    }

    @Test
    fun `429 maps to RateLimited`() = runTest {
        server.enqueue(MockResponse().setResponseCode(429))
        assertThrowsWithoutToken<MonoClientException.RateLimited> { fetcher().fetchJars() }
    }

    @Test
    fun `malformed JSON on 200 maps to Unreachable`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("not json"))
        assertThrowsWithoutToken<MonoClientException.Unreachable> { fetcher().fetchJars() }
    }

    @Test
    fun `missing token throws MissingToken without issuing a request`() = runTest {
        try {
            fetcher(token = null).fetchJars()
            fail("expected MissingToken")
        } catch (e: MonoClientException.MissingToken) {
            // expected
        }
        assertEquals(0, server.requestCount)
    }

    private suspend inline fun <reified T : MonoClientException> assertThrowsWithoutToken(
        crossinline block: suspend () -> Unit,
    ) {
        try {
            block()
            fail("expected ${T::class.simpleName}")
        } catch (e: MonoClientException) {
            assertTrue("expected ${T::class.simpleName}, got ${e::class.simpleName}", e is T)
            assertFalse("exception message must never contain the token", e.message?.contains(FAKE_TOKEN) ?: false)
        }
    }
}
