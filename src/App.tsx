import './App.css'
import './components/import.css'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ImportPanel } from './components/ImportPanel.tsx'
import { OverviewDashboard } from './components/OverviewDashboard.tsx'
import { ScenarioCompare } from './components/ScenarioCompare.tsx'
import { OrderDashboard } from './components/OrderDashboard.tsx'
import { MaterialCheck } from './components/MaterialCheck.tsx'
import { GanttView } from './components/GanttView.tsx'
import { CapacityView } from './components/CapacityView.tsx'
import { ExportPanel } from './components/ExportPanel.tsx'

function App() {
  return (
    <>
      <ErrorBoundary name="Імпорт даних">
        <ImportPanel />
      </ErrorBoundary>
      <ErrorBoundary name="Дашборд">
        <OverviewDashboard />
      </ErrorBoundary>
      <ErrorBoundary name="Порівняння варіантів">
        <ScenarioCompare />
      </ErrorBoundary>
      <div id="view-orders">
        <ErrorBoundary name="Замовлення">
          <OrderDashboard />
        </ErrorBoundary>
      </div>
      <div id="view-materials">
        <ErrorBoundary name="Матеріали">
          <MaterialCheck />
        </ErrorBoundary>
      </div>
      <div id="view-gantt">
        <ErrorBoundary name="Діаграма Гантта">
          <GanttView />
        </ErrorBoundary>
      </div>
      <div id="view-capacity">
        <ErrorBoundary name="Завантаженість РЦ">
          <CapacityView />
        </ErrorBoundary>
      </div>
      <ErrorBoundary name="Експорт">
        <ExportPanel />
      </ErrorBoundary>
    </>
  )
}

export default App
