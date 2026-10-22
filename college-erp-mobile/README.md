# College ERP Mobile Application (100% Native Expo Android)

A **100% pure native** Android mobile application for the College ERP platform, built using React Native, Expo SDK 58, and TypeScript. It has **no WebView dependencies** and runs completely natively on mobile devices.

All existing web application frontend code, backend endpoints, authentication system, and MongoDB database models remain preserved and intact.

---

## 📱 Fully Native Role-Based Dashboards

The application dynamically routes authenticated users to dedicated, fully-featured native dashboards with **all the options and workflows from the web application**:

### 1. 👨‍👩‍👧 Parent Dashboard (`ParentDashboard.tsx`)
- **Ward Profile & Advisor Banner**: Child profile details, Roll No / ID, Department, Semester, Section, and Class Advisor direct phone & email contacts.
- **Dashboard Overview**: Attendance gauge (above 75% threshold), current CGPA, class rank, outstanding fee dues, college bus status, quick actions, today's schedule preview, and recent notices.
- **Detailed Attendance**: Overall progress bar, subject-wise breakdown (Subject Code, Name, Classes Conducted, Classes Attended, Percentage, Safe/Shortage status pills, mini progress indicators).
- **Marks & Examination Results**: Internal Assessment 1 & 2 scores, Model Exam marks, Semester grade badges (O, A+, A), credits, and overall CGPA indicator.
- **Timetable & Daily Schedule**: Day selector (Monday to Friday), chronological period timeline with faculty names and classroom halls.
- **Fee Ledger & Payments**: Total annual fee, amount paid, outstanding dues, payment receipt history with dates and receipt numbers, and online fee payment portal trigger.
- **Leave Desk**: Ward leave application history, approval status (Approved by Advisor/HOD, Pending), and native **Apply Leave for Ward** modal.
- **Transport & Bus Tracking**: Assigned route, bus registration number, boarding stop name, morning pickup time (7:45 AM), evening drop time (5:15 PM), live trip status, and **one-tap direct Call Driver button**.
- **Announcements**: Circulars, exam date releases, parent-teacher meeting (PTM) alerts, and holiday notices.
- **Business Referrals**: Campus opportunity referrals (Credit cards, insurance, job referrals, bank accounts) with institutional benefit points.

### 2. 👨‍🎓 Student Dashboard (`StudentDashboard.tsx`)
- **Student Profile Header**: Student name, roll number, department, semester, and distinction status.
- **Dashboard Overview**: Cumulative attendance gauge, current CGPA, active assignments count, semester dues, today's timetable glance, and fast action buttons.
- **Attendance Ledger**: Subject-by-subject attendance records with conducted/attended hours, percentages, and compliance tags.
- **Timetable**: Day-by-day class schedule with periods, subject codes, faculty in-charge, and lecture halls.
- **Assignments**: Active coursework, submission status, due dates, scores, and upload submission action.
- **Fees**: Tuition and special fees breakdown, paid amounts, balance ledger, and online payment action.
- **Library**: Currently issued books, due dates, renewal counter, fine status, and online renewal action.
- **Placements & Career**: Campus placement drives (e.g. Zoho, TCS, CTS), package details, drive dates, and registration.
- **Leave Application**: Native modal for applying student leave directly to the Class Advisor and HOD.
- **Bulletins**: Campus notices, symposium alerts, and examination announcements.

### 3. 👩‍🏫 Staff Dashboard (`StaffDashboard.tsx`)
- **Faculty Profile**: Employee ID, designation, department, and today's lecture count.
- **Overview**: Teaching workload stats, students mentored, leave balances (casual & sick leaves), and pending tasks.
- **Interactive Attendance Sheet**: Dynamic student roster with an **"All Present"** shortcut and individual toggle switches. Submits attendance directly to the backend attendance API.
- **Teaching Schedule**: Today's and weekly lecture periods, course names, and assigned classrooms.
- **My Students Roster**: Mentee directory with roll numbers, names, and parent contact triggers.
- **Staff Leaves**: Casual, sick, and On-Duty (OD) leave ledger with status, and a native **Apply Faculty Leave** modal.
- **Gate Parcels**: Incoming packages held at campus security gate with AWB numbers and release OTPs.
- **Announcements**: Department circulars and academic meetings.

### 4. 🚌 Driver Dashboard (`DriverDashboard.tsx`)
- **Vehicle & Route Overview**: Assigned bus number, route description, capacity, fuel level, and odometer reading.
- **Active Trip Controls**: One-tap **Start Morning Run** and **Complete Trip at Gate** workflow.
- **Stop-by-Stop Itinerary**: Chronological list of stops, scheduled arrival times, and passenger numbers.
- **Student Boarding Manager**: Interactive passenger roster with roll numbers, stop names, emergency parent phone numbers, and one-tap **Boarding Check-In toggles**.
- **Vehicle Maintenance & Specs**: Speed governor calibration, insurance validity, FC certificate, and GPS status.
- **Daily Pre-Trip Checklist**: Tire pressure, engine oil, first aid, emergency exit, and sanitization verification.

### 5. 🛡️ Watchman Dashboard (`WatchmanDashboard.tsx`)
- **Campus Security KPIs**: Active visitors currently on campus, students on approved out-pass, parked buses, and packages held.
- **Real-Time Gate Movements**: Live register of entries and exits (Student, Staff, Visitor, Vehicle) with timestamps, gate numbers, and purposes.
- **Manual Movement Modal**: Native modal to register IN/OUT movements instantly.
- **Digital QR Gate Pass Verifier**: QR code / token code verifier for student medical/out-passes.
- **Bus Fleet Gate Transit**: Timestamps and driver logs for college buses passing gates.
- **Parcel Custody Manager**: Incoming courier delivery logger with recipient names and release OTPs.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: React Native with Expo (SDK 58)
- **Architecture**: **100% Native Components** (No WebView)
- **Routing**: Expo Router (`expo-router`) with Native Stack
- **Language**: TypeScript
- **Storage**: Secure encrypted storage with `expo-secure-store`
- **Backend**: Existing Node.js / Express backend (`https://college-erp-software.onrender.com/api`)

---

## 🚀 Running the App Locally

### 1. Install Dependencies
```bash
cd college-erp-mobile
npm install
```

### 2. Start Expo Development Server
```bash
npx expo start
```

### 3. Open on Android
- Press `a` in the terminal to launch on a running **Android Emulator**.
- Or scan the QR code with the **Expo Go** app on your physical Android phone (ensure your phone and computer are on the same Wi-Fi network).

---

## 📦 Building the Android APK (Installable)

The project is preconfigured in `eas.json` to produce a standalone `.apk` file ready for installation on any Android device.

```bash
# 1. Install EAS CLI globally (if not already installed)
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Build the standalone APK
eas build -p android --profile preview
```

EAS will build the standalone Android APK and provide a direct download link and QR code to install the APK directly on your Android phone.
