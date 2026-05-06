import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, logout, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteAccount();
      // Redirect to landing page after successful deletion
      navigate('/', { replace: true });
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="card hero-card">
        
        <p className="eyebrow">Career Guidance Prototype</p>

        <h1>Career Counselling Dashboard</h1>

        <p className="muted-text">
          {currentUser
            ? `Welcome back, ${currentUser.name}.`
            : 'Take a short quiz to explore which career path fits your interests best.'}
        </p>

        <div className="button-row">

          {/* Conduct Quiz Button */}
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate('/general-quiz')}
          >
            Conduct Quiz
          </button>

          {/* University Recommender Button */}
          <button
         
              className="primary-button"
            type="button"
            onClick={() => navigate('/university-recommender')}
          >
            🎓 University Recommender
          </button>
<button
  className="primary-button"
  type="button"
  onClick={() => navigate('/scholarships')}
>
  🎓 Scholarships
</button>
          {/* Logout Button */}
          <button
            className="secondary-button"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>

          {/* Delete Account Button */}
          <button
            className="secondary-button"
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            style={{ backgroundColor: '#dc3545' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>

        </div>

        {deleteError && (
          <div style={{ color: '#dc3545', marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
            {deleteError}
          </div>
        )}
      </section>
    </main>
  );
}

export default Dashboard;