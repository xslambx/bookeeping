# BooksEasy Deployment Guide

## Deploy to Firebase Hosting (Recommended)

Firebase Hosting is perfect since you're already using Firebase for backend services.

### Prerequisites
- Completed Firebase setup from main README
- Firebase CLI installed
- Built the production version

### Steps

1. **Install Firebase CLI** (if not already installed)
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**
```bash
firebase login
```

3. **Initialize Firebase Hosting**
```bash
firebase init hosting
```
- Select your Firebase project
- Use `build` as your public directory
- Configure as a single-page app: **Yes**
- Don't overwrite build/index.html: **No**

4. **Build your app**
```bash
npm run build
```

5. **Deploy to Firebase**
```bash
firebase deploy --only hosting
```

6. **Your app is now live!**
Firebase will give you a URL like: `https://your-project-id.web.app`

### Custom Domain (Optional)
In Firebase Console → Hosting → Add custom domain

---

## Deploy to Netlify (Alternative - Very Easy)

Netlify offers a generous free tier and is very beginner-friendly.

### Option 1: Drag & Drop (Easiest)

1. Build your app:
```bash
npm run build
```

2. Go to [Netlify](https://www.netlify.com/)
3. Sign up / Log in
4. Drag the `build` folder onto Netlify dashboard
5. Done! Your site is live

### Option 2: Git Integration (Automatic Deploys)

1. Push your code to GitHub
2. Go to [Netlify](https://www.netlify.com/)
3. Click "Add new site" → "Import an existing project"
4. Connect to your GitHub repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
6. Add environment variables in Netlify dashboard
7. Deploy!

**Important**: Add all your environment variables in Netlify dashboard:
- Site settings → Environment variables → Add variables

---

## Deploy to Vercel (Alternative - Great Performance)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts
4. Add environment variables in Vercel dashboard

---

## Environment Variables for Production

When deploying, make sure to add these environment variables in your hosting provider's dashboard:

```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
REACT_APP_EMAILJS_SERVICE_ID
REACT_APP_EMAILJS_TEMPLATE_ID
REACT_APP_EMAILJS_PUBLIC_KEY
```

**Security Note**: Never commit `.env` file to Git. It's already in `.gitignore`.

---

## Quick Deployment Comparison

| Platform | Free Tier | Setup Difficulty | Best For |
|----------|-----------|------------------|----------|
| **Firebase Hosting** | Yes | Easy | Already using Firebase |
| **Netlify** | Yes | Very Easy | Beginners |
| **Vercel** | Yes | Easy | Great performance |

---

## Post-Deployment Checklist

- [ ] Update Firebase Security Rules (see main README)
- [ ] Test admin signup and login
- [ ] Test client signup and login
- [ ] Upload and categorize test transactions
- [ ] Test email notifications
- [ ] Set up custom domain (optional)
- [ ] Enable Firebase Analytics (optional)

---

## Troubleshooting

### Build Errors
- Make sure all environment variables are set
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript/JavaScript errors

### Firebase Connection Issues
- Verify Firebase credentials in environment variables
- Check Firebase Console for service status
- Ensure Firebase services are enabled (Auth, Firestore, Storage)

### Email Not Sending
- Verify EmailJS credentials
- Check EmailJS dashboard for quota limits
- Test email template in EmailJS dashboard

---

## Support

If you encounter issues during deployment, check:
1. Browser console for errors
2. Firebase Console for database/storage errors
3. Hosting provider logs
