// src/components/Common/Button.js
import React from 'react';
import '../../styles/App.css';

const STYLES = ['btn--primary', 'btn--outline', 'btn--secondary'];
const SIZES = ['btn--medium', 'btn--large', 'btn--small'];

const Button = ({
  children,
  type = 'button',
  onClick,
  buttonStyle,
  buttonSize,
  disabled,
  ariaLabel
}) => {
  const checkButtonStyle = STYLES.includes(buttonStyle) ? buttonStyle : STYLES[0];
  const checkButtonSize = SIZES.includes(buttonSize) ? buttonSize : SIZES[1];

  return (
    <button
      className={`btn ${checkButtonStyle} ${checkButtonSize} ${disabled ? 'btn--disabled' : ''}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
    >
      {children}
    </button>
  );
};

export default Button;