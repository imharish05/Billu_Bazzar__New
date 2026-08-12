import React from 'react';

const Switch = ({ checked, onChange, id, className, disabled }) => {
  if (disabled) return null;
  return (
    <label className={`switch cursor-pointer ${className || ''}`}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange && onChange(e.target.checked)}
        id={id}
      />
      <span className="slider" />
    </label>
  );
};

export default Switch;
