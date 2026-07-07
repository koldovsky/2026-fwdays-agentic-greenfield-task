import './App.css'
import './components/import.css'
import { ImportPanel } from './components/ImportPanel.tsx'
import { OrderDashboard } from './components/OrderDashboard.tsx'
import { MaterialCheck } from './components/MaterialCheck.tsx'
import { GanttView } from './components/GanttView.tsx'
import { CapacityView } from './components/CapacityView.tsx'

function App() {
  return (
    <>
      <ImportPanel />
      <OrderDashboard />
      <MaterialCheck />
      <GanttView />
      <CapacityView />
    </>
  )
}

export default App
