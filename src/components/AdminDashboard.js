import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Papa from 'papaparse';
import emailjs from '@emailjs/browser';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
    loadSubmissions();
  }, []);

  async function loadClients() {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'client'));
      const snapshot = await getDocs(q);
      const clientsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading clients:', error);
      setLoading(false);
    }
  }

  async function loadSubmissions() {
    try {
      const submissionsRef = collection(db, 'submissions');
      const q = query(submissionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const submissionsList = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          // Get client name
          const clientDoc = await getDoc(doc(db, 'users', data.clientId));
          return {
            id: docSnap.id,
            ...data,
            clientName: clientDoc.exists() ? clientDoc.data().name : 'Unknown'
          };
        })
      );
      setSubmissions(submissionsList);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();

    if (!file || !selectedClient) {
      setMessage({ text: 'Please select a client and a CSV file', type: 'error' });
      return;
    }

    setUploading(true);
    setMessage({ text: '', type: '' });

    try {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            // Upload CSV to storage
            const storageRef = ref(storage, `uploads/${selectedClient}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const fileUrl = await getDownloadURL(storageRef);

            // Create submission document
            const submissionData = {
              clientId: selectedClient,
              fileName: file.name,
              fileUrl,
              transactions: results.data.filter(row => Object.values(row).some(val => val)),
              status: 'pending',
              createdAt: new Date().toISOString(),
              uploadedBy: currentUser.uid
            };

            const docRef = await addDoc(collection(db, 'submissions'), submissionData);

            // Send email notification to client
            const clientData = clients.find(c => c.id === selectedClient);
            if (clientData) {
              try {
                await emailjs.send(
                  process.env.REACT_APP_EMAILJS_SERVICE_ID,
                  process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
                  {
                    to_email: clientData.email,
                    to_name: clientData.name,
                    message: `A new transaction file (${file.name}) has been uploaded for your review. Please log in to BooksEasy to categorize your transactions.`
                  },
                  process.env.REACT_APP_EMAILJS_PUBLIC_KEY
                );
              } catch (emailError) {
                console.error('Email notification failed:', emailError);
                // Don't fail the upload if email fails
              }
            }

            setMessage({ text: 'File uploaded successfully!', type: 'success' });
            setFile(null);
            setSelectedClient('');
            loadSubmissions();
          } catch (error) {
            console.error('Error saving submission:', error);
            setMessage({ text: 'Error uploading file: ' + error.message, type: 'error' });
          }
          setUploading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setMessage({ text: 'Error parsing CSV file', type: 'error' });
          setUploading(false);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: 'Error uploading file: ' + error.message, type: 'error' });
      setUploading(false);
    }
  }

  async function handleDownloadReport(submission) {
    try {
      if (submission.completedFileUrl) {
        window.open(submission.completedFileUrl, '_blank');
      } else {
        setMessage({ text: 'Report not available yet', type: 'error' });
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      setMessage({ text: 'Error downloading report', type: 'error' });
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
        <h1>BooksEasy - Admin Dashboard</h1>
        <div className="header-actions">
          <span className="user-info">Admin</span>
          <button onClick={logout} className="btn btn-logout">Logout</button>
        </div>
      </header>

      <main className="main-content">
        {/* Stats */}
        <div className="dashboard-grid">
          <div className="stat-card">
            <h3>Total Clients</h3>
            <div className="stat-value">{clients.length}</div>
          </div>
          <div className="stat-card">
            <h3>Total Submissions</h3>
            <div className="stat-value">{submissions.length}</div>
          </div>
          <div className="stat-card">
            <h3>Pending Review</h3>
            <div className="stat-value">
              {submissions.filter(s => s.status === 'pending').length}
            </div>
          </div>
          <div className="stat-card">
            <h3>Completed</h3>
            <div className="stat-value">
              {submissions.filter(s => s.status === 'completed').length}
            </div>
          </div>
        </div>

        {/* Upload CSV */}
        <div className="card">
          <h2>Upload Transaction File</h2>
          {message.text && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}
          <form onSubmit={handleFileUpload}>
            <div className="form-group">
              <label>Select Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                required
              >
                <option value="">-- Select a client --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </form>
        </div>

        {/* Submissions List */}
        <div className="card">
          <h2>Submission History</h2>
          {submissions.length === 0 ? (
            <div className="empty-state">
              <h3>No submissions yet</h3>
              <p>Upload a CSV file to get started</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
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
                      <td>{submission.clientName}</td>
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
                        {submission.status === 'completed' && (
                          <button
                            onClick={() => handleDownloadReport(submission)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                          >
                            Download
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
      </main>
    </div>
  );
}

export default AdminDashboard;
