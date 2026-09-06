import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hi! I'm the CareerGuide assistant. Ask me about the quiz, universities, scholarships, or your profile." },
  ]);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

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
    const matched = normalizedText.includes('scholarship') && normalizedText.includes('univers')
      ? {
        response: 'Your quiz results are still available. You can move between scholarship and university recommendations without retaking the quiz.',
        link: normalizedText.includes('univers') ? '/university-recommender' : '/scholarships',
        linkLabel: normalizedText.includes('univers') ? 'Open University Recommender' : 'Open Scholarship Finder',
      }
      : matchResponse(responses, text);
    const reply = matched.response;
    setMessages((previous) => [
      ...previous,
      { sender: 'user', text },
      { sender: 'bot', text: reply, link: matched.link || '', linkLabel: matched.linkLabel || '' },
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
                {message.link && (
                  <Link className="chatbot-message__link" to={message.link} onClick={() => setOpen(false)}>
                    {message.linkLabel || 'Open this page'} →
                  </Link>
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
