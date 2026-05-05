import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../../frontend/src/components/Sidebar';

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  );

describe('Sidebar', () => {
  it('renders the Menu header', () => {
    renderSidebar();
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('renders all 4 navigation links', () => {
    renderSidebar();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('links point to the correct routes', () => {
    renderSidebar();
    expect(screen.getByText('Projects').closest('a')).toHaveAttribute('href', '/projects');
    expect(screen.getByText('Board').closest('a')).toHaveAttribute('href', '/board');
    expect(screen.getByText('Team').closest('a')).toHaveAttribute('href', '/team');
    expect(screen.getByText('Create Project').closest('a')).toHaveAttribute('href', '/new');
  });
});
