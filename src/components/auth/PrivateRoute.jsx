import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAccessToken } from '../../services/auth';

const PrivateRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(null); // null = loading

    React.useEffect(() => {
        const checkAuth = async () => {
            const token = await getAccessToken();
            setIsAuthenticated(!!token);
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return <div className="flex h-screen items-center justify-center bg-black text-white">Loading...</div>;
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
