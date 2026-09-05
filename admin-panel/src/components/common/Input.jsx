import React from 'react';

const Input = ({ ...props }) => {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
        ...props.style,
      }}
    />
  );
};

export default Input;