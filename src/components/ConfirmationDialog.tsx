import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog">
        <p>{message}</p>
        <div className="confirmation-dialog-actions">
          <button onClick={onConfirm} className="confirm-btn">Так</button>
          <button onClick={onCancel} className="cancel-btn">Скасувати</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog; 