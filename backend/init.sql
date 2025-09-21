-- Drop existing tables in reverse order of dependency to avoid foreign key constraints
DROP TABLE IF EXISTS curriculum_progress CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS revenue_transactions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS cancellation_requests CASCADE;
DROP TABLE IF EXISTS unavailability CASCADE;
DROP TABLE IF EXISTS availability_slots CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Users Table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    avatar TEXT,
    "lastLogin" VARCHAR(255),
    "dateAdded" DATE,
    "parentId" VARCHAR(255),
    "childrenIds" TEXT[],
    timezone VARCHAR(255),
    dob DATE,
    "payRate" NUMERIC,
    documents JSONB,
    "performanceNotes" TEXT,
    expertise TEXT,
    grade VARCHAR(50),
    age INT,
    "experiencePoints" INT,
    "dailyStreak" INT,
    "lastStreakIncrement" DATE,
    "notificationPreferences" JSONB
);

-- Create Programs Table
CREATE TABLE programs (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    "categoryId" VARCHAR(255),
    "targetGradeLevel" TEXT[],
    status VARCHAR(50) NOT NULL,
    "studentCount" INT,
    "teacherCount" INT,
    "dateAdded" DATE,
    structure JSONB
);

-- Create Enrollments Table
CREATE TABLE enrollments (
    id VARCHAR(255) PRIMARY KEY,
    "studentId" VARCHAR(255) NOT NULL,
    "programId" VARCHAR(255) NOT NULL,
    "teacherId" VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    "creditsRemaining" INT NOT NULL,
    "dateEnrolled" DATE
);

-- Create Sessions Table
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    start TIMESTAMPTZ NOT NULL,
    "end" TIMESTAMPTZ NOT NULL,
    "studentId" VARCHAR(255),
    "teacherId" VARCHAR(255) NOT NULL,
    "programId" VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    "privateNotes" TEXT,
    "parentSummary" TEXT,
    "sessionUrl" TEXT,
    "sessionType" VARCHAR(255),
    "curriculumItemId" VARCHAR(255),
    "recurringId" VARCHAR(255),
    "preSessionQuestions" TEXT,
    "prospectName" VARCHAR(255)
);

-- Create Assignments Table
CREATE TABLE assignments (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    "studentId" VARCHAR(255) NOT NULL,
    "enrollmentId" VARCHAR(255) NOT NULL,
    "programId" VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    "submittedAt" TIMESTAMPTZ,
    "dueDate" DATE,
    grade VARCHAR(50),
    feedback TEXT,
    url TEXT,
    instructions TEXT,
    "curriculumItemId" VARCHAR(255),
    "submissionContent" TEXT
);

-- Create Credit Transactions Table
CREATE TABLE credit_transactions (
    id VARCHAR(255) PRIMARY KEY,
    "enrollmentId" VARCHAR(255) NOT NULL,
    change INT NOT NULL,
    reason TEXT,
    date TIMESTAMPTZ,
    "adminName" VARCHAR(255)
);

-- Create Assets Table
CREATE TABLE assets (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "typeId" VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    "assignedTo" TEXT[],
    details TEXT,
    "dateAcquired" DATE,
    history JSONB
);

-- Create Availability Tables
CREATE TABLE availability_slots (
    id VARCHAR(255) PRIMARY KEY,
    "teacherId" VARCHAR(255) NOT NULL,
    "dayOfWeek" INT NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL
);

CREATE TABLE unavailability (
    id VARCHAR(255) PRIMARY KEY,
    "teacherId" VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    notes TEXT
);

-- Create Cancellation Requests Table
CREATE TABLE cancellation_requests (
    id VARCHAR(255) PRIMARY KEY,
    "sessionId" VARCHAR(255) NOT NULL,
    "studentId" VARCHAR(255) NOT NULL,
    "requestedAt" TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL
);

-- Create Communication Tables
CREATE TABLE conversations (
    id VARCHAR(255) PRIMARY KEY,
    "participantIds" TEXT[],
    "lastMessageSnippet" TEXT,
    "lastMessageTimestamp" TIMESTAMPTZ,
    "unreadCount" JSONB
);

CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    "conversationId" VARCHAR(255) NOT NULL,
    "senderId" VARCHAR(255) NOT NULL,
    "receiverId" VARCHAR(255) NOT NULL,
    text TEXT,
    timestamp TIMESTAMPTZ,
    read BOOLEAN
);

CREATE TABLE announcements (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    "targetRoles" TEXT[],
    "targetProgramIds" TEXT[],
    "targetUserIds" TEXT[],
    "dateSent" TIMESTAMPTZ,
    "sentById" VARCHAR(255)
);

-- Create Audit Logs Table
CREATE TABLE audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMPTZ,
    "userId" VARCHAR(255),
    "userName" VARCHAR(255),
    action VARCHAR(255),
    "entityType" VARCHAR(255),
    "entityId" VARCHAR(255),
    details JSONB
);

-- Create Revenue Transactions Table
CREATE TABLE revenue_transactions (
    id VARCHAR(255) PRIMARY KEY,
    date DATE,
    "salesPersonId" VARCHAR(255),
    "enrollmentId" VARCHAR(255),
    credits INT,
    price NUMERIC,
    currency VARCHAR(10),
    "conversionRate" NUMERIC,
    type VARCHAR(50),
    notes TEXT
);

-- Create Platform Settings Table (Single Row)
CREATE TABLE platform_settings (
    id INT PRIMARY KEY,
    settings JSONB
);

-- Create Curriculum Progress Table
CREATE TABLE curriculum_progress (
    enrollment_id VARCHAR(255) PRIMARY KEY,
    program_title VARCHAR(255),
    structure JSONB
);