import React from 'react';

const Button = ({ children, variant = 'primary', ...props }) => {
  const styles = {
    primary: { backgroundColor: '#4A90E2', color: 'white' },
    danger: { backgroundColor: '#E74C3C', color: 'white' },
    default: { backgroundColor: '#eee', color: '#333' },
  };
  const style = styles[variant] || styles.default;

  return (
    <button
      {...props}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        ...style,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
};

export default Button;