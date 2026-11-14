import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getBookmarks, toggleItemBookmark } from '../data/bookmarkData';
import { formatApplyUrl } from './ScholarshipFinder';
import { formatUniversityLinks } from './UniversityRecommender';
import './SavedOpportunities.css';

function SavedOpportunities() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [bookmarks, setBookmarks] = useState({ universities: [], scholarships: [] });
  const [activeTab, setActiveTab] = useState('all');

  const loadBookmarks = () => {
    setBookmarks(getBookmarks(currentUser?.id));
  };

  useEffect(() => {
    loadBookmarks();
  }, [currentUser?.id]);

  const handleRemoveBookmark = (type, item) => {
    toggleItemBookmark(currentUser?.id, type, item);
    loadBookmarks();
    toast.success('Removed from saved opportunities');
  };

  const uniCount = bookmarks.universities?.length || 0;
  const schCount = bookmarks.scholarships?.length || 0;
  const totalCount = uniCount + schCount;

  return (
    <div className="saved-page">
      <div className="saved-container">
        {/* Navigation & Header */}
        <div className="saved-top-nav">
          <button
            type="button"
            className="saved-nav-btn"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
          <div className="saved-top-actions">
            <button
              type="button"
              className="saved-action-link"
              onClick={() => navigate('/university-recommender')}
            >
              🏛️ Explore Universities
            </button>
            <button
              type="button"
              className="saved-action-link"
              onClick={() => navigate('/scholarships')}
            >
              🎓 Find Scholarships
            </button>
          </div>
        </div>

        <header className="saved-header">
          <div className="saved-header-badge">⭐ Saved Opportunities</div>
          <h1 className="saved-title">Your Saved Opportunities</h1>
          <p className="saved-subtitle">
            Easily manage and apply to all the universities and scholarships you bookmarked during your research.
          </p>

          {/* Filter Tabs */}
          <div className="saved-tabs">
            <button
              type="button"
              className={`saved-tab ${activeTab === 'all' ? 'saved-tab--active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`saved-tab ${activeTab === 'universities' ? 'saved-tab--active' : ''}`}
              onClick={() => setActiveTab('universities')}
            >
              🏛️ Universities ({uniCount})
            </button>
            <button
              type="button"
              className={`saved-tab ${activeTab === 'scholarships' ? 'saved-tab--active' : ''}`}
              onClick={() => setActiveTab('scholarships')}
            >
              🎓 Scholarships ({schCount})
            </button>
          </div>
        </header>

        {/* Content Body */}
        {totalCount === 0 ? (
          <div className="saved-empty-card">
            <div className="saved-empty-icon" aria-hidden="true">⭐</div>
            <h2>No saved opportunities yet</h2>
            <p>
              When you explore universities or scholarships, click the <strong>Save</strong> button on any card to keep track of them here.
            </p>
            <div className="saved-empty-actions">
              <button
                type="button"
                className="saved-btn saved-btn--primary"
                onClick={() => navigate('/university-recommender')}
              >
                Explore Universities
              </button>
              <button
                type="button"
                className="saved-btn saved-btn--secondary"
                onClick={() => navigate('/scholarships')}
              >
                Find Scholarships
              </button>
            </div>
          </div>
        ) : (
          <div className="saved-grid">
            {/* Universities */}
            {(activeTab === 'all' || activeTab === 'universities') &&
              bookmarks.universities.map((uni, idx) => (
                <article
                  key={`saved-uni-${uni.id || uni.University || uni.name || idx}`}
                  className="saved-card saved-card--university"
                >
                  <div className="saved-card-header">
                    <span className="saved-card-badge saved-card-badge--uni">
                      🏛️ University
                    </span>
                    <button
                      type="button"
                      className="saved-remove-btn"
                      onClick={() => handleRemoveBookmark('universities', uni)}
                      title="Remove bookmark"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <h3 className="saved-card-title">{uni.University || uni.name}</h3>

                  <div className="saved-card-details">
                    {uni.Program && (
                      <p className="saved-card-row">
                        <strong>Program:</strong> <span>{uni.Program}</span>
                      </p>
                    )}
                    {uni.City && (
                      <p className="saved-card-row">
                        <strong>Location:</strong> <span>{uni.City}</span>
                      </p>
                    )}
                    {uni.Merit && (
                      <p className="saved-card-row">
                        <strong>Required Merit:</strong> <span>{uni.Merit}%</span>
                      </p>
                    )}
                    {uni.requirements && (
                      <p className="saved-card-subtext">{uni.requirements}</p>
                    )}
                  </div>

                  <div className="saved-card-footer">
                    {(() => {
                      const rawUrl = uni.link || uni.website_url || uni.website;
                      const { websiteUrl, applyUrl } = formatUniversityLinks(
                        rawUrl,
                        uni.University || uni.university || uni.name,
                        uni.Program || uni.program
                      );
                      const targetUrl = applyUrl || websiteUrl;
                      return targetUrl ? (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="saved-card-apply-btn"
                        >
                          Visit / Apply Online →
                        </a>
                      ) : (
                        <span className="saved-card-no-link">No link available</span>
                      );
                    })()}
                  </div>
                </article>
              ))}

            {/* Scholarships */}
            {(activeTab === 'all' || activeTab === 'scholarships') &&
              bookmarks.scholarships.map((sch, idx) => (
                <article
                  key={`saved-sch-${sch.id || sch.name || idx}`}
                  className="saved-card saved-card--scholarship"
                >
                  <div className="saved-card-header">
                    <span className="saved-card-badge saved-card-badge--sch">
                      🎓 Scholarship
                    </span>
                    <button
                      type="button"
                      className="saved-remove-btn"
                      onClick={() => handleRemoveBookmark('scholarships', sch)}
                      title="Remove bookmark"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <h3 className="saved-card-title">{sch.name}</h3>

                  <div className="saved-card-details">
                    {sch.provider && (
                      <p className="saved-card-row">
                        <strong>Provider:</strong> <span>{sch.provider}</span>
                      </p>
                    )}
                    {sch.field && (
                      <p className="saved-card-row">
                        <strong>Field / Category:</strong> <span>{sch.field}</span>
                      </p>
                    )}
                    {sch.min_percentage !== undefined && sch.min_percentage !== null && (
                      <p className="saved-card-row">
                        <strong>Minimum Merit:</strong> <span>{sch.min_percentage}%</span>
                      </p>
                    )}
                    {sch.provinces && (
                      <p className="saved-card-row">
                        <strong>Eligible Region:</strong> <span>{sch.provinces}</span>
                      </p>
                    )}
                  </div>

                  <div className="saved-card-footer">
                    {(sch.link || sch.source_url) ? (
                      <a
                        href={formatApplyUrl(sch.link || sch.source_url, sch.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="saved-card-apply-btn saved-card-apply-btn--sch"
                      >
                        Apply Now →
                      </a>
                    ) : (
                      <span className="saved-card-no-link">No direct application link</span>
                    )}
                  </div>
                </article>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedOpportunities;
