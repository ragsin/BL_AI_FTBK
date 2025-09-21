

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { Role } from './types';

import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import UserProfilePage from './pages/admin/UserProfilePage';
import ProgramsPage from './pages/admin/ProgramsPage';
import EnrollmentsPage from './pages/admin/EnrollmentsPage';
import SchedulePage from './pages/admin/SchedulePage';
import ReportsPage from './pages/admin/ReportsPage';
import RevenuePage from './pages/admin/RevenuePage';
import SettingsPage from './pages/admin/SettingsPage';
import AssetsPage from './pages/admin/AssetsPage';
import AssetReportsPage from './pages/admin/AssetReportsPage';
import LoginPage from './pages/LoginPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import TeacherSchedulePage from './pages/teacher/TeacherSchedulePage';
import MyStudentsPage from './pages/teacher/MyStudentsPage';
import ParentLayout from './layouts/ParentLayout';
import ParentDashboardPage from './pages/parent/ParentDashboardPage';
import StudentLayout from './layouts/StudentLayout';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentSchedulePage from './pages/student/StudentSchedulePage';
import StudentAssignmentsPage from './pages/student/StudentAssignmentsPage';
import StudentLearningJourneyPage from './pages/student/StudentLearningJourneyPage';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from './components/Toast';
import CurriculumBuilderPage from './pages/admin/CurriculumBuilderPage';
import ProfilePage from './pages/ProfilePage';
import Tour from './components/Tour';
import MyAssetsPage from './pages/teacher/MyAssetsPage';
import MyAvailabilityPage from './pages/teacher/MyAvailabilityPage';
import ProgramDetailsPage from './pages/admin/ProgramDetailsPage';
import TeacherProgramsPage from './pages/teacher/ProgramsPage';
import TeacherMessagesPage from './pages/teacher/TeacherMessagesPage';
import ParentCreditsPage from './pages/parent/ParentCreditsPage';
import ParentSchedulePage from './pages/parent/ParentSchedulePage';
import ParentAssignmentsPage from './pages/parent/ParentAssignmentsPage';
import ParentLearningJourneyPage from './pages/parent/ParentLearningJourneyPage';
import ParentMessagesPage from './pages/parent/ParentMessagesPage';
import CommunicationPage from './pages/admin/CommunicationPage';
import ParentReportsPage from './pages/parent/ParentReportsPage';
import GradingQueuePage from './pages/teacher/GradingQueuePage';
import AtRiskStudentsPage from './pages/teacher/AtRiskStudentsPage';
import StudentMessagesPage from './pages/student/StudentMessagesPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import StudentLeaderboardPage from './pages/student/StudentLeaderboardPage';
import ChangelogModal from './components/ChangelogModal';
import { useChangelog } from './contexts/ChangelogContext';

function App() {
  const { user } = useAuth();
  const { isChangelogOpen, closeChangelog } = useChangelog();

  const getRedirectPath = () => {
    if (!user) return "/login";
    switch (user.role) {
      case Role.ADMIN:
      case Role.FINANCE:
      case Role.SCHEDULER:
      case Role.SALES:
        return "/admin/dashboard";
      case Role.TEACHER:
        return "/teacher/dashboard";
      case Role.PARENT:
        return "/parent/dashboard";
      case Role.STUDENT:
        return "/student/dashboard";
      default:
        return "/login";
    }
  };

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        
        <Route path="/admin" element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.FINANCE, Role.SCHEDULER, Role.SALES]}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserProfilePage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="programs/:programId" element={<ProgramDetailsPage />} />
          <Route path="programs/:programId/curriculum" element={<CurriculumBuilderPage />} />
          <Route path="enrollments" element={<EnrollmentsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="communication" element={<CommunicationPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="assets/reports" element={<AssetReportsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/teacher" element={<ProtectedRoute allowedRoles={[Role.TEACHER]}><TeacherLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboardPage />} />
            <Route path="schedule" element={<TeacherSchedulePage />} />
            <Route path="students" element={<MyStudentsPage />} />
            <Route path="grading" element={<GradingQueuePage />} />
            <Route path="at-risk" element={<AtRiskStudentsPage />} />
            <Route path="programs" element={<TeacherProgramsPage />} />
            <Route path="programs/:programId" element={<ProgramDetailsPage />} />
            <Route path="assets" element={<MyAssetsPage />} />
            <Route path="availability" element={<MyAvailabilityPage />} />
            <Route path="messages" element={<TeacherMessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/parent" element={<ProtectedRoute allowedRoles={[Role.PARENT]}><ParentLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboardPage />} />
            <Route path="credits" element={<ParentCreditsPage />} />
            <Route path="schedule" element={<ParentSchedulePage />} />
            <Route path="assignments" element={<ParentAssignmentsPage />} />
            <Route path="journey" element={<ParentLearningJourneyPage />} />
            <Route path="messages" element={<ParentMessagesPage />} />
            <Route path="reports" element={<ParentReportsPage />} />
            <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/student" element={<ProtectedRoute allowedRoles={[Role.STUDENT]}><StudentLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboardPage />} />
            <Route path="schedule" element={<StudentSchedulePage />} />
            <Route path="assignments" element={<StudentAssignmentsPage />} />
            <Route path="journey" element={<StudentLearningJourneyPage />} />
            <Route path="leaderboard" element={<StudentLeaderboardPage />} />
            <Route path="messages" element={<StudentMessagesPage />} />
            <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/" element={<Navigate to={getRedirectPath()} replace />} />
      </Routes>
      <ToastContainer />
      <Tour />
      <ChangelogModal isOpen={isChangelogOpen} onClose={closeChangelog} />
    </ThemeProvider>
  );
}

export default App;