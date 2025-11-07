# BooksEasy

BooksEasy is a web application that helps small business owners review and categorize their financial transactions easily.

## Features

### Client Portal
- Securely log in and view uploaded transactions
- Classify each transaction as Business, Personal, or Add Back
- Auto-save progress as you work
- Generate and store summarized CSV reports automatically
- Track categorization progress in real-time

### Admin Dashboard
- Upload CSV files for clients
- View all client submissions and their progress
- Download completed categorized reports
- Track client activity with comprehensive statistics
- Send automated email notifications to clients

## Technology Stack

- **Frontend**: React 18
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Email**: EmailJS for automated notifications
- **CSV Processing**: PapaParse
- **Routing**: React Router v6

## Setup Instructions

### Prerequisites
- Node.js 14 or higher
- npm or yarn
- Firebase account
- EmailJS account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd bookeeping
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Enable Storage
5. Get your Firebase configuration

### 4. Configure EmailJS

1. Create an account at [EmailJS](https://www.emailjs.com/)
2. Create an email service
3. Create an email template
4. Get your Service ID, Template ID, and Public Key

### 5. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# EmailJS Configuration
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

### 6. Firestore Security Rules

Add these security rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Submissions collection
    match /submissions/{submissionId} {
      allow read: if request.auth != null &&
        (resource.data.clientId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow create: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow update: if request.auth != null &&
        (resource.data.clientId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

### 7. Storage Security Rules

Add these security rules to your Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }

    match /completed/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 8. Run the Application

```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Usage

### For Admins

1. Sign up with an admin account
2. Upload CSV files for clients from the Admin Dashboard
3. View submission history and track client progress
4. Download completed categorized reports

### For Clients

1. Sign up with a client account
2. Wait for admin to upload transaction files
3. Review and categorize each transaction
4. Progress is auto-saved
5. Submit when all transactions are categorized

## CSV File Format

The CSV file should have headers in the first row. All columns will be displayed to clients for review. A typical format might include:

```csv
Date,Description,Amount,Vendor,Account
2024-01-15,Office Supplies,125.50,Staples,Business Checking
2024-01-16,Coffee Meeting,45.00,Starbucks,Business Credit
```

## Project Structure

```
bookeeping/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── AdminDashboard.js
│   │   ├── ClientPortal.js
│   │   ├── Login.js
│   │   ├── Signup.js
│   │   └── ProtectedRoute.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── App.js
│   ├── App.css
│   ├── firebase.js
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Deployment

The application can be deployed to:
- Firebase Hosting
- Netlify
- Vercel
- Any static hosting service

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## Support

For issues or questions, please contact support or create an issue in the repository.

## License

This project is proprietary and confidential.

## WorkEasy / BooksEasy Branding

This application is part of the WorkEasy suite of business tools, designed to make financial management easier for small businesses.
