import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAccessToken } from '../../services/auth';

const PrivateRoute = ({ children }) => {
    const token = getAccessToken();
    return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
