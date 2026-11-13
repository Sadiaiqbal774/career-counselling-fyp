import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ScholarshipFinder from './pages/ScholarshipFinder';
import UniversityRecommender from './pages/UniversityRecommender';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ModernLanding from './pages/ModernLanding';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import GeneralQuiz from './pages/GeneralQuiz';
import SpecificQuiz from './pages/SpecificQuiz';
import Result from './pages/Result';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';

function AppLayout() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<ModernLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/university-recommender" element={<UniversityRecommender />} />
            <Route path="/scholarships" element={<ScholarshipFinder />} />
            <Route path="/quiz" element={<GeneralQuiz />} />
            <Route path="/general-quiz" element={<GeneralQuiz />} />
            <Route path="/specific-quiz" element={<SpecificQuiz />} />
            <Route path="/result" element={<Result />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;