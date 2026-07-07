import './App.css'
import './components/import.css'
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
      <ImportPanel />
      <OverviewDashboard />
      <ScenarioCompare />
      <div id="view-orders">
        <OrderDashboard />
      </div>
      <div id="view-materials">
        <MaterialCheck />
      </div>
      <div id="view-gantt">
        <GanttView />
      </div>
      <div id="view-capacity">
        <CapacityView />
      </div>
      <ExportPanel />
    </>
  )
}

export default App
