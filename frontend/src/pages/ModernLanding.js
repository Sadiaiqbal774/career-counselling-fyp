import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ModernLanding.css';

function ModernLanding() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  const features = [
    { title: 'Personalized assessment', description: 'A multi-part questionnaire that evaluates academic strengths, interests, and learning style to match you with suitable careers.' },
    { title: 'AI-powered matching', description: 'Machine learning model trained on student data identifies career paths most compatible with your profile and qualifications.' },
    { title: 'University recommendations', description: 'Curated list of institutions offering your recommended programs, with admission merit requirements clearly stated.' },
    { title: 'Actionable next steps', description: 'Clear guidance on prerequisites, degree options, and timeline to help you plan your educational path with confidence.' },
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

  const stats = [
    { value: '5-7 min', label: 'to complete the assessment' },
    { value: '4', label: 'major career paths' },
    { value: '50+', label: 'partner institutions' },
  ];

  return (
    <div className="min-h-screen bg-beige text-brown">
      <header className="sticky top-0 z-40 border-b border-[rgba(43,33,24,0.06)] bg-beige/90 modern-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#e9d9c9,#d6bfa8)] text-sm font-black text-brown shadow-sm">CG</div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">CareerGuide</div>
              <div className="text-xs text-brown-muted">Professional career guidance</div>
            </div>
          </button>

          <nav className="hidden items-center gap-8 md:flex modern-header">
            <a href="#features" className="text-sm text-brown-muted">How it works</a>
            <a href="#stories" className="text-sm text-brown-muted">Student voices</a>
            {currentUser ? (
              <>
                <span className="text-sm text-brown-muted">Hi, {currentUser.name.split(' ')[0]}</span>
                <button onClick={() => navigate('/dashboard')} className="nav-btn-secondary">Dashboard</button>
                <button onClick={() => { logout(); navigate('/'); }} className="nav-btn-primary">Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="nav-btn-secondary">Sign in</button>
                <button onClick={() => navigate('/register')} className="nav-btn-primary">Create account</button>
              </>
            )}
          </nav>

          <button onClick={() => setMobileMenuOpen((v) => !v)} className="rounded-full border border-[rgba(43,33,24,0.06)] p-3 md:hidden" aria-label="Toggle navigation">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[rgba(43,33,24,0.06)] bg-beige/95 px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-3">
              <a href="#features" className="rounded-xl px-3 py-2 text-brown-muted">How it works</a>
              <a href="#stories" className="rounded-xl px-3 py-2 text-brown-muted">Student voices</a>
              {currentUser ? (
                <>
                  <button onClick={() => navigate('/dashboard')} className="nav-btn-secondary-mobile">Dashboard</button>
                  <button onClick={() => { logout(); navigate('/'); }} className="nav-btn-primary-mobile">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="nav-btn-secondary-mobile">Sign in</button>
                  <button onClick={() => navigate('/register')} className="nav-btn-primary-mobile">Create account</button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <div className="modern-hero">
            <div className="hero-copy">
              <div className="hero-brand">CareerGuide</div>

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(43,33,24,0.06)] bg-[rgba(214,191,168,0.12)] px-4 py-2 text-sm text-brown-muted">
                <span className="h-2 w-2 rounded-full bg-[rgba(91,70,54,0.9)]" />
                {currentUser ? `Welcome back, ${currentUser.name}` : 'Data-driven career guidance for Pakistani students'}
              </div>

              <h1>Know yourself. Choose your path. Own your future.</h1>

              <p className="lead mt-6">CareerGuide uses artificial intelligence to match your academic strengths, interests, and background with the right career paths and universities. Get personalized, research-backed recommendations in minutes—not months of uncertainty.</p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {currentUser ? (
                  <>
                    <button onClick={() => navigate('/quiz')} className="btn-primary-large">Take the assessment</button>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary-large">Explore dashboard</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate('/register')} className="btn-primary-large">Create account</button>
                    <button onClick={() => navigate('/login')} className="btn-secondary-large">Sign in</button>
                  </>
                )}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[rgba(43,33,24,0.06)] bg-[rgba(255,255,255,0.6)] p-4">
                    <div className="text-2xl font-semibold text-brown">{stat.value}</div>
                    <div className="mt-1 text-sm text-brown-muted">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <figure className="mockup-figure">
                <img src="/landing-hero.svg" alt="Wide career guidance dashboard illustration" />
              </figure>
            </div>
          </div>
        </section>

        <section className="border-y border-[rgba(43,33,24,0.06)] bg-[rgba(255,255,255,0.6)] py-14">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
            {['AI-powered assessment','Based on real student data','Covers 4 major career paths','100% confidential & secure'].map((item) => (
              <div key={item} className="rounded-2xl border border-[rgba(43,33,24,0.06)] bg-transparent p-5 text-sm text-brown-muted">{item}</div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">How it works</div>
            <h2 className="mt-3 text-3xl font-semibold text-brown sm:text-4xl">Comprehensive assessment that goes beyond generic quizzes.</h2>
            <p className="mt-4 text-brown-muted">Our assessment evaluates your academic strengths, learning style, interests, and background to provide accurate, personalized career guidance.</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="card-hover rounded-[1.5rem] border border-[rgba(43,33,24,0.04)] bg-[rgba(43,33,24,0.03)] p-6">
                <div className="h-12 w-12 rounded-2xl bg-[rgba(214,191,168,0.12)]" />
                <h3 className="mt-5 text-lg font-semibold text-brown">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-brown-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[rgba(43,33,24,0.06)] bg-[rgba(255,255,255,0.6)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">Assessment methodology</div>
              <h2 className="mt-3 text-3xl font-semibold text-brown sm:text-4xl">What we evaluate to predict your career fit.</h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {methodology.map((item, idx) => (
                <div key={item.title} className="card-hover rounded-[1.5rem] border border-[rgba(43,33,24,0.04)] bg-transparent p-6">
                  <div className="text-sm font-semibold tracking-[0.24em] text-brown-muted">0{idx + 1}</div>
                  <h3 className="mt-4 text-xl font-semibold text-brown">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-brown-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">Available paths</div>
            <h2 className="mt-3 text-3xl font-semibold text-brown sm:text-4xl">We recommend across 4 major career sectors.</h2>
            <p className="mt-4 text-brown-muted">Each career path includes university recommendations, program details, and admission requirements.</p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {careers.map((career) => (
              <div key={career.name} className="card-hover rounded-[1.5rem] border border-[rgba(43,33,24,0.04)] bg-[rgba(43,33,24,0.03)] p-6 text-center">
                <div className="text-4xl">{career.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-brown">{career.name}</h3>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[rgba(43,33,24,0.06)] bg-[rgba(255,255,255,0.6)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">Frequently asked</div>
              <h2 className="mt-3 text-3xl font-semibold text-brown sm:text-4xl">Questions we hear from students and counselors.</h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {faq.map((item) => (
                <div key={item.q} className="rounded-[1.5rem] border border-[rgba(43,33,24,0.04)] bg-transparent p-6">
                  <h3 className="font-semibold text-brown">{item.q}</h3>
                  <p className="mt-3 text-sm leading-6 text-brown-muted">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-[rgba(43,33,24,0.04)] bg-[linear-gradient(180deg,rgba(214,191,168,0.06),rgba(255,255,255,0.02))] p-8 shadow-sm sm:p-10">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">Your privacy & security</div>
              <h2 className="mt-3 text-2xl font-semibold text-brown">Your data is yours. We take confidentiality seriously.</h2>
              <p className="mt-4 max-w-2xl text-brown-muted">All assessment responses are encrypted and stored securely. We never sell your data or share it with third parties without your explicit consent. Your educational and career information is protected under strict data privacy standards.</p>
            </div>
          </div>
        </section>

        <section id="stories" className="border-y border-[rgba(43,33,24,0.06)] bg-[rgba(255,255,255,0.6)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">Student voices</div>
              <h2 className="mt-3 text-3xl font-semibold text-brown sm:text-4xl">Real feedback from students and counselors.</h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <figure key={testimonial.name} className="card-hover rounded-[1.5rem] border border-[rgba(43,33,24,0.04)] bg-transparent p-6">
                  <blockquote className="text-sm leading-7 text-brown-muted">&ldquo;{testimonial.text}&rdquo;</blockquote>
                  <figcaption className="mt-6 border-t border-[rgba(43,33,24,0.06)] pt-4">
                    <div className="font-semibold text-brown">{testimonial.name}</div>
                    <div className="text-sm text-brown-muted">{testimonial.role}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-[rgba(43,33,24,0.04)] bg-[linear-gradient(180deg,rgba(214,191,168,0.06),rgba(255,255,255,0.02))] p-8 shadow-sm sm:p-10">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-brown-muted">Ready to explore?</div>
              <h2 className="mt-3 text-3xl font-semibold text-brown sm:text-4xl">Get your personalized career recommendations in 5 minutes.</h2>
              <p className="mt-4 max-w-2xl text-brown-muted">Join students who have already discovered their ideal career path and university options. Your assessment results are private and stored securely just for you.</p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {currentUser ? (
                <>
                  <button onClick={() => navigate('/quiz')} className="btn-primary-large">Start the assessment</button>
                  <button onClick={() => navigate('/dashboard')} className="btn-secondary-large">View your results</button>
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
      </main>

      <footer className="border-t border-[rgba(43,33,24,0.06)] bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-brown-muted sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="brand-dark">CareerGuide</div>
            <div className="flex gap-5">
              <a href="#features" className="transition text-brown-muted hover:text-brown">How it works</a>
              <a href="#stories" className="transition text-brown-muted hover:text-brown">Student voices</a>
              <button onClick={() => navigate('/login')} className="transition text-brown-muted hover:text-brown">Sign in</button>
            </div>
          </div>
          <div className="mt-6 border-t border-[rgba(43,33,24,0.06)] pt-6 text-xs text-brown-muted">
            <p>© 2026 CareerGuide. All rights reserved. Your assessment data is private and encrypted. We never share your information without consent.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ModernLanding;
