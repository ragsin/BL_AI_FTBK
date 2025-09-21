import React from 'react';

export enum Role {
  ADMIN = 'Admin',
  TEACHER = 'Teacher',
  PARENT = 'Parent',
  STUDENT = 'Student',
  FINANCE = 'Finance',
  SCHEDULER = 'Scheduler',
  SALES = 'Sales',
}

export enum UserStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  avatar: string;
  lastLogin: string;
  dateAdded: string;
  parentId?: string;
  childrenIds?: string[];
  timezone?: string;
  dob?: string; // YYYY-MM-DD
  
  // Role-specific
  payRate?: number; // Teacher
  documents?: { id: string; name: string; url: string }[]; // Teacher
  performanceNotes?: string; // Teacher
  expertise?: string; // Teacher

  grade?: string; // Student
  age?: number; // Student
  experiencePoints?: number;
  dailyStreak?: number;
  lastStreakIncrement?: string; // YYYY-MM-DD for Student

  notificationPreferences?: { // Parent
    sessionSummaries: boolean;
    assignmentGraded: boolean;
    lowCreditAlerts: boolean;
  };
}

export enum ProgramStatus {
    DRAFT = 'Draft',
    ACTIVE = 'Active',
    ARCHIVED = 'Archived',
}

export interface Program {
    id: string;
    title: string;
    description: string;
    categoryId?: string;
    targetGradeLevel: string[];
    status: ProgramStatus;
    studentCount: number;
    teacherCount: number;
    dateAdded: string;
    structure?: CurriculumItem[];
}

export enum SessionStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  ABSENT = 'Absent',
}

export enum SessionType {
  CURRICULUM = 'Curriculum Session',
  PARENT_TEACHER = 'Parent-Teacher Meeting',
  SPECIAL_REQUEST = 'Special Request',
  DEMO = 'Demo Session',
}

export interface Session {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  studentId?: string;
  teacherId: string;
  programId: string;
  status: SessionStatus;
  privateNotes?: string;
  parentSummary?: string;
  sessionUrl?: string;
  sessionType: SessionType;
  curriculumItemId?: string;
  recurringId?: string;
  preSessionQuestions?: string;
  prospectName?: string;
}

export enum EnrollmentStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface Enrollment {
  id: string;
  studentId: string;
  programId: string;
  teacherId: string;
  status: EnrollmentStatus;
  creditsRemaining: number;
  dateEnrolled: string;
}

export enum AssetStatus {
  AVAILABLE = 'Available',
  ASSIGNED = 'Assigned',
  ARCHIVED = 'Archived',
}

export interface AssetHistoryEntry {
    id: string;
    change: string;
    changedBy: string; // Admin User's name
    timestamp: string; // ISO string
}

export interface Asset {
  id: string;
  name: string;
  typeId: string;
  status: AssetStatus;
  assignedTo: string[]; // Array of teacher IDs
  details: string;
  dateAcquired: string;
  history: AssetHistoryEntry[];
}

export interface CreditTransaction {
  id: string;
  enrollmentId: string;
  change: number; // e.g., +10, -1
  reason: string;
  date: string; // ISO string date
  adminName: string; // Name of admin who made the change
}

export enum RevenueTransactionType {
    REVENUE = 'Revenue',
}

export interface RevenueTransaction {
    id: string;
    date: string; // YYYY-MM-DD
    salesPersonId: string;
    enrollmentId: string;
    credits: number;
    price: number;
    currency: string;
    conversionRate?: number;
    type: RevenueTransactionType;
    notes?: string;
}

export interface CompanyPhoneNumber {
  id: string;
  code: string;
  number: string;
}

export interface AIProviderSettings {
    enabled: boolean; // Global AI switch
    provider: 'gemini';
    model: string;
}

export interface AIBriefingSettings {
    enabled: boolean; // Feature-specific switch
    autoRefreshHours: number; // 0 for off
    dailyUpdateTime: string; // "HH:MM"
}

export interface StudentAtRiskSettings {
    enabled: boolean;
    missedSessions: {
        count: number;
        periodDays: number;
    };
}

export interface ProgramCategory {
    id: string;
    name: string;
}

export interface AssetType {
    id: string;
    name: string;
}

export interface MessageTemplate {
    id: string;
    title: string;
    content: string;
}

