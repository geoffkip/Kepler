import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import StrainDetails from './pages/StrainDetails';
import RecoveryDetails from './pages/RecoveryDetails';
import SleepDetails from './pages/SleepDetails';
import Trends from './pages/Trends';
import HealthMonitor from './pages/HealthMonitor';
import Activities from './pages/Activities';
import Journal from './pages/Journal';
import Report from './pages/Report';
import Settings from './pages/Settings';
import { getAccessToken } from './services/auth';
import PrivateRoute from './components/auth/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/strain"
          element={
            <PrivateRoute>
              <StrainDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/recovery"
          element={
            <PrivateRoute>
              <RecoveryDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/sleep"
          element={
            <PrivateRoute>
              <SleepDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <PrivateRoute>
              <Trends />
            </PrivateRoute>
          }
        />
        <Route
          path="/health"
          element={
            <PrivateRoute>
              <HealthMonitor />
            </PrivateRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <PrivateRoute>
              <Activities />
            </PrivateRoute>
          }
        />
        <Route
          path="/journal"
          element={
            <PrivateRoute>
              <Journal />
            </PrivateRoute>
          }
        />
        <Route
          path="/report"
          element={
            <PrivateRoute>
              <Report />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
