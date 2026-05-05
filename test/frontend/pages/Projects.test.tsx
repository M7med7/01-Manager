import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Projects } from '../../../frontend/src/pages/Projects';

const renderProjects = () =>
  render(
    <MemoryRouter>
      <Projects />
    </MemoryRouter>
  );

describe('Projects page', () => {
  it('renders the page header', () => {
    renderProjects();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders the New Project button', () => {
    renderProjects();
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  it('renders all mock project names', () => {
    renderProjects();
    expect(screen.getByText('ZeroOne Manager Redesign')).toBeInTheDocument();
    expect(screen.getByText('Takamul Platform Backend')).toBeInTheDocument();
  });

  it('renders completion percentages for each project', () => {
    renderProjects();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders the Completion label for each project card', () => {
    renderProjects();
    const labels = screen.getAllByText('Completion');
    expect(labels).toHaveLength(2);
  });
});
