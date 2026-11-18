import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readUserQuizData } from '../data/userData';
import './ChatbotWidget.css';

const API_URL = (() => {
  const envUrl = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  if (!envUrl || envUrl.includes('example.com') || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
    if (typeof window !== 'undefined' && window.location && window.location.hostname && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return 'https://career-counselling-fyp.onrender.com';
    }
  }
  return envUrl || (typeof window !== 'undefined' && window.location && !window.location.hostname.includes('localhost') ? 'https://career-counselling-fyp.onrender.com' : 'http://127.0.0.1:5000');
})();

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

function getDefaultMessages(hasCompletedQuiz) {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return [
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
      time: currentTime,
    },
  ];
}

function ChatbotWidget() {
  const { currentUser, getAccessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState([]);
  const listRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  const quizData = readUserQuizData(currentUser?.id);
  const hasCompletedQuiz = Boolean(quizData?.scores);

  const storageKey = `cg_chat_history_${currentUser?.id || 'guest'}`;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return getDefaultMessages(hasCompletedQuiz);
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (_) {}
    setMessages(getDefaultMessages(hasCompletedQuiz));
  }, [currentUser?.id, hasCompletedQuiz, storageKey]);

  useEffect(() => {
    try {
      if (Array.isArray(messages) && messages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch (_) {}
  }, [messages, storageKey]);

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

  const handleSaveChatHistory = () => {
    if (!messages || messages.length === 0) return;
    const userName = currentUser?.name || currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Student');
    const userEmail = currentUser?.email || 'N/A';
    const dateStr = new Date().toLocaleString();

    let transcript = `=================================================================\n`;
    transcript += `CAREERGUIDE - AI COUNSELING CHAT SESSION TRANSCRIPT\n`;
    transcript += `Date & Time : ${dateStr}\n`;
    transcript += `Student     : ${userName} (${userEmail})\n`;
    transcript += `Requirement : FR-07 (AI Chatbot) / UC-07 Step 6 (Save History)\n`;
    transcript += `=================================================================\n\n`;

    messages.forEach((msg) => {
      const role = msg.sender === 'user' ? userName : 'CareerGuide Assistant';
      const time = msg.time ? ` [${msg.time}]` : '';
      transcript += `${role}${time}:\n${msg.text}\n`;
      if (msg.links && msg.links.length > 0) {
        transcript += `Recommended Links: ${msg.links.map((l) => `${l.label} (${l.link})`).join(', ')}\n`;
      }
      transcript += `\n-----------------------------------------------------------------\n\n`;
    });

    try {
      const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const datePart = new Date().toISOString().slice(0, 10);
      link.download = `CareerGuide_Chat_History_${datePart}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSaveNotice('Chat saved!');
      setTimeout(() => setSaveNotice(''), 3000);
    } catch (_) {
      setSaveNotice('Saved locally');
      setTimeout(() => setSaveNotice(''), 3000);
    }
  };

  const handleClearChat = () => {
    const defaults = getDefaultMessages(hasCompletedQuiz);
    setMessages(defaults);
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    } catch (_) {}
    setSaveNotice('Chat reset');
    setTimeout(() => setSaveNotice(''), 2000);
  };

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user', text, time: nowTime };

    setMessages((previous) => [...previous, userMsg]);
    setDraft('');

    const token = await getAccessToken();
    const resolvedUserId = currentUser?.id || null;
    let resolvedUserName = currentUser?.name || currentUser?.displayName;

    if (!resolvedUserName || resolvedUserName === 'Student' || resolvedUserName === 'Visitor') {
      if (currentUser?.email) {
        resolvedUserName = currentUser.email.split('@')[0];
      }
    }
    const resolvedUserEmail = currentUser?.email || null;

    let reply = '';
    let links = [];

    try {
      // 1. Call Backend AI Engine (NLP & Machine Learning Semantic Similarity - FR-07)
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          userId: resolvedUserId,
          userName: resolvedUserName || (resolvedUserId ? 'Student' : 'Visitor'),
          userEmail: resolvedUserEmail,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        reply = data.response || '';
        links = data.links || [];
      } else {
        throw new Error('AI backend query failed');
      }
    } catch (err) {
      // 2. Intelligent Client-Side Fallback if server is unreachable
      const configuredMatch = matchConfiguredResponse(responses, text);
      if (configuredMatch && configuredMatch.response) {
        reply = configuredMatch.response;
        if (configuredMatch.link) {
          links = [{ link: configuredMatch.link, label: configuredMatch.linkLabel || 'Open this page' }];
        }
      } else {
        reply = "I am your CareerGuide AI Counseling Assistant. You can ask me about degree programs (CS, SE, AI, MBBS, Engineering, Business, Law), university cutoffs (NUST, FAST, COMSATS), entry tests (NET, MDCAT, ECAT), or scholarships in Pakistan.";
        links = [
          { link: '/university-recommender', label: 'University Recommender' },
          { link: '/scholarships', label: 'Scholarship Finder' },
        ];
      }
    }

    const botMsg = { sender: 'bot', text: reply, links, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((previous) => [...previous, botMsg]);
  };

  return (
    <div className="chatbot-widget">
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-panel__header">
            <div className="chatbot-panel__title-wrap">
              <span className="chatbot-panel__title">CareerGuide Assistant</span>
              {saveNotice && <span className="chatbot-panel__save-badge">{saveNotice}</span>}
            </div>
            <div className="chatbot-panel__actions">
              <button
                type="button"
                className="chatbot-panel__action-btn"
                onClick={handleSaveChatHistory}
                title="Save chat history (FR-07 / UC-07 Step 6)"
                aria-label="Save chat history"
              >
                💾
              </button>
              <button
                type="button"
                className="chatbot-panel__action-btn"
                onClick={handleClearChat}
                title="Restart chat session"
                aria-label="Restart chat session"
              >
                ↺
              </button>
              <button
                type="button"
                className="chatbot-panel__close-btn"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
          </div>
          <div className="chatbot-panel__messages" ref={listRef}>
            {messages.map((message, index) => (
              <div key={index} className={`chatbot-message chatbot-message--${message.sender}`}>
                <div className="chatbot-message__text">{message.text}</div>
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
                {message.time && <span className="chatbot-message__time">{message.time}</span>}
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
