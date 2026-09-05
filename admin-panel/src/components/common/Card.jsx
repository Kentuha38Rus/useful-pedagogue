import React from 'react';

const Card = ({ children, style, ...props }) => {
  return (
    <div
      {...props}
      style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '16px',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default Card;