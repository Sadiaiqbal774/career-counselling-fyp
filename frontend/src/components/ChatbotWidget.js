import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readUserQuizData } from '../data/userData';
import './ChatbotWidget.css';

const API_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').trim().replace(/\/+$/, '');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches user input against admin-configured auto-responses (FR-14)
function matchConfiguredResponse(responses, message) {
  if (!Array.isArray(responses) || responses.length === 0) return null;
  const text = message.toLowerCase().trim();
  const withKeywords = responses.filter((entry) => (entry.keyword || '').trim());

  let bestMatch = null;
  let highestScore = 0;

  for (const entry of withKeywords) {
    const rawKeywords = entry.keyword.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
    for (const keyword of rawKeywords) {
      if (!keyword) continue;

      // 1. Exact full text match or normalized string match
      if (text === keyword) {
        return entry; // Perfect direct match
      }

      // 2. Keyword match: phrase containment or word-boundary match
      let isMatch = false;
      if (keyword.includes(' ')) {
        // Multi-word phrase: e.g. "after quiz", "what next", "fee concession"
        if (text.includes(keyword)) isMatch = true;
      } else {
        // Single word: word boundary regex
        const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
        if (regex.test(text) || text.includes(keyword)) isMatch = true;
      }

      if (isMatch) {
        // Longer keyword phrases are more specific, giving higher priority
        const score = keyword.length;
        if (score > highestScore) {
          highestScore = score;
          bestMatch = entry;
        }
      }
    }
  }

  return bestMatch;
}

function matchResponse(responses, message) {
  const configured = matchConfiguredResponse(responses, message);
  if (configured) return configured;
  const fallback = responses.find((entry) => !(entry.keyword || '').trim());
  return fallback || { response: "I'm not sure about that yet — try asking about the quiz, universities, scholarships, or your profile." };
}

function ChatbotWidget() {
  const { currentUser, getAccessToken } = useAuth();
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

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const normalizedText = text.toLowerCase();
    let reply = '';
    let links = [];

    // 1. Check Admin-Configured Auto-Responses FIRST (FR-14)
    // Whatever the admin sets in chatbot_responses.json takes precedence over hardcoded rules
    const configuredMatch = matchConfiguredResponse(responses, text);
    if (configuredMatch && configuredMatch.response) {
      reply = configuredMatch.response;
      if (configuredMatch.link) {
        links = [{ link: configuredMatch.link, label: configuredMatch.linkLabel || 'Open this page' }];
      }
    }
    // 2. Scholarships intent fallback
    else if (
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
    // 3. Explicit retake quiz request
    else if (
      (normalizedText.includes('retake') || normalizedText.includes('restart') || normalizedText.includes('redo') || normalizedText.includes('again') || normalizedText.includes('reset')) &&
      (normalizedText.includes('quiz') || normalizedText.includes('test') || normalizedText.includes('assessment'))
    ) {
      reply = "If you would like to update your answers or explore other fields, you can retake the career assessment at any time.";
      links = [{ link: '/quiz', label: 'Retake Assessment' }];
    }
    // 4. Post-quiz / Assessment status / Quiz general query
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
    // 5. Results / Score / Recommendations
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
    // 6. Universities / Degree Programs / Admissions
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
    // 7. Profile / Academic marks
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
    // 8. Dark Mode / Theme / Settings
    else if (
      normalizedText.includes('dark mode') ||
      normalizedText.includes('theme') ||
      normalizedText.includes('settings') ||
      normalizedText.includes('night mode')
    ) {
      reply = "You can enable or disable Dark Mode, change your password, or configure preferences in Profile.";
      links = [{ link: '/profile', label: 'Open Profile' }];
    }
    // 9. Default Fallback
    else {
      const fallback = responses.find((entry) => !(entry.keyword || '').trim());
      reply = fallback ? fallback.response : "I can help you with your assessment results, university recommendations, scholarships, or your profile. What would you like to know?";
    }

    setMessages((previous) => [
      ...previous,
      { sender: 'user', text },
      { sender: 'bot', text: reply, links },
    ]);
    setDraft('');

    const token = await getAccessToken();
    fetch(`${API_URL}/api/chatbot/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: text,
        response: reply
      }),
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
