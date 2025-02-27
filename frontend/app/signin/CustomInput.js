import React from 'react';

const CustomInput = ({ label, type, value, onChange, error, required }) => {
    return (
        <div className="mb-3">
            <label className="mb-1 d-block text-start">{label}</label>
            <input
                type={type}
                className="form-control"
                style={{
                    backgroundColor: '#D9D9D9',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'black',
                    textAlign: 'left',
                    height: '48px',
                }}
                value={value}
                onChange={onChange}
                required={required}
            />
            {error && <p className="text-danger">{error}</p>}
        </div>
    );
};

export default CustomInput;