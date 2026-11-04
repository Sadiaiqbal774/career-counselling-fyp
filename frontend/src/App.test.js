import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the modern landing page', () => {
  render(<App />);
  expect(screen.getAllByText(/CareerGuide/i)[0]).toBeInTheDocument();
  expect(screen.getByText(/Personalized Aptitude Quiz/i)).toBeInTheDocument();
  expect(screen.getByText(/AI-Powered Compatibility/i)).toBeInTheDocument();
});
