import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Papa from 'papaparse';
import emailjs from '@emailjs/browser';

function ClientPortal() {
  const { currentUser, logout } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categorizedCount, setCategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadUserData();
    loadSubmissions();
  }, [currentUser]);

  async function loadUserData() {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserName(userDoc.data().name);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async function loadSubmissions() {
    try {
      const submissionsRef = collection(db, 'submissions');
      const q = query(submissionsRef, where('clientId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const submissionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubmissions(submissionsList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setLoading(false);
    }
  }

  function selectSubmission(submission) {
    setSelectedSubmission(submission);
    setTransactions(submission.transactions.map((t, index) => ({
      ...t,
      index,
      category: t.category || null
    })));
    setCategorizedCount(submission.transactions.filter(t => t.category).length);
  }

  const autoSave = useCallback(async (updatedTransactions) => {
    if (!selectedSubmission) return;

    try {
      setSaving(true);
      const submissionRef = doc(db, 'submissions', selectedSubmission.id);
      const categorized = updatedTransactions.filter(t => t.category).length;

      await updateDoc(submissionRef, {
        transactions: updatedTransactions,
        categorizedCount: categorized,
        lastUpdated: new Date().toISOString()
      });

      setCategorizedCount(categorized);
      setSaving(false);
    } catch (error) {
      console.error('Error auto-saving:', error);
      setSaving(false);
    }
  }, [selectedSubmission]);

  function categorizeTransaction(index, category) {
    const updatedTransactions = [...transactions];
    updatedTransactions[index].category = category;
    setTransactions(updatedTransactions);

    // Auto-save after categorization
    autoSave(updatedTransactions);
  }

  async function handleComplete() {
    if (categorizedCount < transactions.length) {
      setMessage({
        text: 'Please categorize all transactions before completing',
        type: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      setMessage({ text: '', type: '' });

      // Generate CSV
      const csvData = transactions.map(t => ({
        ...t,
        category: t.category
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv' });

      // Upload to storage
      const storageRef = ref(
        storage,
        `completed/${currentUser.uid}/${Date.now()}_${selectedSubmission.fileName}`
      );
      await uploadBytes(storageRef, blob);
      const fileUrl = await getDownloadURL(storageRef);

      // Update submission
      const submissionRef = doc(db, 'submissions', selectedSubmission.id);
      await updateDoc(submissionRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedFileUrl: fileUrl,
        transactions: csvData
      });

      // Send email notification to admin
      try {
        await emailjs.send(
          process.env.REACT_APP_EMAILJS_SERVICE_ID,
          process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
          {
            to_email: 'admin@bookseasy.com', // You can make this configurable
            to_name: 'Admin',
            message: `${userName} has completed categorizing transactions for ${selectedSubmission.fileName}`
          },
          process.env.REACT_APP_EMAILJS_PUBLIC_KEY
        );
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      setMessage({ text: 'Submission completed successfully!', type: 'success' });
      loadSubmissions();
      setSelectedSubmission(null);
      setTransactions([]);
      setSaving(false);
    } catch (error) {
      console.error('Error completing submission:', error);
      setMessage({ text: 'Error completing submission: ' + error.message, type: 'error' });
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>BooksEasy - Client Portal</h1>
        <div className="header-actions">
          <span className="user-info">Welcome, {userName}</span>
          <button onClick={logout} className="btn btn-logout">Logout</button>
        </div>
      </header>

      <main className="main-content">
        {!selectedSubmission ? (
          <div className="card">
            <h2>Your Submissions</h2>
            {submissions.length === 0 ? (
              <div className="empty-state">
                <h3>No transactions yet</h3>
                <p>Your administrator will upload transaction files for you to review</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Uploaded</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(submission => (
                      <tr key={submission.id}>
                        <td>{submission.fileName}</td>
                        <td>{new Date(submission.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: submission.status === 'completed' ? '#d4edda' : '#fff3cd',
                            color: submission.status === 'completed' ? '#155724' : '#856404'
                          }}>
                            {submission.status}
                          </span>
                        </td>
                        <td>
                          {submission.categorizedCount || 0} / {submission.transactions.length}
                        </td>
                        <td>
                          {submission.status === 'pending' && (
                            <button
                              onClick={() => selectSubmission(submission)}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                            >
                              Review
                            </button>
                          )}
                          {submission.status === 'completed' && (
                            <button
                              onClick={() => selectSubmission(submission)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => {
                  setSelectedSubmission(null);
                  setTransactions([]);
                  setMessage({ text: '', type: '' });
                }}
                className="btn btn-secondary"
              >
                Back to Submissions
              </button>
            </div>

            <div className="card">
              <h2>Categorize Transactions - {selectedSubmission.fileName}</h2>

              {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
              )}

              {/* Progress */}
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(categorizedCount / transactions.length) * 100}%`
                    }}
                  >
                    {Math.round((categorizedCount / transactions.length) * 100)}%
                  </div>
                </div>
                <p style={{ marginTop: '0.5rem', textAlign: 'center', color: '#7f8c8d' }}>
                  {categorizedCount} of {transactions.length} transactions categorized
                  {saving && ' - Saving...'}
                </p>
              </div>

              {/* Transactions */}
              <div style={{ marginTop: '2rem' }}>
                {transactions.map((transaction, index) => (
                  <div key={index} className="transaction-item">
                    <div className="transaction-info">
                      {Object.keys(transaction).filter(key => key !== 'category' && key !== 'index').map((key) => (
                        <div key={key} className="transaction-info-item">
                          <label>{key}</label>
                          <span>{transaction[key]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="category-buttons">
                      <button
                        className={`category-btn business ${transaction.category === 'Business' ? 'selected' : ''}`}
                        onClick={() => categorizeTransaction(index, 'Business')}
                        disabled={selectedSubmission.status === 'completed'}
                      >
                        Business
                      </button>
                      <button
                        className={`category-btn personal ${transaction.category === 'Personal' ? 'selected' : ''}`}
                        onClick={() => categorizeTransaction(index, 'Personal')}
                        disabled={selectedSubmission.status === 'completed'}
                      >
                        Personal
                      </button>
                      <button
                        className={`category-btn addback ${transaction.category === 'Add Back' ? 'selected' : ''}`}
                        onClick={() => categorizeTransaction(index, 'Add Back')}
                        disabled={selectedSubmission.status === 'completed'}
                      >
                        Add Back
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Complete Button */}
              {selectedSubmission.status === 'pending' && (
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                  <button
                    onClick={handleComplete}
                    className="btn btn-success"
                    disabled={saving || categorizedCount < transactions.length}
                    style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                  >
                    {saving ? 'Processing...' : 'Complete & Submit'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ClientPortal;
