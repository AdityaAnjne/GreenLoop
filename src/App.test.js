import { render, screen } from '@testing-library/react';
import App from './App';

test('shows the GreenLoop sign-in screen when no session is active', () => {
  render(<App />);
  expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  expect(screen.getByText(/sign in to your greenloop account/i)).toBeInTheDocument();
});
