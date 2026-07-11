package md.agentic.jarsplit

import android.app.Application
import android.content.Context
import md.agentic.jarsplit.data.monoclient.FixtureJarFetcher
import md.agentic.jarsplit.data.monoclient.JarFetcher
import md.agentic.jarsplit.data.monoclient.MonoApiJarFetcher
import md.agentic.jarsplit.domain.run.RunUseCase
import md.agentic.jarsplit.security.EncryptedPrefsTokenStore
import md.agentic.jarsplit.security.TokenStore

/**
 * Manual dependency wiring (design.md D4): no DI framework, a handful of
 * objects is simpler to read and maintain at this scale.
 */
class AppContainer(context: Context) {
    val tokenStore: TokenStore = EncryptedPrefsTokenStore(context.applicationContext)

    /** Always-available "sample data" toggle, not gated to debug builds
     * (design.md, resolved at the human gate) — this is a personal,
     * single-user app with no third-party release-distribution risk. */
    var useSampleData: Boolean = false

    fun jarFetcher(): JarFetcher =
        if (useSampleData) {
            FixtureJarFetcher(FixtureJarFetcher.SAMPLE_JARS)
        } else {
            MonoApiJarFetcher(tokenProvider = { tokenStore.get() })
        }

    fun runUseCase(): RunUseCase = RunUseCase(jarFetcher())
}

class JarsplitApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
