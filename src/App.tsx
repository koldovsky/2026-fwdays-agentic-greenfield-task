import './App.css'
import './components/import.css'
import { ImportPanel } from './components/ImportPanel.tsx'
import { GanttView } from './components/GanttView.tsx'
import { CapacityView } from './components/CapacityView.tsx'

function App() {
  return (
    <>
      <ImportPanel />
      <GanttView />
      <CapacityView />
    </>
  )
}

export default App
