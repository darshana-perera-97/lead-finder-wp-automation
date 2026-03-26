import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: 'Login' });
  expect(heading).toBeInTheDocument();
});
