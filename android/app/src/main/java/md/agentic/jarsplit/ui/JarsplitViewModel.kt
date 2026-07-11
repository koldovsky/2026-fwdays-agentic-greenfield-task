package md.agentic.jarsplit.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import md.agentic.jarsplit.AppContainer
import md.agentic.jarsplit.domain.planvalidation.PlanRow
import md.agentic.jarsplit.domain.planvalidation.PlanValidationWarning
import md.agentic.jarsplit.domain.planvalidation.PlanValidator
import md.agentic.jarsplit.domain.run.RunOutcome

/**
 * One shared, Activity-scoped ViewModel behind all three screens — this is
 * a small enough app (three thin screens over one RunOutcome) that separate
 * per-screen ViewModels would just add wiring without benefit; see
 * design.md D4's no-DI-framework rationale, which applies here too.
 */
class JarsplitViewModel(private val container: AppContainer) : ViewModel() {

    private val _tokenSet = MutableStateFlow(container.tokenStore.get() != null)
    val tokenSet: StateFlow<Boolean> = _tokenSet.asStateFlow()

    private val _useSampleData = MutableStateFlow(container.useSampleData)
    val useSampleData: StateFlow<Boolean> = _useSampleData.asStateFlow()

    private val _planRows = MutableStateFlow(listOf(PlanRow(id = 0L, name = "", amountText = "")))
    val planRows: StateFlow<List<PlanRow>> = _planRows.asStateFlow()

    private val _rowWarnings = MutableStateFlow<List<PlanValidationWarning>>(emptyList())
    val rowWarnings: StateFlow<List<PlanValidationWarning>> = _rowWarnings.asStateFlow()

    private val _jarSuggestions = MutableStateFlow<List<String>>(emptyList())
    val jarSuggestions: StateFlow<List<String>> = _jarSuggestions.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _runOutcome = MutableStateFlow<RunOutcome?>(null)
    val runOutcome: StateFlow<RunOutcome?> = _runOutcome.asStateFlow()

    private var nextRowId = 1L

    fun setToken(token: String) {
        container.tokenStore.set(token)
        _tokenSet.value = true
    }

    fun clearToken() {
        container.tokenStore.clear()
        _tokenSet.value = false
    }

    fun setUseSampleData(enabled: Boolean) {
        container.useSampleData = enabled
        _useSampleData.value = enabled
        _jarSuggestions.value = emptyList()
    }

    fun addRow() {
        _planRows.value = _planRows.value + PlanRow(id = nextRowId++, name = "", amountText = "")
        revalidateRows()
    }

    fun removeRow(rowId: Long) {
        _planRows.value = _planRows.value.filterNot { it.id == rowId }
        revalidateRows()
    }

    fun updateRow(rowId: Long, name: String? = null, amountText: String? = null) {
        _planRows.value = _planRows.value.map { row ->
            if (row.id != rowId) row else row.copy(
                name = name ?: row.name,
                amountText = amountText ?: row.amountText,
            )
        }
        revalidateRows()
    }

    private fun revalidateRows() {
        _rowWarnings.value = PlanValidator.validate(_planRows.value).second
    }

    /** Suggestion-only session cache (FR-ANDROID-CACHE-01). Never used as a
     * substitute for the fresh fetch-and-match [generate] always performs. */
    fun refreshJarSuggestions() {
        viewModelScope.launch {
            runCatching { container.jarFetcher().fetchJars() }
                .onSuccess { jars -> _jarSuggestions.value = jars.map { it.title } }
        }
    }

    /**
     * Suspend, awaited directly by the caller (not launched internally) so
     * the UI can navigate to Results only after this completes — avoids a
     * LaunchedEffect keyed on [runOutcome] re-firing on back-navigation.
     */
    suspend fun generate() {
        if (_isLoading.value) return
        _isLoading.value = true
        _runOutcome.value = container.runUseCase().run(_planRows.value)
        _isLoading.value = false
    }
}

class JarsplitViewModelFactory(private val container: AppContainer) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return JarsplitViewModel(container) as T
    }
}
