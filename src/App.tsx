import './App.css'
import './components/import.css'
import { ImportPanel } from './components/ImportPanel.tsx'
import { GanttView } from './components/GanttView.tsx'

function App() {
  return (
    <>
      <ImportPanel />
      <GanttView />
    </>
  )
}

export default App
