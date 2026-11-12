import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'user-1',
      name: 'Ayesha Khan',
      email: 'ayesha@example.com',
    },
  }),
}));

jest.mock('../lib/supabase', () => ({
  __esModule: true,
  default: {
    from: (table) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
      return query;
    },
  },
}));

test('renders profile management without previous recommendation history', () => {
  localStorage.setItem(
    'careerRecommendationHistory',
    JSON.stringify([
      {
        recommendation: 'Software Developer or IT Specialist',
        highestCategory: 'Technology',
        savedAt: '2026-08-23T10:00:00.000Z',
      },
    ])
  );

  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>
  );

  expect(localStorage.getItem('careerRecommendationHistory')).toBeNull();
  expect(screen.getByText(/Profile management/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Preferred city/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /recommendation history/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/Software Developer or IT Specialist/i)).not.toBeInTheDocument();
});
