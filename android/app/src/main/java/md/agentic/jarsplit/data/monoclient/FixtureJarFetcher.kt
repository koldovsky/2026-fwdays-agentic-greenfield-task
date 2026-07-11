package md.agentic.jarsplit.data.monoclient

/**
 * Fixed, deterministic jar list — the analog of the Go CLI's
 * MONO_CLIENT_INFO_FILE fixture override. Backs both tests and the
 * always-available in-app "sample data" toggle (FR-ANDROID-CACHE-01 design
 * note: not gated to debug builds, see design.md).
 */
class FixtureJarFetcher(private val jars: List<Jar>) : JarFetcher {
    override suspend fun fetchJars(): List<Jar> = jars

    companion object {
        private const val UAH = 980
        private const val USD = 840

        /** Mirrors the CLI's sample-input.txt scenarios: a clean match, a
         * typo target, an ambiguous pair, and a non-UAH jar. */
        val SAMPLE_JARS = listOf(
            Jar(title = "Заощадження", sendId = "jar/4xR000000000", currencyCode = UAH),
            Jar(title = "Подорожі", sendId = "jar/8kP000000000", currencyCode = UAH),
            Jar(title = "Подушка", sendId = "jar/2wQ000000000", currencyCode = UAH),
            Jar(title = "Подарунки", sendId = "jar/9zN000000000", currencyCode = UAH),
            Jar(title = "Подарунки", sendId = "jar/9zN000000001", currencyCode = UAH),
            Jar(title = "USD заощадження", sendId = "jar/1uS000000000", currencyCode = USD),
        )
    }
}
