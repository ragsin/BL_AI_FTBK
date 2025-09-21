import db from './db.js';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

// --- COPIED MOCK DATA ---
// NOTE: This data is copied from the original frontend mockData.ts
// and converted to plain JavaScript objects for the seeding script.
const mockUsers = [
    { id: 'admin-1', username: 'admin', password: 'password', firstName: 'Admin', lastName: 'User', email: 'admin@brainleaf.com', phone: '+1 555-0199', role: 'Admin', status: 'Active', avatar: 'https://picsum.photos/id/237/100/100', lastLogin: '2023-10-28 11:00 AM', dateAdded: '2022-01-10', timezone: 'America/New_York' },
    { id: 'teacher-1', username: 'bob', password: 'password', firstName: 'Bob', lastName: 'Williams', email: 'bob.w@example.com', phone: '+1 555-0102', role: 'Teacher', status: 'Active', avatar: 'https://picsum.photos/id/1005/100/100', lastLogin: '2023-10-27 08:30 PM', dateAdded: '2022-02-20', payRate: 50, documents: [{id: 'doc1', name: 'Contract.pdf', url: '#'}], performanceNotes: 'Excellent with algebra students.', timezone: 'America/Chicago', expertise: 'Algebra, Geometry' },
    { id: 'student-1', username: 'charlie', password: 'password', firstName: 'Charlie', lastName: 'Brown', email: 'charlie.b@example.com', phone: '+1 555-0103', role: 'Student', status: 'Inactive', avatar: 'https://i.pravatar.cc/150?u=student-1', lastLogin: '2023-09-15 03:15 PM', dateAdded: '2022-03-10', parentId: 'parent-1', timezone: 'America/Los_Angeles', grade: '9', age: 14, dob: '2010-07-25', experiencePoints: 125, dailyStreak: 1, lastStreakIncrement: '2023-09-14' },
    { id: 'parent-1', username: 'diana', password: 'password', firstName: 'Diana', lastName: 'Miller', email: 'diana.m@example.com', phone: '+1 555-0104', role: 'Parent', status: 'Active', avatar: 'https://picsum.photos/id/1012/100/100', lastLogin: '2023-10-28 09:00 AM', dateAdded: '2022-03-10', childrenIds: ['student-1', 'student-2'], timezone: 'America/Los_Angeles', notificationPreferences: { sessionSummaries: true, assignmentGraded: true, lowCreditAlerts: false } },
    { id: 'student-2', username: 'sarah', password: 'password', firstName: 'Sarah', lastName: 'Miller', email: 'sarah.m@example.com', phone: '+1 555-0108', role: 'Student', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=student-2', lastLogin: '2023-10-27 05:00 PM', dateAdded: '2022-08-22', parentId: 'parent-1', timezone: 'America/Los_Angeles', grade: '7', age: 12, dob: '2012-04-15', experiencePoints: 340, dailyStreak: 3, lastStreakIncrement: '2023-10-26' },
    { id: 'teacher-2', username: 'ethan', password: 'password', firstName: 'Ethan', lastName: 'Davis', email: 'ethan.d@example.com', phone: '+1 555-0105', role: 'Teacher', status: 'Active', avatar: 'https://picsum.photos/id/1013/100/100', lastLogin: '2023-10-26 11:20 AM', dateAdded: '2022-05-01', payRate: 55, documents: [], performanceNotes: '', timezone: 'America/Denver', expertise: 'Physics' },
    { id: 'finance-1', username: 'fiona', password: 'password', firstName: 'Fiona', lastName: 'Garcia', email: 'fiona.g@example.com', phone: '+44 20-7946-0958', role: 'Finance', status: 'Active', avatar: 'https://picsum.photos/id/1014/100/100', lastLogin: '2023-10-27 01:05 PM', dateAdded: '2022-06-18', timezone: 'Europe/London' },
    { id: 'scheduler-1', username: 'sam', password: 'password', firstName: 'Scheduler', lastName: 'Sam', email: 'sam@example.com', phone: '+61 2-9876-5432', role: 'Scheduler', status: 'Active', avatar: 'https://picsum.photos/id/1015/100/100', lastLogin: '2023-10-28 12:40 PM', dateAdded: '2022-07-01', timezone: 'Australia/Sydney' },
    { id: 'sales-1', username: 'sally', password: 'password', firstName: 'Sally', lastName: 'Salesperson', email: 'sally@example.com', phone: '+1 555-0111', role: 'Sales', status: 'Active', avatar: 'https://picsum.photos/id/1025/100/100', lastLogin: '2023-10-28 02:00 PM', dateAdded: '2022-07-15', timezone: 'America/Phoenix' },
];
const mockPrograms = [
    { id: 'p1', title: 'Algebra 101', description: 'Fundamental concepts of algebra for beginners.', categoryId: 'cat-math', targetGradeLevel: ['7', '8', '9'], status: 'Active', studentCount: 45, teacherCount: 3, dateAdded: '2023-01-10', structure: [ { id: 'c1', title: 'Chapter 1: Foundations', type: 'Chapter', status: 'Locked', children: [ { id: 't1-1', title: 'Topic 1.1: Real Numbers', type: 'Topic', status: 'Locked', studentResources: [ { id: 'res-1', title: 'Khan Academy: Real Numbers', url: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:foundation-algebra/x2f8bb11595b61c86:intro-variables/v/variables-and-expressions-1' } ], teacherResources: [ { id: 'res-teach-1', title: 'Answer Key: Real Numbers Worksheet', url: '#' } ], assignments: [ { id: 'at-inline-1', title: 'Real Numbers Worksheet', url: 'https://example.com/worksheets/algebra-real-numbers.pdf', instructions: 'Please complete all odd-numbered problems and show your work.' } ] }, { id: 't1-2', title: 'Topic 1.2: Expressions', type: 'Topic', status: 'Locked', studentResources: [], assignments: [ { id: 'at-inline-2', title: 'Expressions Worksheet', url: 'https://example.com/worksheets/algebra-expressions.pdf', instructions: 'Solve all problems.' } ]}, ], studentResources: [], assignments: [] }, { id: 'c2', title: 'Chapter 2: Solving Equations', type: 'Chapter', status: 'Locked', studentResources: [], assignments: [] }, ] },
    { id: 'p2', title: 'Introduction to Physics', description: 'Covering mechanics, electricity, and magnetism.', categoryId: 'cat-math', targetGradeLevel: ['10', '11', '12'], status: 'Active', studentCount: 32, teacherCount: 2, dateAdded: '2023-02-20', structure: [ { id: 'phy-c1', title: 'Chapter 1: Kinematics', type: 'Chapter', status: 'Locked', children: [ { id: 'phy-t1-1', title: 'Topic 1.1: Motion', type: 'Topic', status: 'Locked', studentResources: [{ id: 'phy-res-1', title: 'Video: What is motion?', url: 'https://example.com/video-motion' }], assignments: [{ id: 'phy-assign-1', title: 'Lab Report 2', url: 'https://example.com/lab2.pdf', instructions: 'Follow the lab procedure and submit your findings.' }] } ]} ] },
    { id: 'p3', title: 'Creative Writing Workshop', description: 'A workshop to explore creative writing techniques.', categoryId: 'cat-phonics', targetGradeLevel: ['8', '9', '10'], status: 'Draft', studentCount: 0, teacherCount: 1, dateAdded: '2023-05-15', structure: [] },
    { id: 'p4', title: 'Calculus Prep', description: 'Preparing students for advanced placement calculus.', categoryId: 'cat-math', targetGradeLevel: ['11', '12'], status: 'Archived', studentCount: 50, teacherCount: 4, dateAdded: '2022-09-01', structure: [] },
    { id: 'p5', title: 'World History: Ancient Civilizations', description: 'A deep dive into the history of ancient civilizations.', targetGradeLevel: ['6', '7', '8'], status: 'Active', studentCount: 28, teacherCount: 2, dateAdded: '2023-03-05', structure: [ { id: 'wh-c1', title: 'Unit 1: Mesopotamia', type: 'Chapter', status: 'Locked', children: [ { id: 'wh-t1-1', title: 'The Fertile Crescent', type: 'Topic', status: 'Locked', assignments: [{ id: 'wh-assign-1', title: 'Midterm Essay', url: '#', instructions: 'Write a 500-word essay on the importance of the Tigris and Euphrates rivers.' }] } ]}, { id: 'wh-c2', title: 'Unit 2: Ancient Egypt', type: 'Chapter', status: 'Locked', children: [ { id: 'wh-t2-1', title: 'The Pyramids', type: 'Topic', status: 'Locked', studentResources: [{ id: 'wh-res-1', title: 'Virtual Tour of Giza', url: 'https://example.com/giza-tour' }], assignments: [{ id: 'wh-assign-2', title: 'Final Project Proposal', url: '#', instructions: 'Submit a one-page proposal for your final project on an aspect of Egyptian culture.' }] } ]} ] },
];
const mockEnrollments = [
    { id: 'e1', studentId: 'student-1', programId: 'p1', teacherId: 'teacher-1', status: 'Active', creditsRemaining: 10, dateEnrolled: '2023-09-01' },
    { id: 'e2', studentId: 'student-2', programId: 'p2', teacherId: 'teacher-2', status: 'Active', creditsRemaining: 5, dateEnrolled: '2023-09-05' },
    { id: 'e3', studentId: 'student-1', programId: 'p2', teacherId: 'teacher-2', status: 'Completed', creditsRemaining: 0, dateEnrolled: '2023-02-15' },
    { id: 'e4', studentId: 'student-2', programId: 'p5', teacherId: 'teacher-2', status: 'Active', creditsRemaining: 12, dateEnrolled: '2023-09-08' },
];
const mockSessions = [
    { id: 's1', title: 'Algebra 101 - Charlie Brown', start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), end: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), studentId: 'student-1', teacherId: 'teacher-1', programId: 'p1', status: 'Scheduled', sessionType: 'Curriculum Session' },
    { id: 's2', title: 'Physics - Sarah Miller', start: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString(), end: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString(), studentId: 'student-2', teacherId: 'teacher-2', programId: 'p2', status: 'Scheduled', sessionType: 'Curriculum Session' },
];
const mockAssignments = [
    { id: 'a1', title: 'Chapter 1 Homework', studentId: 'student-1', enrollmentId: 'e1', programId: 'p1', status: 'Pending Grading', submittedAt: '2023-10-26 08:00 PM', dueDate: '2023-10-26', feedback: '', curriculumItemId: 't1-2', instructions: 'Complete all questions from the Expressions Worksheet.' },
    { id: 'a2', title: 'Lab Report 2', studentId: 'student-2', enrollmentId: 'e2', programId: 'p2', status: 'Pending Grading', submittedAt: '2023-10-27 09:30 AM', dueDate: '2023-10-27', feedback: '', curriculumItemId: 'phy-t1-1', url: 'https://example.com/lab2.pdf', instructions: 'Follow the lab procedure and submit your findings.' },
];
const mockCreditTransactions = [
    { id: 'ct1', enrollmentId: 'e1', change: 10, reason: 'Initial enrollment', date: '2023-09-01', adminName: 'Admin User' },
    { id: 'ct2', enrollmentId: 'e2', change: 10, reason: 'Initial enrollment', date: '2023-09-05', adminName: 'Admin User' },
];
const mockAssets = [
    { id: 'a1', name: 'Primary Zoom Account', typeId: 'at-1', status: 'Assigned', assignedTo: ['teacher-1', 'teacher-2'], details: 'URL: https://zoom.us/j/1234567890\\nLogin: company@zoom.com\\nPass: securepass123', dateAcquired: '2023-01-15' },
    { id: 'a2', name: '8th Grade Resources Drive', typeId: 'at-2', status: 'Assigned', assignedTo: ['teacher-1'], details: 'https://drive.google.com/drive/folders/abcdefg', dateAcquired: '2023-02-01' },
];
const mockTeacherAvailability = [
    { id: 'avail-t1-1', teacherId: 'teacher-1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
    { id: 'avail-t2-1', teacherId: 'teacher-2', dayOfWeek: 2, startTime: '10:00', endTime: '14:00' },
];
const mockTeacherUnavailability = [
    { id: 'unavail-1', teacherId: 'teacher-1', date: '2024-07-04', notes: 'Independence Day' },
];
const mockConversations = [
    { id: 'conv-1', participantIds: ['student-2', 'teacher-2'], lastMessageSnippet: 'Thank you so much! That makes sense now.', lastMessageTimestamp: new Date(Date.now() - 5 * 60000).toISOString(), unreadCount: { 'teacher-2': 1, 'student-2': 0 } },
];
const mockMessages = [
    { id: 'msg-1', conversationId: 'conv-1', senderId: 'teacher-2', receiverId: 'student-2', text: 'Hi Sarah, how can I help you with the physics homework?', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), read: true },
    { id: 'msg-2', conversationId: 'conv-1', senderId: 'student-2', receiverId: 'teacher-2', text: "Hi! I'm having trouble with question 3 about projectile motion.", timestamp: new Date(Date.now() - 10 * 60000).toISOString(), read: true },
];
const mockAnnouncements = [
    { id: 'ann-1', title: 'Welcome to the New School Year!', content: 'We are thrilled to welcome all new and returning students!', targetRoles: ['Student', 'Parent'], dateSent: '2023-09-01T10:00:00Z', sentById: 'admin-1' },
];
const mockRevenueTransactions = [
    { id: 'rt-1', date: '2023-10-01', salesPersonId: 'sales-1', enrollmentId: 'e1', credits: 10, price: 500, currency: 'USD', type: 'Revenue' },
];
const mockCurriculumProgress = {
    'e1': { enrollmentId: 'e1', programTitle: 'Algebra 101', structure: [ { id: 'c1', title: 'Chapter 1: Foundations', type: 'Chapter', status: 'Completed', children: [ { id: 't1-1', title: 'Topic 1.1: Real Numbers', type: 'Topic', status: 'Completed' }, { id: 't1-2', title: 'Topic 1.2: Expressions & Properties', type: 'Topic', status: 'Completed' }, ]}, { id: 'c2', title: 'Chapter 2: Solving Equations', type: 'Chapter', status: 'In Progress', children: [ { id: 't2-1', title: 'Topic 2.1: One-Step Equations', type: 'Topic', status: 'Completed' }, { id: 't2-2', title: 'Topic 2.2: Two-Step Equations', type: 'Topic', status: 'In Progress' }, { id: 't2-3', title: 'Topic 2.3: Multi-Step Equations', type: 'Topic', status: 'Locked' }, ]}, ] },
    'e2': { enrollmentId: 'e2', programTitle: 'Introduction to Physics', structure: [ { id: 'phy-c1', title: 'Chapter 1: Kinematics', type: 'Chapter', status: 'Completed' } ] },
};
const initialSettings = {
    companyName: 'BrainLeaf', companyLogoUrl: '', mascotImageUrl: 'https://i.imgur.com/3_THEME/mascot.png', mascotEnabled: true, companyEmail: 'contact@brainleaf.com', companyPhoneNumbers: [{ id: 'phone-1', code: '+1', number: '555-123-4567' }], primaryColor: '#10b981', primaryCurrency: 'INR', programCategories: [ { id: 'cat-math', name: 'Math' }, { id: 'cat-chess', name: 'Chess' }, { id: 'cat-phonics', name: 'Phonics' }, ], assetTypes: [ { id: 'at-1', name: 'Meeting Account' }, { id: 'at-2', name: 'Shared Link' }, { id: 'at-3', name: 'Software License' }, { id: 'at-4', name: 'Notes' }, ], messageTemplates: [ { id: 'mt-1', title: 'Session Reminder', content: 'Hi [Parent Name],\\n\\nThis is a friendly reminder that [Student Name] has a session for [Program Name] scheduled for [Session Date] at [Session Time].\\n\\nWe look forward to seeing them!\\n\\nBest,\\n[Company Name]' }, { id: 'mt-2', title: 'Low Credit Alert', content: 'Hi [Parent Name],\\n\\nThis is a notification that [Student Name]\\\'s credit balance for [Program Name] is running low. They have [Credits Remaining] credits left.\\n\\nPlease visit the billing page to purchase more credits.\\n\\nThank you,\\n[Company Name]' }, ], parentLowCreditAlerts: { enabled: true, threshold: 5, }, salesLowCreditAlerts: { enabled: true, threshold: 10, }, sessionJoinWindow: { joinBufferMinutesBefore: 15, joinBufferMinutesAfter: 10, }, aiProvider: { enabled: false, provider: 'gemini', model: 'gemini-2.5-flash', }, aiBriefing: { enabled: false, autoRefreshHours: 0, dailyUpdateTime: '', }, studentAtRisk: { enabled: true, missedSessions: { count: 2, periodDays: 30, }, }, aiChat: { enabled: false, },
};


async function seed() {
    const client = await db.pool.connect();
    try {
        console.log('--- Starting database seed ---');

        // 1. Initialize Schema
        console.log('Initializing database schema...');
        const initSql = await fs.readFile(path.join(process.cwd(), 'init.sql'), 'utf-8');
        await client.query(initSql);
        console.log('Schema initialized successfully.');
        
        // 2. Insert Users (with hashed passwords)
        console.log('Seeding users...');
        for (const user of mockUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await client.query(
                `INSERT INTO users (id, username, password, "firstName", "lastName", email, phone, role, status, avatar, "lastLogin", "dateAdded", "parentId", "childrenIds", timezone, dob, "payRate", documents, "performanceNotes", expertise, grade, age, "experiencePoints", "dailyStreak", "lastStreakIncrement", "notificationPreferences")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
                [user.id, user.username, hashedPassword, user.firstName, user.lastName, user.email, user.phone, user.role, user.status, user.avatar, user.lastLogin, user.dateAdded || null, user.parentId, user.childrenIds, user.timezone, user.dob || null, user.payRate, JSON.stringify(user.documents || null), user.performanceNotes, user.expertise, user.grade, user.age, user.experiencePoints, user.dailyStreak, user.lastStreakIncrement || null, JSON.stringify(user.notificationPreferences || null)]
            );
        }
        console.log(`${mockUsers.length} users seeded.`);

        // 3. Insert Programs
        console.log('Seeding programs...');
        for (const program of mockPrograms) {
             await client.query(
                `INSERT INTO programs (id, title, description, "categoryId", "targetGradeLevel", status, "studentCount", "teacherCount", "dateAdded", structure)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                 [program.id, program.title, program.description, program.categoryId, program.targetGradeLevel, program.status, program.studentCount, program.teacherCount, program.dateAdded, JSON.stringify(program.structure || null)]
            );
        }
        console.log(`${mockPrograms.length} programs seeded.`);

        // 4. Insert Enrollments
        console.log('Seeding enrollments...');
        for (const enr of mockEnrollments) {
            await client.query(
                `INSERT INTO enrollments (id, "studentId", "programId", "teacherId", status, "creditsRemaining", "dateEnrolled")
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [enr.id, enr.studentId, enr.programId, enr.teacherId, enr.status, enr.creditsRemaining, enr.dateEnrolled]
            );
        }
        console.log(`${mockEnrollments.length} enrollments seeded.`);
        
        // 5. Insert Sessions
        console.log('Seeding sessions...');
        for (const s of mockSessions) {
            await client.query(
                `INSERT INTO sessions (id, title, start, "end", "studentId", "teacherId", "programId", status, "sessionType")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [s.id, s.title, s.start, s.end, s.studentId, s.teacherId, s.programId, s.status, s.sessionType]
            );
        }
        console.log(`${mockSessions.length} sessions seeded.`);

        // 6. Insert Assignments
        console.log('Seeding assignments...');
        for (const a of mockAssignments) {
            await client.query(
                 `INSERT INTO assignments (id, title, "studentId", "enrollmentId", "programId", status, "submittedAt", "dueDate", feedback, "curriculumItemId", url, instructions)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [a.id, a.title, a.studentId, a.enrollmentId, a.programId, a.status, a.submittedAt || null, a.dueDate, a.feedback, a.curriculumItemId, a.url, a.instructions]
            );
        }
        console.log(`${mockAssignments.length} assignments seeded.`);
        
        // 7. Insert Credit Transactions
        console.log('Seeding credit transactions...');
        for (const ct of mockCreditTransactions) {
            await client.query(
                `INSERT INTO credit_transactions (id, "enrollmentId", change, reason, date, "adminName")
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [ct.id, ct.enrollmentId, ct.change, ct.reason, ct.date, ct.adminName]
            );
        }
        console.log(`${mockCreditTransactions.length} credit transactions seeded.`);

        // 8. Insert Assets
        console.log('Seeding assets...');
        for (const asset of mockAssets) {
            await client.query(
                `INSERT INTO assets (id, name, "typeId", status, "assignedTo", details, "dateAcquired")
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [asset.id, asset.name, asset.typeId, asset.status, asset.assignedTo, asset.details, asset.dateAcquired]
            );
        }
        console.log(`${mockAssets.length} assets seeded.`);

        // 9. Insert Availability
        console.log('Seeding availability...');
        for (const slot of mockTeacherAvailability) {
            await client.query(
                `INSERT INTO availability_slots (id, "teacherId", "dayOfWeek", "startTime", "endTime")
                 VALUES ($1, $2, $3, $4, $5)`,
                [slot.id, slot.teacherId, slot.dayOfWeek, slot.startTime, slot.endTime]
            );
        }
        for (const unavail of mockTeacherUnavailability) {
             await client.query(
                `INSERT INTO unavailability (id, "teacherId", date, notes)
                 VALUES ($1, $2, $3, $4)`,
                [unavail.id, unavail.teacherId, unavail.date, unavail.notes]
            );
        }
        console.log(`${mockTeacherAvailability.length + mockTeacherUnavailability.length} availability records seeded.`);

        // 10. Insert Communications
        console.log('Seeding communications...');
        for (const convo of mockConversations) {
            await client.query(
                `INSERT INTO conversations (id, "participantIds", "lastMessageSnippet", "lastMessageTimestamp", "unreadCount")
                 VALUES ($1, $2, $3, $4, $5)`,
                [convo.id, convo.participantIds, convo.lastMessageSnippet, convo.lastMessageTimestamp, JSON.stringify(convo.unreadCount)]
            );
        }
        for (const msg of mockMessages) {
            await client.query(
                `INSERT INTO messages (id, "conversationId", "senderId", "receiverId", text, timestamp, read)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [msg.id, msg.conversationId, msg.senderId, msg.receiverId, msg.text, msg.timestamp, msg.read]
            );
        }
        for (const ann of mockAnnouncements) {
             await client.query(
                `INSERT INTO announcements (id, title, content, "targetRoles", "targetProgramIds", "dateSent", "sentById")
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [ann.id, ann.title, ann.content, ann.targetRoles, ann.targetProgramIds, ann.dateSent, ann.sentById]
            );
        }
        console.log(`${mockConversations.length + mockMessages.length + mockAnnouncements.length} communication records seeded.`);

        // 11. Insert Revenue
        console.log('Seeding revenue transactions...');
        for (const rt of mockRevenueTransactions) {
            await client.query(
                 `INSERT INTO revenue_transactions (id, date, "salesPersonId", "enrollmentId", credits, price, currency, type)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [rt.id, rt.date, rt.salesPersonId, rt.enrollmentId, rt.credits, rt.price, rt.currency, rt.type]
            );
        }
        console.log(`${mockRevenueTransactions.length} revenue transactions seeded.`);
        
        // 12. Insert Settings
        console.log('Seeding platform settings...');
        await client.query(
            'INSERT INTO platform_settings (id, settings) VALUES (1, $1)',
            [JSON.stringify(initialSettings)]
        );
        console.log('Platform settings seeded.');
        
        // 13. Insert Curriculum Progress
        console.log('Seeding curriculum progress...');
        for (const enrollmentId in mockCurriculumProgress) {
            const progress = mockCurriculumProgress[enrollmentId];
            await client.query(
                'INSERT INTO curriculum_progress (enrollment_id, program_title, structure) VALUES ($1, $2, $3)',
                [enrollmentId, progress.programTitle, JSON.stringify(progress.structure)]
            );
        }
        console.log(`${Object.keys(mockCurriculumProgress).length} curriculum progress records seeded.`);


        console.log('--- Database seed completed successfully ---');
    } catch (err) {
        console.error('--- Error during database seed ---');
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seed().catch(err => {
    console.error('Unhandled error in seed script:', err);
    process.exit(1);
});
