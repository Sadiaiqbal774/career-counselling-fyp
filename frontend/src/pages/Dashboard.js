import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
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

  return (
    <main className="cg-dashboard">
      <div className="cg-dashboard__wrap">
        <section className="cg-dashboard__top">
          <article className="cg-card cg-dashboard__welcome">
            <p className="cg-eyebrow">CAREER COUNSELLING WORKSPACE</p>
            <h1 className="cg-dashboard__welcome-title">Welcome, {firstName}.</h1>
            <p className="cg-dashboard__welcome-body">
              Your dashboard brings together career match insights, next steps, and university suggestions in one place.
            </p>
            <div className="cg-dashboard__chips">
              <span className="cg-chip">Career guidance</span>
              <span className="cg-chip">University planning</span>
              <span className="cg-chip">Scholarship support</span>
            </div>
          </article>

          <aside className="cg-card cg-dashboard__profile">
            <div className="cg-dashboard__profile-top">
              <div className="cg-dashboard__avatar" aria-hidden="true">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="cg-dashboard__profile-id">
                <div className="cg-dashboard__profile-name">{studentName}</div>
                <div className="cg-dashboard__profile-email">{profileEmail}</div>
              </div>
            </div>

            <div className="cg-dashboard__completion">
              <span>Profile completion</span>
              <span>67%</span>
            </div>
            <div className="cg-dashboard__progress">
              <span className="cg-dashboard__progress-fill" />
            </div>
            <p className="cg-dashboard__hint">
              Complete the quiz and explore your recommended universities to refine your plan.
            </p>
          </aside>
        </section>

        <section className="cg-dashboard__metrics">
          {dashboardMetrics.map((metric, index) => (
            <article
              key={metric.label}
              className={`cg-card cg-dashboard__metric cg-dashboard__metric--${index}`}
            >
              <div className="cg-dashboard__metric-label">{metric.label}</div>
              <div className="cg-dashboard__metric-value">{metric.value}</div>
              <div className="cg-dashboard__metric-hint">{metric.hint}</div>
            </article>
          ))}
        </section>

        <section className="cg-dashboard__steps">
          <p className="cg-eyebrow cg-center">RECOMMENDED NEXT STEPS</p>
          <h2 className="cg-dashboard__steps-title">Continue your guidance journey</h2>

          <div className="cg-dashboard__steps-list">
            {recommendedPaths.map((item) => (
              <article key={item.title} className="cg-card cg-dashboard__step">
                <div className="cg-dashboard__step-left">
                  <div
                    className={`cg-dashboard__iconbox ${
                      item.title === 'Career fit analysis'
                        ? 'cg-dashboard__iconbox--career'
                        : item.title === 'University shortlist'
                          ? 'cg-dashboard__iconbox--university'
                          : 'cg-dashboard__iconbox--scholarship'
                    }`}
                    aria-hidden="true"
                  >
                    {item.title === 'Career fit analysis' ? '↻' : item.title === 'University shortlist' ? '⌂' : '★'}
                  </div>
                  <div>
                    <div className="cg-dashboard__step-title">{item.title}</div>
                    <div className="cg-dashboard__step-desc">{item.description}</div>
                  </div>
                </div>
                <button className="cg-btn-primary" type="button" onClick={item.onClick}>
                  {item.action}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;