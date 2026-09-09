import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readUserQuizData } from '../data/userData';
import './ChatbotWidget.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchResponse(responses, message) {
  const text = message.toLowerCase();
  const withKeywords = responses.filter((entry) => (entry.keyword || '').trim());
  for (const entry of withKeywords) {
    const keywords = entry.keyword.split(',').map((word) => word.trim().toLowerCase()).filter(Boolean);
    const matched = keywords.some((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`).test(text));
    if (matched) {
      return entry;
    }
  }
  const fallback = responses.find((entry) => !(entry.keyword || '').trim());
  return fallback || { response: "I'm not sure about that yet — try asking about the quiz, universities, scholarships, or your profile." };
}

function ChatbotWidget() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState([]);
  const listRef = useRef(null);
  const [draft, setDraft] = useState('');

  const quizData = readUserQuizData(currentUser?.id);
  const hasCompletedQuiz = Boolean(quizData?.scores);

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: hasCompletedQuiz
        ? "Hi! I'm the CareerGuide assistant. Your assessment is complete and saved! Ask me about your results, recommended universities, scholarships, or your profile."
        : "Hi! I'm the CareerGuide assistant. Ask me about taking the career quiz, universities, scholarships, or your profile.",
      links: hasCompletedQuiz
        ? [
            { link: '/result', label: 'View Assessment Results' },
            { link: '/university-recommender', label: 'University Recommender' },
            { link: '/scholarships', label: 'Scholarship Finder' },
          ]
        : [
            { link: '/quiz', label: 'Start Career Quiz' },
            { link: '/scholarships', label: 'Browse Scholarships' },
          ],
    },
  ]);

  useEffect(() => {
    fetch(`${API_URL}/api/chatbot/responses`)
      .then((response) => response.json())
      .then((data) => setResponses(data.responses || []))
      .catch(() => setResponses([]));
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (currentUser?.isAdmin) {
    return null;
  }

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const normalizedText = text.toLowerCase();
    let reply = '';
    let links = [];

    // 1. Scholarships intent (highest priority so queries mentioning 'test score' or 'after quiz' never redirect to taking quiz)
    if (
      normalizedText.includes('scholarship') ||
      normalizedText.includes('financial aid') ||
      normalizedText.includes('funding') ||
      normalizedText.includes('fee waiver') ||
      normalizedText.includes('concession')
    ) {
      if (hasCompletedQuiz) {
        reply = "Your assessment scores and profile marks are safely recorded! You can browse eligible merit-based and need-based scholarships in the Scholarship Finder. You do not need to take any new test or quiz.";
        links = [
          { link: '/scholarships', label: 'Open Scholarship Finder' },
          { link: '/university-recommender', label: 'University Recommender' },
        ];
      } else {
        reply = "Browse the Scholarship Finder to explore merit-based and need-based financial aid opportunities across Pakistan. You can also take our quick career quiz to identify your ideal field.";
        links = [
          { link: '/scholarships', label: 'Open Scholarship Finder' },
          { link: '/quiz', label: 'Take Career Quiz' },
        ];
      }
    }
    // 2. Explicit retake quiz request
    else if (
      (normalizedText.includes('retake') || normalizedText.includes('restart') || normalizedText.includes('redo') || normalizedText.includes('again') || normalizedText.includes('reset')) &&
      (normalizedText.includes('quiz') || normalizedText.includes('test') || normalizedText.includes('assessment'))
    ) {
      reply = "If you would like to update your answers or explore other fields, you can retake the career assessment at any time.";
      links = [{ link: '/quiz', label: 'Retake Assessment' }];
    }
    // 3. Post-quiz / Assessment status / Quiz general query
    else if (
      normalizedText.includes('quiz') ||
      normalizedText.includes('assessment') ||
      normalizedText.includes('career test') ||
      (normalizedText.includes('test') && !normalizedText.includes('entry test'))
    ) {
      if (hasCompletedQuiz) {
        reply = "You have already completed your career assessment! Your results and career matches are safely stored. You do not need to retake the quiz unless you want to change your answers.";
        links = [
          { link: '/result', label: 'View Assessment Results' },
          { link: '/university-recommender', label: 'Open University Recommender' },
        ];
      } else {
        reply = "You can take the career assessment anytime! It takes only 5 minutes, evaluating your academic background and interests to match you with top degrees and careers.";
        links = [{ link: '/quiz', label: 'Start Career Quiz' }];
      }
    }
    // 4. Results / Score / Recommendations
    else if (
      normalizedText.includes('result') ||
      normalizedText.includes('recommendation') ||
      normalizedText.includes('my score') ||
      normalizedText.includes('view result')
    ) {
      if (hasCompletedQuiz) {
        reply = "Your assessment results are ready to view! Check your full category breakdown and career recommendations on the Results page.";
        links = [
          { link: '/result', label: 'View Results' },
          { link: '/university-recommender', label: 'Explore Universities' },
        ];
      } else {
        reply = "You haven't completed the career assessment yet. Complete the 5-minute quiz to generate your personalized career results!";
        links = [{ link: '/quiz', label: 'Start Career Quiz' }];
      }
    }
    // 5. Universities / Degree Programs / Admissions
    else if (
      normalizedText.includes('universit') ||
      normalizedText.includes('college') ||
      normalizedText.includes('admission') ||
      normalizedText.includes('degree') ||
      normalizedText.includes('program') ||
      normalizedText.includes('merit')
    ) {
      if (hasCompletedQuiz) {
        reply = "Your profile marks and assessment scores are already connected with the University Recommender! You can view programs and university options matched to you.";
        links = [{ link: '/university-recommender', label: 'Open University Recommender' }];
      } else {
        reply = "Use the University Recommender to find universities across Pakistan. We recommend completing the quick assessment first so we can recommend programs suited to your strengths.";
        links = [
          { link: '/university-recommender', label: 'Open University Recommender' },
          { link: '/quiz', label: 'Take Quiz First' },
        ];
      }
    }
    // 6. Profile / Academic marks
    else if (
      normalizedText.includes('profile') ||
      normalizedText.includes('account') ||
      normalizedText.includes('marks') ||
      normalizedText.includes('matric') ||
      normalizedText.includes('inter') ||
      normalizedText.includes('phone') ||
      normalizedText.includes('city')
    ) {
      reply = "You can update your personal information, intermediate marks, and entry test scores from your Profile anytime. Your recommendations update automatically.";
      links = [{ link: '/profile', label: 'Open Your Profile' }];
    }
    // 7. Dark Mode / Theme / Settings
    else if (
      normalizedText.includes('dark mode') ||
      normalizedText.includes('theme') ||
      normalizedText.includes('settings') ||
      normalizedText.includes('night mode')
    ) {
      reply = "You can enable or disable Dark Mode, change your password, or configure preferences in Settings.";
      links = [{ link: '/settings', label: 'Open Settings' }];
    }
    // 8. Fallback to API match or smart default
    else {
      const matched = matchResponse(responses, text);
      reply = matched.response;
      if (matched.link) {
        links = [{ link: matched.link, label: matched.linkLabel || 'Open this page' }];
      }
    }

    setMessages((previous) => [
      ...previous,
      { sender: 'user', text },
      { sender: 'bot', text: reply, links },
    ]);
    setDraft('');

    fetch(`${API_URL}/api/chatbot/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser?.id || null, message: text, response: reply }),
    }).catch(() => {});
  };

  return (
    <div className="chatbot-widget">
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-panel__header">
            <span>CareerGuide Assistant</span>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chatbot-panel__messages" ref={listRef}>
            {messages.map((message, index) => (
              <div key={index} className={`chatbot-message chatbot-message--${message.sender}`}>
                {message.text}
                {message.links && message.links.length > 0 && (
                  <div className="chatbot-message__links">
                    {message.links.map((item, i) => (
                      <Link
                        key={i}
                        className="chatbot-message__link"
                        to={item.link}
                        onClick={() => setOpen(false)}
                      >
                        {item.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form className="chatbot-panel__input" onSubmit={send}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              aria-label="Chat message"
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="chatbot-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}

export default ChatbotWidget;
