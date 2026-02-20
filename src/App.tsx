import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGate from "./components/RoleGate";
import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import PlatformLayout from "./pages/platform/PlatformLayout";
import TeacherDashboard from "./pages/platform/teacher/TeacherDashboard";
import AvailabilityManager from "./pages/platform/teacher/AvailabilityManager";
import StudentList from "./pages/platform/teacher/StudentList";
import StudentCalendar from "./pages/platform/student/StudentCalendar";
import BookingsList from "./pages/platform/shared/BookingsList";
import BookingSuccess from "./pages/platform/shared/BookingSuccess";
import BookingCancel from "./pages/platform/shared/BookingCancel";
import AdminPage from "./pages/platform/admin/AdminPage";

const PlatformRedirect = () => {
  const { profile, realProfile } = useAuth();
  if (realProfile?.role === "admin" && !profile) return <Navigate to="/app/admin" replace />;
  if (realProfile?.role === "admin" && profile === realProfile) return <Navigate to="/app/admin" replace />;
  const dest = profile?.role === "teacher" ? "/app/dashboard" : "/app/calendar";
  return <Navigate to={dest} replace />;
};

const App = () => {
  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/verify" element={<VerifyEmailPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <PlatformLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PlatformRedirect />} />
          <Route
            path="dashboard"
            element={
              <RoleGate role="teacher">
                <TeacherDashboard />
              </RoleGate>
            }
          />
          <Route
            path="availability"
            element={
              <RoleGate role="teacher">
                <AvailabilityManager />
              </RoleGate>
            }
          />
          <Route
            path="students"
            element={
              <RoleGate role="teacher">
                <StudentList />
              </RoleGate>
            }
          />
          <Route
            path="calendar"
            element={
              <RoleGate role="student">
                <StudentCalendar />
              </RoleGate>
            }
          />
          <Route path="bookings" element={<BookingsList />} />
          <Route path="booking/success" element={<BookingSuccess />} />
          <Route path="booking/cancel" element={<BookingCancel />} />
          <Route
            path="admin"
            element={
              <RoleGate role="admin">
                <AdminPage />
              </RoleGate>
            }
          />
          <Route path="*" element={<PlatformRedirect />} />
        </Route>
      </Routes>
  );
};

export default App;
