import React from 'react';

const Switch = ({ checked, onChange, id, className, disabled }) => {
  return (
    <label className={`switch cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e)}
        id={id}
      />
      <span className="slider" />
    </label>
  );
};

export default Switch;
