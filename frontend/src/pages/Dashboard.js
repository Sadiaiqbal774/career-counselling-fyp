import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, logout, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const studentName = currentUser?.name || 'Student';
  const firstName = studentName.split(' ')[0];
  const profileEmail = currentUser?.email || 'No email available';

  const dashboardMetrics = useMemo(
    () => [
      { label: 'Assessment progress', value: '67%', hint: 'You are mid-way through your guidance journey.' },
      { label: 'Saved paths', value: '4', hint: 'Careers matched to your interests and strengths.' },
      { label: 'Recommended universities', value: '12', hint: 'Institutions aligned with your target programs.' },
    ],
    [],
  );

  const recommendedPaths = [
    {
      title: 'Career fit analysis',
      description: 'Review your quiz results and compare how your interests map to technology, business, or medical pathways.',
      action: 'Retake quiz',
      onClick: () => navigate('/general-quiz'),
    },
    {
      title: 'University shortlist',
      description: 'Compare programs, merit requirements, and degree options before you apply to a university.',
      action: 'Open university recommender',
      onClick: () => navigate('/university-recommender'),
    },
    {
      title: 'Scholarship opportunities',
      description: 'Check available scholarships to reduce cost and plan your application timeline more effectively.',
      action: 'Browse scholarships',
      onClick: () => navigate('/scholarships'),
    },
  ];

  const actionItems = [
    { label: 'Conduct quiz', description: 'Start a fresh guidance assessment.', onClick: () => navigate('/general-quiz') },
    { label: 'University recommender', description: 'See universities that match your profile.', onClick: () => navigate('/university-recommender') },
    { label: 'Scholarships', description: 'Explore funding and scholarship options.', onClick: () => navigate('/scholarships') },
  ];

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
      navigate('/', { replace: true });
    } catch (error) {
      setDeleteError(error.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <main className="dashboard-screen">
      <div className="dashboard-shell">
        <section className="dashboard-hero card">
          <div className="dashboard-hero-copy">
            <p className="eyebrow dashboard-eyebrow">Career counselling workspace</p>
            <h1>Welcome back, {firstName}.</h1>
            <p className="muted-text dashboard-intro">
              Your dashboard brings together career match insights, next steps, university suggestions, and account actions in one place.
            </p>

            <div className="dashboard-pills">
              <span>Career guidance</span>
              <span>University planning</span>
              <span>Scholarship support</span>
            </div>
          </div>

          <div className="dashboard-hero-side">
            <div className="dashboard-profile-card">
              <div className="dashboard-avatar">{firstName.charAt(0).toUpperCase()}</div>
              <div>
                <h2>{studentName}</h2>
                <p>{profileEmail}</p>
              </div>
            </div>

            <div className="dashboard-progress-card">
              <div className="dashboard-progress-head">
                <span>Profile completion</span>
                <strong>67%</strong>
              </div>
              <div className="dashboard-progress-track">
                <span className="dashboard-progress-bar" />
              </div>
              <p>Complete the quiz and explore your recommended universities to refine your plan.</p>
            </div>
          </div>
        </section>

        <section className="dashboard-grid dashboard-metrics-grid">
          {dashboardMetrics.map((metric) => (
            <article key={metric.label} className="dashboard-metric-card card">
              <p>{metric.label}</p>
              <h3>{metric.value}</h3>
              <span>{metric.hint}</span>
            </article>
          ))}
        </section>

        <section className="dashboard-grid dashboard-main-grid">
          <div className="dashboard-column">
            <div className="dashboard-section-header">
              <div>
                <p className="eyebrow">Recommended next steps</p>
                <h2>Continue your guidance journey</h2>
              </div>
            </div>

            <div className="dashboard-stack">
              {recommendedPaths.map((item) => (
                <article key={item.title} className="dashboard-feature-card card">
                  <div>
                    <h3>{item.title}</h3>
                    <p className="muted-text">{item.description}</p>
                  </div>
                  <button className="primary-button dashboard-card-button" type="button" onClick={item.onClick}>
                    {item.action}
                  </button>
                </article>
              ))}
            </div>
          </div>

          <aside className="dashboard-sidebar">
            <div className="dashboard-panel card">
              <div className="dashboard-section-header compact">
                <p className="eyebrow">Quick actions</p>
                <h2>Start with one click</h2>
              </div>

              <div className="dashboard-action-list">
                {actionItems.map((item) => (
                  <button key={item.label} className="dashboard-action-item" type="button" onClick={item.onClick}>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-panel card">
              <div className="dashboard-section-header compact">
                <p className="eyebrow">Account</p>
                <h2>Session controls</h2>
              </div>

              <div className="dashboard-account-actions">
                <button className="secondary-button" type="button" onClick={handleLogout}>
                  Logout
                </button>

                <button className="secondary-button dashboard-danger-button" type="button" onClick={handleDeleteAccount} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete account'}
                </button>
              </div>

              {deleteError && <div className="dashboard-error">{deleteError}</div>}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;