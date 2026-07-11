package md.agentic.jarsplit.data.monoclient

import kotlinx.serialization.Serializable

/**
 * Mirrors the client-info JSON body shape (TC-SCHEMA-01): only jars[].title/
 * sendId/currencyCode are consumed; every other field is ignored.
 */
@Serializable
data class ClientInfoDto(
    val jars: List<JarDto> = emptyList(),
)

@Serializable
data class JarDto(
    val title: String,
    val sendId: String,
    val currencyCode: Int,
)
