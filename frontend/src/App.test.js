import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the modern landing page', () => {
  render(<App />);
  expect(screen.getByText(/AI-Powered Career Guidance/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Take Assessment/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Explore Careers/i })).toBeInTheDocument();
});
