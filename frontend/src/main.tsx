import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import './index.css'
// delibra design system (full component library + tokens); imported last so it is
// the authoritative look. Pages are being migrated to its classes incrementally.
import './delibra.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
