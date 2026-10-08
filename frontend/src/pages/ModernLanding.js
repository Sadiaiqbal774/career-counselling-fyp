import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readUserQuizData } from '../data/userData';
import './ModernLanding.css';

function ModernLanding() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleStartAssessment = () => {
    if (currentUser) {
      navigate('/quiz');
    } else {
      navigate('/register');
    }
  };

  const handleViewResults = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const { scores } = readUserQuizData(currentUser?.id);
    if (scores) {
      navigate('/result');
    } else {
      navigate('/quiz');
    }
  };

  const stats = [
    { number: '50+', label: 'Pakistani Universities', desc: 'NUST, FAST, LUMS, COMSATS & more' },
    { number: '100+', label: 'Verified Scholarships', desc: 'HEC, PEEF, Ehsaas & Merit aid' },
    { number: '4', label: 'Core Career Streams', desc: 'CS, Software Eng, BBA, Medical' },
    { number: '5 min', label: 'Assessment Time', desc: 'Accurate AI aptitude matching' },
  ];

  const steps = [
    {
      step: '01',
      title: 'Take the 5-Minute Quiz',
      desc: 'Answer targeted questions about your favorite subjects, interests, and working styles. Designed for Matric, FSc, ICS, and A-Level students.',
      icon: '📝',
    },
    {
      step: '02',
      title: 'AI Evaluates Your Aptitude',
      desc: 'Our trained machine learning model analyzes your academic background and cognitive strengths to predict your highest-potential degree paths.',
      icon: '🧠',
    },
    {
      step: '03',
      title: 'Get Your Actionable Roadmap',
      desc: 'Receive instant match scores, admission merit requirements for top Pakistani universities, and eligible financial aid options.',
      icon: '🎯',
    },
  ];

  const degrees = [
    {
      title: 'Computer Science & AI',
      icon: '💻',
      tag: 'Highest Demand',
      description: 'Study algorithms, machine learning, data structures, and computer architecture to build modern digital systems.',
    },
    {
      title: 'Software Engineering',
      icon: '⚙️',
      tag: 'Rapid Growth',
      description: 'Focus on full-stack development, software architecture, cloud platforms, and large-scale application design.',
    },
    {
      title: 'Business Administration (BBA)',
      icon: '📊',
      tag: 'Versatile Career',
      description: 'Develop executive leadership, financial analytics, marketing strategy, and modern digital entrepreneurship.',
    },
    {
      title: 'Medical & Health Sciences',
      icon: '🔬',
      tag: 'High Impact',
      description: 'Pursue clinical medicine, biomedical research, pharmaceuticals, and allied healthcare disciplines.',
    },
  ];

  const features = [
    {
      title: 'Personalized Aptitude Quiz',
      icon: '📋',
      desc: 'Two-tier assessment tailored to Pakistani educational backgrounds (Pre-Medical, Pre-Engineering, ICS, General Science).',
    },
    {
      title: 'AI-Powered Compatibility',
      icon: '🤖',
      desc: 'Predictive algorithm trained on actual student performance to find your highest-likelihood career fit.',
    },
    {
      title: 'Live University Recommender',
      icon: '🏛️',
      desc: 'Filter institutions across Punjab, Sindh, KPK, Islamabad, and Balochistan by admission criteria and fees.',
    },
    {
      title: 'Verified Scholarship Directory',
      icon: '🎓',
      desc: 'Browse need-based, merit, and government scholarships with income thresholds and application links.',
    },
  ];

  const faqs = [
    {
      q: 'Is this career assessment completely free?',
      a: 'Yes, 100% free! Every student can take the assessment, view comprehensive compatibility results, and explore universities and scholarships without any payment or hidden fees.',
    },
    {
      q: 'Can FSc Pre-Medical students switch to Computer Science or BBA?',
      a: 'Absolutely! Under current HEC guidelines, Pre-Medical graduates are fully eligible for BS Computer Science and BBA programs after completing a basic deficiency math course in their first semester.',
    },
    {
      q: 'How are the university merit recommendations calculated?',
      a: 'We reference recent official admission merit cutoffs, entry test weightages (e.g. NET, ECAT, MDCAT, NTS), and program prerequisites for leading Pakistani universities.',
    },
    {
      q: 'Can I retake the assessment later?',
      a: 'Yes. You can retake the quiz anytime as your academic interests grow. Your results update automatically on your student dashboard.',
    },
    {
      q: 'Is my personal information secure?',
      a: 'We respect student privacy. Your test answers and profile are encrypted and never sold or shared with external advertising third parties.',
    },
  ];

  const testimonials = [
    {
      name: 'Ayesha Khan',
      city: 'HSC Pre-Engineering, Lahore',
      text: 'I was torn between Software Engineering and electrical engineering. This assessment clarified my logical strengths and pointed me straight toward FAST and NUST with clear merit cutoffs.',
      avatar: 'AK',
      stars: 5,
    },
    {
      name: 'Hamza Ali',
      city: 'ICS Student, Islamabad',
      text: 'The scholarship directory alone saved me weeks of searching. I found the HEC Need-Based scholarship details and eligibility requirements in one place without asking anyone.',
      avatar: 'HA',
      stars: 5,
    },
    {
      name: 'Dr. Sara Malik',
      city: 'Academic Counselor, Karachi',
      text: 'I recommend CareerGuide to all my high school and college students. The 2-stage assessment is objective, scientific, and far superior to traditional random quiz sites.',
      avatar: 'SM',
      stars: 5,
    },
  ];

  return (
    <div className="landing-wrapper">
      {/* ========================================================
          HERO SECTION
      ======================================================== */}
      <section className="landing-hero">
        <div className="landing-hero__container">
          <div className="landing-hero__copy">
            <div className="landing-hero__badge">
              <span className="landing-hero__badge-pulse" />
              <span>AI-Powered Career Counselling for Pakistani Students</span>
            </div>

            <h1 className="landing-hero__headline">
              Discover Your Ideal Career & University in Pakistan
            </h1>

            <p className="landing-hero__subtitle">
              Stop guessing your future. Our smart 5-minute assessment evaluates your academic strengths
              and interests to match you with top degrees (CS, SE, BBA, Medical), merit cutoffs at 50+
              universities, and eligible scholarships.
            </p>

            <div className="landing-hero__actions">
              {currentUser ? (
                <>
                  <button type="button" className="landing-btn landing-btn--primary" onClick={handleStartAssessment}>
                    Take Career Assessment →
                  </button>
                  <button type="button" className="landing-btn landing-btn--secondary" onClick={handleViewResults}>
                    View My Results
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="landing-btn landing-btn--primary" onClick={handleStartAssessment}>
                    Start Free Assessment →
                  </button>
                  <button type="button" className="landing-btn landing-btn--secondary" onClick={() => navigate('/login')}>
                    Sign In
                  </button>
                </>
              )}
              <button
                type="button"
                className="landing-btn landing-btn--ghost"
                onClick={() => navigate(currentUser ? '/university-recommender' : '/login')}
              >
                Explore Universities 🏛️
              </button>
            </div>

            <div className="landing-hero__trust-strip">
              <span className="trust-item">✓ 100% Free & Instant</span>
              <span className="trust-divider">•</span>
              <span className="trust-item">✓ 50+ Universities</span>
              <span className="trust-divider">•</span>
              <span className="trust-item">✓ 100+ Scholarships</span>
              <span className="trust-divider">•</span>
              <span className="trust-item">✓ Pre-Med, Eng & ICS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          STATS BANNER
      ======================================================== */}
      <section className="landing-stats-banner">
        <div className="landing-stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="landing-stat-card">
              <div className="landing-stat-card__number">{s.number}</div>
              <div className="landing-stat-card__label">{s.label}</div>
              <div className="landing-stat-card__desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          3-STEP JOURNEY: HOW IT WORKS
      ======================================================== */}
      <section className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-eyebrow">HOW IT WORKS</span>
          <h2 className="landing-section-title">Your 3-Step Journey to the Right Career</h2>
          <p className="landing-section-subtitle">
            Simple, transparent, and evidence-based counselling tailored to Pakistani educational systems.
          </p>
        </div>

        <div className="landing-steps-grid">
          {steps.map((st) => (
            <div key={st.step} className="landing-step-card">
              <div className="landing-step-card__top">
                <span className="landing-step-card__num">{st.step}</span>
                <span className="landing-step-card__icon">{st.icon}</span>
              </div>
              <h3 className="landing-step-card__title">{st.title}</h3>
              <p className="landing-step-card__desc">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          FEATURED DEGREE PATHS
      ======================================================== */}
      <section className="landing-section landing-section--tinted">
        <div className="landing-section-header">
          <span className="landing-section-eyebrow">POPULAR DEGREE PATHS</span>
          <h2 className="landing-section-title">Explore High-Opportunity Programs</h2>
          <p className="landing-section-subtitle">
            Compare Pakistan's top undergraduate disciplines with real merit benchmarks and university targets.
          </p>
        </div>

        <div className="landing-degrees-grid">
          {degrees.map((deg) => (
            <div key={deg.title} className="landing-degree-card">
              <div className="landing-degree-card__header">
                <span className="landing-degree-card__icon">{deg.icon}</span>
                <span className="landing-degree-card__tag">{deg.tag}</span>
              </div>
              <h3 className="landing-degree-card__title">{deg.title}</h3>
              <p className="landing-degree-card__desc">{deg.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          CORE FEATURES
      ======================================================== */}
      <section className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-eyebrow">BUILT FOR STUDENTS</span>
          <h2 className="landing-section-title">Everything You Need for University Planning</h2>
          <p className="landing-section-subtitle">
            All the tools and data you need to make confident choices after Matric or Intermediate.
          </p>
        </div>

        <div className="landing-features-grid">
          {features.map((feat) => (
            <div key={feat.title} className="landing-feat-card">
              <span className="landing-feat-card__icon">{feat.icon}</span>
              <h3 className="landing-feat-card__title">{feat.title}</h3>
              <p className="landing-feat-card__desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          TESTIMONIALS
      ======================================================== */}
      <section className="landing-section landing-section--tinted">
        <div className="landing-section-header">
          <span className="landing-section-eyebrow">STUDENT SUCCESS</span>
          <h2 className="landing-section-title">Loved by Students & Counselors</h2>
          <p className="landing-section-subtitle">
            Read how CareerGuide helped students across Pakistan find direction and clarity.
          </p>
        </div>

        <div className="landing-testimonials-grid">
          {testimonials.map((t) => (
            <div key={t.name} className="landing-test-card">
              <div className="landing-test-card__stars">{'★'.repeat(t.stars)}</div>
              <blockquote className="landing-test-card__quote">&ldquo;{t.text}&rdquo;</blockquote>
              <div className="landing-test-card__author">
                <div className="landing-test-card__avatar">{t.avatar}</div>
                <div>
                  <div className="landing-test-card__name">{t.name}</div>
                  <div className="landing-test-card__city">{t.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          INTERACTIVE FAQ ACCORDION
      ======================================================== */}
      <section className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-eyebrow">FREQUENTLY ASKED QUESTIONS</span>
          <h2 className="landing-section-title">Got Questions? We Have Answers.</h2>
          <p className="landing-section-subtitle">
            Everything you need to know about our assessment, university data, and eligibility rules.
          </p>
        </div>

        <div className="landing-faq-accordion">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className="faq-toggle-icon">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="faq-answer-panel">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          FINAL HIGH-CONVERTING CTA
      ======================================================== */}
      <section className="landing-cta-banner">
        <div className="landing-cta-banner__card">
          <span className="landing-cta-badge">GET STARTED TODAY</span>
          <h2 className="landing-cta-headline">Ready to Find Your Ideal Degree & University?</h2>
          <p className="landing-cta-body">
            Take our 5-minute personalized assessment and discover career paths where you are most likely to thrive.
            It's free, confidential, and built for your success.
          </p>
          <div className="landing-cta-actions">
            {currentUser ? (
              <button type="button" className="landing-btn landing-btn--primary-gold" onClick={handleStartAssessment}>
                Go to Career Assessment →
              </button>
            ) : (
              <>
                <button type="button" className="landing-btn landing-btn--primary-gold" onClick={() => navigate('/register')}>
                  Create Free Account & Start →
                </button>
                <button type="button" className="landing-btn landing-btn--ghost-white" onClick={() => navigate('/login')}>
                  Already have an account? Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          CLEAN LANDING FOOTER
      ======================================================== */}
      <footer className="landing-footer-main">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <div className="footer-logo">
              <span className="footer-logo__tile">CG</span>
              <span className="footer-logo__name">CareerGuide</span>
            </div>
            <p className="footer-desc">
              Pakistan's comprehensive AI career counselling platform, helping students navigate degree
              selection, admission merits, and scholarships with evidence-based guidance.
            </p>
          </div>

          <div className="landing-footer-links-group">
            <div className="footer-col">
              <h4>Platform</h4>
              <button type="button" onClick={() => navigate(currentUser ? '/quiz' : '/login')}>Aptitude Quiz</button>
              <button type="button" onClick={() => navigate(currentUser ? '/university-recommender' : '/login')}>Universities</button>
              <button type="button" onClick={() => navigate(currentUser ? '/scholarships' : '/login')}>Scholarships</button>
              <button type="button" onClick={() => navigate(currentUser ? '/dashboard' : '/login')}>Dashboard</button>
            </div>

            <div className="footer-col">
              <h4>Account</h4>
              <button type="button" onClick={() => navigate('/login')}>Sign In</button>
              <button type="button" onClick={() => navigate('/register')}>Register</button>
              <button type="button" onClick={() => navigate('/admin/login')}>Admin Portal</button>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p>© 2026 CareerGuide. All rights reserved. Designed for student empowerment across Pakistan.</p>
          <p className="footer-sec-note">All student assessment scores and credentials remain strictly confidential.</p>
        </div>
      </footer>
    </div>
  );
}

export default ModernLanding;
