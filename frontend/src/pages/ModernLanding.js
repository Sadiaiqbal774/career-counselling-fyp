import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readUserQuizData } from '../data/userData';
import './ModernLanding.css';

function ModernLanding() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const features = [
    { title: 'Personalized assessment', icon: '📝', tone: 'tone-1', description: 'A multi-part questionnaire that evaluates academic strengths, interests, and learning style to match you with suitable careers.' },
    { title: 'AI-powered matching', icon: '🤖', tone: 'tone-2', description: 'Machine learning model trained on student data identifies career paths most compatible with your profile and qualifications.' },
    { title: 'University recommendations', icon: '🏫', tone: 'tone-3', description: 'Curated list of institutions offering your recommended programs, with admission merit requirements clearly stated.' },
    { title: 'Actionable next steps', icon: '✨', tone: 'tone-4', description: 'Clear guidance on prerequisites, degree options, and timeline to help you plan your educational path with confidence.' },
  ];

  const methodology = [
    { title: 'Interests & aptitude', description: 'Assessment covers mathematical, scientific, communication, and interpersonal skills through structured questions.' },
    { title: 'Academic alignment', description: 'Your academic background (ICS, Pre-Med, General Science, etc.) is matched against program prerequisites.' },
    { title: 'Career prediction', description: 'Our model evaluates 7 key factors to predict the best-fit career: BSCS, Software Engineering, BBA, or Medical fields.' },
  ];

  const careers = [
    { name: 'Software Engineering', icon: '⚙️' },
    { name: 'Computer Science', icon: '💻' },
    { name: 'Business Administration', icon: '📊' },
    { name: 'Medical Sciences', icon: '🔬' },
  ];

  const faq = [
    { q: 'Is my data secure?', a: 'Yes. All personal data is encrypted and stored securely. We never share your information without consent and comply with data protection standards.' },
    { q: 'Can I retake the assessment?', a: 'Yes. You can take the assessment multiple times. We keep a history so you can track how your interests evolve over time.' },
    { q: 'Are the recommendations accurate?', a: 'Our model is trained on real student data and academic outcomes. Recommendations are meant to guide, not predict. Consider them alongside personal interests and guidance.' },
    { q: 'Which programs does CareerGuide cover?', a: 'Currently focusing on: Computer Science, Software Engineering, Business Administration, and Medical Sciences. We regularly expand based on user demand.' },
  ];

  const testimonials = [
    { name: 'Ayesha Khan', role: 'HSC Student', text: 'I was confused between engineering and medicine. This assessment clarified my strengths and showed me programs I didn\'t even know existed.' },
    { name: 'Hamza Ali', role: 'College Applicant', text: 'The university list was incredibly helpful. Instead of applying randomly, I had a clear merit cutoff and program fit for each institution.' },
    { name: 'Sara Malik', role: 'Career Counselor', text: 'My students find this much more engaging than traditional career guidance. The assessment is evidence-based and the results are actionable.' },
  ];

  return (
    <main className="landing-page-content">
      <section id="features" className="landing-section landing-section--features">
        <div className="landing-section__copy">
          <div className="landing-section__eyebrow">HOW IT WORKS</div>
          <h2 className="landing-section__title">
            Comprehensive assessment that goes beyond <em>generic quizzes.</em>
          </h2>
          <p className="landing-section__body">
            Our assessment evaluates your academic strengths, learning style, interests, and background to provide accurate, personalized career guidance.
          </p>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <div className={`landing-feature-card__icon ${feature.tone}`} aria-hidden="true">
                <span>{feature.icon}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--methodology">
        <div className="landing-section__copy">
          <div className="landing-section__eyebrow">ASSESSMENT METHODOLOGY</div>
          <h2 className="landing-section__title">What we evaluate to predict your career fit.</h2>
        </div>

        <div className="landing-method-grid">
          {methodology.map((item, idx) => (
            <article key={item.title} className="landing-method-card">
              <div className="landing-method-card__number">0{idx + 1}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section__copy">
          <div className="landing-section__eyebrow">AVAILABLE PATHS</div>
          <h2 className="landing-section__title">We recommend across 4 major career sectors.</h2>
          <p className="landing-section__body">Each career path includes university recommendations, program details, and admission requirements.</p>
        </div>

        <div className="landing-career-grid">
          {careers.map((career) => (
            <article key={career.name} className="landing-career-card">
              <div className="landing-career-card__icon">{career.icon}</div>
              <h3>{career.name}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--soft">
        <div className="landing-section__copy">
          <div className="landing-section__eyebrow">FREQUENTLY ASKED</div>
          <h2 className="landing-section__title">Questions we hear from students and counselors.</h2>
        </div>

        <div className="landing-faq-grid">
          {faq.map((item) => (
            <article key={item.q} className="landing-faq-card">
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-privacy-card">
          <div className="landing-section__eyebrow">YOUR PRIVACY & SECURITY</div>
          <h2 className="landing-section__title landing-section__title--compact">Your data is yours. We take confidentiality seriously.</h2>
          <p className="landing-section__body landing-section__body--wide">
            All assessment responses are encrypted and stored securely. We never sell your data or share it with third parties without your explicit consent. Your educational and career information is protected under strict data privacy standards.
          </p>
        </div>
      </section>

      <section id="stories" className="landing-section landing-section--soft">
        <div className="landing-section__copy">
          <div className="landing-section__eyebrow">STUDENT VOICES</div>
          <h2 className="landing-section__title">Real feedback from students and counselors.</h2>
        </div>

        <div className="landing-testimonial-grid">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="landing-testimonial-card">
              <blockquote>&ldquo;{testimonial.text}&rdquo;</blockquote>
              <figcaption>
                <div>{testimonial.name}</div>
                <div>{testimonial.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="landing-section landing-cta-section">
        <div className="landing-cta-card">
          <div className="landing-section__eyebrow">READY TO EXPLORE?</div>
          <h2 className="landing-section__title">Get your personalized career recommendations in 5 minutes.</h2>
          <p className="landing-section__body landing-section__body--wide">
            Join students who have already discovered their ideal career path and university options. Your assessment results are private and stored securely just for you.
          </p>

          <div className="landing-cta-actions">
            {currentUser ? (
              <>
                <button onClick={() => navigate('/quiz')} className="btn-primary-large">Start the assessment</button>
                <button
                  onClick={() => {
                    const { scores } = readUserQuizData(currentUser?.id);
                    if (scores) {
                      navigate('/result');
                    } else {
                      alert('You have not completed the career assessment yet. Redirecting you to take the quiz now!');
                      navigate('/quiz');
                    }
                  }}
                  className="btn-secondary-large"
                >
                  View your results
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/register')} className="btn-primary-large">Create account & start</button>
                <button onClick={() => navigate('/login')} className="btn-secondary-large">Already have an account?</button>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="brand-dark">CareerGuide</div>
          <div className="landing-footer__links">
            <a href="/#features">How it works</a>
            <a href="/#stories">Student voices</a>
            <button onClick={() => navigate('/login')}>Sign in</button>
          </div>
        </div>
        <div className="landing-footer__note">
          <p>© 2026 CareerGuide. All rights reserved. Your assessment data is private and encrypted. We never share your information without consent.</p>
        </div>
      </footer>
    </main>
  );
}

export default ModernLanding;
