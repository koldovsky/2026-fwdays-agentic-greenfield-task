// Bottom-left undo notification (DESIGN §8, FR-NOTIF-01) for the composed session log.
// A NEW Stats-owned component modeled on the Timer page's undo notice (not imported from
// it — cross-slice boundary). The 5s auto-dismiss + applyUndo wiring lives in StatsPage.
import { IconUndo } from './icons'

export default function UndoNotice({
  message,
  onUndo,
}: {
  message: string
  onUndo: () => void
}) {
  return (
    <div className="undo-toast" role="status">
      <span className="undo-message">{message}</span>
      <button type="button" className="undo-btn" onClick={onUndo}>
        <IconUndo />
        Undo
      </button>
    </div>
  )
}
