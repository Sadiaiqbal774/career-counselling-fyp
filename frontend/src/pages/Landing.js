import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <div className="brand">CareerGuide</div>
        <div className="nav-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            Get Started
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Discover Your Perfect Career Path</h1>
          <p className="hero-sub">Take a short, smart quiz to reveal career options that match your interests and strengths.</p>

          <div className="hero-cta">
            <button className="btn btn-primary" onClick={() => navigate('/quiz')}>Conduct Quiz</button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </section>

      <section className="features">
        <h2 className="section-heading">Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>Smart Quiz</h3>
            <p>Adaptive, quick questions to reveal your interests.</p>
          </div>
          <div className="feature-card">
            <h3>Accurate Results</h3>
            <p>Clear scoring and top recommendations based on your answers.</p>
          </div>
          <div className="feature-card">
            <h3>University Guidance</h3>
            <p>Next-step suggestions for courses and study paths.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div>CareerGuide © {new Date().getFullYear()}</div>
      </footer>
    </main>
  );
}

export default Landing;
