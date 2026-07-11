package md.agentic.jarsplit.data.monoclient

/**
 * Fatal fetch conditions, mirroring internal/monoclient's sentinel errors
 * (NFR-ANDROID-SEC-01: messages never carry the token value).
 */
sealed class MonoClientException(message: String) : Exception(message) {
    object MissingToken : MonoClientException("MONO token is not set")
    object InvalidToken : MonoClientException("monobank rejected the token (401)")
    object RateLimited : MonoClientException("monobank rate-limited the request (429); retry in ~60s")
    class Unreachable(cause: Throwable? = null) :
        MonoClientException("client-info unreachable: ${cause?.message ?: "network error"}")
}