export interface PlatformSettings {
    companyName: string;
    companyLogoUrl: string;
    mascotImageUrl: string;
    mascotEnabled: boolean;
    companyEmail: string;
    companyPhoneNumbers: CompanyPhoneNumber[];
    primaryColor: string;
    primaryCurrency: string;
    programCategories: ProgramCategory[];
    assetTypes: AssetType[];
    messageTemplates: MessageTemplate[];
    parentLowCreditAlerts: {
        enabled: boolean;
        threshold: number;
    };
    salesLowCreditAlerts: {
        enabled: boolean;
        threshold: number;
    };
    sessionJoinWindow: {
        joinBufferMinutesBefore: number;
        joinBufferMinutesAfter: number;
    };
    aiProvider: AIProviderSettings;
    aiBriefing: AIBriefingSettings;
    studentAtRisk: StudentAtRiskSettings;
    aiChat: {
        enabled: boolean;
    };
}

export interface StatCardData {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ElementType;
}

export interface Activity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  action: string;
  target: string;
  timestamp: string;
}

export enum AssignmentStatus {
  PENDING_GRADING = 'Pending Grading',
  GRADED = 'Graded',
  SUBMITTED_LATE = 'Submitted Late',
  NOT_SUBMITTED = 'Not Submitted',
}

export interface Assignment {
    id: string;
    title: string;
    studentId: string;
    enrollmentId: string;
    programId: string;
    status: AssignmentStatus;
    submittedAt: string;
    dueDate: string;
    grade?: string;
    feedback?: string;
    url?: string;
    instructions?: string;
    curriculumItemId?: string; 
    submissionContent?: string;
}

export interface StudentDetails extends User {
    programTitle: string;
    creditsRemaining: number;
    enrollmentId: string;
    enrollmentStatus: EnrollmentStatus;
    programId: string;
}

export enum CurriculumStatus {
    LOCKED = 'Locked',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
}

export interface ResourceLink {
    id: string;
    title: string;
    url: string;
}

export interface AssignmentTemplate {
    id: string;
    title: string;
    url: string;
    instructions?: string;
}

export interface CurriculumItem {
    id: string;
    title: string;
    type: 'Chapter' | 'Topic' | 'Sub-Topic';
    status: CurriculumStatus;
    children?: CurriculumItem[];
    studentResources?: ResourceLink[];
    teacherResources?: ResourceLink[];
    assignments?: AssignmentTemplate[];
}

export interface CurriculumProgress {
    enrollmentId: string;
    programTitle: string;
    structure: CurriculumItem[];
}

export interface Notification {
  id: string;
  userId: string; // The ID of the user this notification is for
  actor: { // The user/system that generated the notification
    name: string;
    avatar: string;
  };
  message: string;
  timestamp: string; // ISO string
  read: boolean;
  link?: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

export interface TourStep {
  selector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  dayOfWeek: number; // 0 for Sunday, 6 for Saturday
  startTime: string; // e.g., "09:00"
  endTime: string; // e.g., "17:00"
}

export interface Unavailability {
  id: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface CancellationRequest {
    id: string;
    sessionId: string;
    studentId: string;
    requestedAt: string; // ISO string
    status: 'pending' | 'approved' | 'denied';
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string; // user id
    receiverId: string; // user id
    text: string;
    timestamp: string; // ISO string
    read: boolean;
}

export interface Conversation {
    id: string;
    participantIds: string[]; // [studentId, teacherId]
    lastMessageSnippet: string;
    lastMessageTimestamp: string; // ISO string
    unreadCount: { [userId: string]: number }; // unread count for each user
}

export interface Announcement {
    id:string;
    title: string;
    content: string;
    targetRoles?: Role[];
    targetProgramIds?: string[];
    targetUserIds?: string[]; // For system-generated direct alerts
    dateSent: string; // ISO string
    sentById: string; // Admin User's ID or 'system-auto'
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string
  userId: string; // ID of the user who performed the action
  userName: string; // Name of the user for easy display
  action: string; // e.g., USER_CREATED, PROGRAM_UPDATED, SESSION_CANCELLED
  entityType: string; // e.g., User, Program, Session
  entityId: string; // ID of the entity that was affected
  details: Record<string, any>; // For storing before/after states or other metadata
}