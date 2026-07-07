import { Modal } from '@ds/components/feedback/Modal.jsx';
import { ListRow } from '@ds/components/core/ListRow.jsx';
import type { ClientSessionState } from '../data/useDeviceSession.ts';
import type { InputCatalogueEntry, SamsungInputKey } from '../data/inputs.ts';

export interface InputsModalProps {
  open: boolean;
  onClose: () => void;
  state: ClientSessionState;
  inputs: readonly InputCatalogueEntry[];
  setInput: (key: SamsungInputKey) => Promise<void>;
}

export function InputsModal({ open, onClose, state, inputs, setInput }: InputsModalProps) {
  const isConnected = state === 'Connected';

  function handleRowClick(entry: InputCatalogueEntry): void {
    void setInput(entry.id)
      .catch(() => {
        /* useInputs already logged; toast lives in error-surfacing (C9) */
      })
      .finally(() => {
        onClose();
      });
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose input">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {inputs.map((entry) => (
          <ListRow
            key={entry.id}
            label={entry.label}
            disabled={!isConnected}
            onClick={() => handleRowClick(entry)}
          />
        ))}
      </div>
    </Modal>
  );
}
