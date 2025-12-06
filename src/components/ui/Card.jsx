import React from 'react';

const Card = ({ children, className = '', onClick }) => {
    return (
        <div
            className={`bg-gray-900 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export default Card;
