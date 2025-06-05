import React from 'react';

interface AddHardwareButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

const AddHardwareButton: React.FC<AddHardwareButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      type="button"
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: '#fff',
        color: '#646cff',
        border: '2px solid #646cff',
        fontWeight: 600,
        fontSize: 16,
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginTop: 12,
        width: '100%',
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={onClick}
      disabled={disabled}
    >
      ДОБАВИТЬ ФУРНИТУРУ
    </button>
  );
};

export default AddHardwareButton; 