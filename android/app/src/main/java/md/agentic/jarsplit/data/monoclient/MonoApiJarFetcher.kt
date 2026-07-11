package md.agentic.jarsplit.data.monoclient

import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request

/**
 * Live client-info fetcher. One call per invocation, no retry (FR-FAIL-02):
 * 401 -> InvalidToken, 429 -> RateLimited, anything else non-2xx or a
 * transport failure -> Unreachable. The token is read once per call via
 * [tokenProvider] and never appears in any exception message (NFR-ANDROID-SEC-01).
 */
class MonoApiJarFetcher(
    private val tokenProvider: () -> String?,
    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .callTimeout(10, TimeUnit.SECONDS)
        .build(),
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val baseUrl: String = CLIENT_INFO_URL,
) : JarFetcher {

    override suspend fun fetchJars(): List<Jar> = withContext(Dispatchers.IO) {
        val token = tokenProvider() ?: throw MonoClientException.MissingToken

        val request = Request.Builder()
            .url(baseUrl)
            .header("X-Token", token)
            .get()
            .build()

        val response = try {
            httpClient.newCall(request).execute()
        } catch (e: IOException) {
            throw MonoClientException.Unreachable(e)
        }

        response.use {
            when (it.code) {
                200 -> {
                    val body = it.body?.string() ?: throw MonoClientException.Unreachable()
                    decodeJars(body)
                }
                401 -> throw MonoClientException.InvalidToken
                429 -> throw MonoClientException.RateLimited
                else -> throw MonoClientException.Unreachable()
            }
        }
    }

    private fun decodeJars(body: String): List<Jar> {
        val dto = try {
            json.decodeFromString(ClientInfoDto.serializer(), body)
        } catch (e: SerializationException) {
            throw MonoClientException.Unreachable(e)
        }
        return dto.jars.map { Jar(title = it.title, sendId = it.sendId, currencyCode = it.currencyCode) }
    }

    companion object {
        const val CLIENT_INFO_URL = "https://api.monobank.ua/personal/client-info"
    }
}
