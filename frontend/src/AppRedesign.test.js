import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import Result from './pages/Result';
import Profile from './pages/Profile';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

describe('CareerGuide App Redesign Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  test('Requirement 1 & 3: Logo is always shown in header and Settings nav link is removed', () => {
    render(<App />);

    // Header logo button is always present
    const logos = screen.getAllByRole('button', { name: /Go to CareerGuide home/i });
    expect(logos.length).toBeGreaterThan(0);

    // Settings nav link should NOT exist in navigation
    const navSettings = screen.queryByRole('link', { name: /^Settings$/i });
    expect(navSettings).not.toBeInTheDocument();
  });

  test('Requirement 1: Root theme persistence and dark-mode toggle', async () => {
    localStorage.setItem('career-guide-settings:guest', JSON.stringify({ darkMode: true }));
    render(<App />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('Requirement 4: Result page renders full width top match, 2-column grid, enlarged bubble chart, and back nav', () => {
    const fakeScores = { Technology: 15, Medical: 10, Business: 8, Arts: 5 };
    localStorage.setItem('careerQuizScores:guest', JSON.stringify(fakeScores));
    localStorage.setItem('careerQuizTopCategories:guest', JSON.stringify(['Technology', 'Medical']));

    const { container } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/result']}>
          <Result />
        </MemoryRouter>
      </AuthProvider>
    );

    // Back button below header inside container
    expect(screen.getByRole('button', { name: /← Back to dashboard/i })).toBeInTheDocument();

    // Full width top match
    expect(screen.getByText(/Your top match/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Technology/i })).toBeInTheDocument();

    // 2-column grid wrapper
    const grid = container.querySelector('.result-grid');
    expect(grid).toBeInTheDocument();

    // Bubble chart svg with larger viewBox
    const svg = container.querySelector('.result-bubble-svg');
    expect(svg).toBeInTheDocument();
    expect(svg.getAttribute('viewBox')).toBe('0 0 460 280');

    // "Technology" label appears in top match, bubble svg, and legend
    expect(screen.getAllByText('Technology').length).toBeGreaterThanOrEqual(2);

    // Next steps and action buttons
    expect(screen.getByRole('button', { name: /University Recommender/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Scholarships/i })).toBeInTheDocument();
  });

  test('Requirement 5: Profile page includes Display (Dark mode toggle) and Account sections', async () => {
    localStorage.setItem(
      'career-guide-user',
      JSON.stringify({ id: 'test-user', name: 'Test User', email: 'test@example.com' })
    );

    const { container } = render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/profile']}>
          <Profile />
        </MemoryRouter>
      </AuthProvider>
    );

    // Display section with Dark mode toggle
    expect(screen.getByRole('heading', { name: /Display/i })).toBeInTheDocument();
    const darkModeCheckbox = screen.getByRole('checkbox');
    expect(darkModeCheckbox).toBeInTheDocument();

    // Toggling dark mode
    fireEvent.click(darkModeCheckbox);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Account section
    expect(screen.getByRole('heading', { name: /Account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign out/i })).toBeInTheDocument();
  });
});
