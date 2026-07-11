package md.agentic.jarsplit.data.monoclient

/** Throws a [MonoClientException] subtype on any fatal condition. */
interface JarFetcher {
    suspend fun fetchJars(): List<Jar>
}
