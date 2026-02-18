import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import LandingPage from "./pages/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGate from "./components/RoleGate";
import { useAuth } from "./contexts/AuthContext";

// Lazy-loaded pages (not needed for landing page)
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const PlatformLayout = lazy(() => import("./pages/platform/PlatformLayout"));
const TeacherDashboard = lazy(() => import("./pages/platform/teacher/TeacherDashboard"));
const AvailabilityManager = lazy(() => import("./pages/platform/teacher/AvailabilityManager"));
const StudentList = lazy(() => import("./pages/platform/teacher/StudentList"));
const StudentCalendar = lazy(() => import("./pages/platform/student/StudentCalendar"));
const BookingsList = lazy(() => import("./pages/platform/shared/BookingsList"));
const BookingSuccess = lazy(() => import("./pages/platform/shared/BookingSuccess"));
const BookingCancel = lazy(() => import("./pages/platform/shared/BookingCancel"));

const Loading = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    <CircularProgress />
  </Box>
);

const PlatformRedirect = () => {
  const { profile } = useAuth();
  const dest = profile?.role === "teacher" ? "/app/dashboard" : "/app/calendar";
  return <Navigate to={dest} replace />;
};

const App = () => {
  return (
    <Suspense fallback={<Loading />}>
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
          <Route path="*" element={<PlatformRedirect />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
