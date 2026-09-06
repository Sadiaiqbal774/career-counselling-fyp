import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the modern landing page', () => {
  render(<App />);
  expect(screen.getByText(/CareerGuide/i)).toBeInTheDocument();
  expect(screen.getByText(/Know yourself\. Choose your path\. Own your future\./i)).toBeInTheDocument();
  expect(screen.getByText(/AI-powered assessment/i)).toBeInTheDocument();
});
