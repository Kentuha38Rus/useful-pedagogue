import React from 'react';

const Input = ({ className = '', ...props }) => {
  return (
    <input
      {...props}
      className={`input${className ? ` ${className}` : ''}`}
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