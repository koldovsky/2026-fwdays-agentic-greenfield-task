package md.agentic.jarsplit.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Keystore-backed encrypted storage for the monobank token
 * (NFR-ANDROID-SEC-01): never plaintext, never logged. If
 * androidx.security's long-standing alpha status ever becomes a real
 * blocker, the documented fallback (design.md D3) is a hand-rolled
 * AndroidKeyStore + Cipher wrapper around plain SharedPreferences/DataStore.
 */
class EncryptedPrefsTokenStore(context: Context) : TokenStore {

    private val prefs = run {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            PREFS_FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    override fun get(): String? = prefs.getString(KEY_TOKEN, null)

    override fun set(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    override fun clear() {
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    companion object {
        private const val PREFS_FILE_NAME = "jarsplit_secure_prefs"
        private const val KEY_TOKEN = "mono_token"
    }
}
