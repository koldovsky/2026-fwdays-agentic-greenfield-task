package md.agentic.jarsplit.security

interface TokenStore {
    fun get(): String?
    fun set(token: String)
    fun clear()
}
