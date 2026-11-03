-- Schema is created by Hibernate. Do not set explicit IDs (breaks auto-increment for new records).
-- Passwords are plain text for our local university portal simulation environment rules.

-- =========================================================================
-- 1. SEED DUMMY USERS
-- =========================================================================

-- User 1: Max Mustermann
INSERT INTO users (name, email, password, role, verified, created_at)
VALUES ('Max Mustermann', 'max.mustermann@stud.oth-regensburg.de', 'password123', 'STUDENT', TRUE, CURRENT_TIMESTAMP);

-- User 2: Anna Schmidt
INSERT INTO users (name, email, password, role, verified, created_at)
VALUES ('Anna Schmidt', 'anna.schmidt@stud.oth-regensburg.de', 'secure456', 'STUDENT', TRUE, CURRENT_TIMESTAMP);

-- =========================================================================
-- 2. SEED DEPENDENT STUDENT PROFILES (LINKED VIA EMAIL SUBQUERIES)
-- =========================================================================

-- Student Profile for Max
INSERT INTO student_profile (matriculation_number, course, semester, user_id)
VALUES ('1234567', 'Informatik', 4, (SELECT id FROM users WHERE email = 'max.mustermann@stud.oth-regensburg.de'));

-- Student Profile for Anna
INSERT INTO student_profile (matriculation_number, course, semester, user_id)
VALUES ('7654321', 'Wirtschaftsinformatik', 2, (SELECT id FROM users WHERE email = 'anna.schmidt@stud.oth-regensburg.de'));