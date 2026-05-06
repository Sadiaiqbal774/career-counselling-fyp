import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
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

        </div>
      </section>
    </main>
  );
}

export default Dashboard;