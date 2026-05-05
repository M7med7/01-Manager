import { render, screen } from '@testing-library/react';
import { Team } from '../../../frontend/src/pages/Team';

describe('Team page', () => {
  it('renders the page header', () => {
    render(<Team />);
    expect(screen.getByText('Team Members & Capacity')).toBeInTheDocument();
  });

  it('renders all 3 team members', () => {
    render(<Team />);
    expect(screen.getByText('Abdullah S.')).toBeInTheDocument();
    expect(screen.getByText('Mohammed A.')).toBeInTheDocument();
    expect(screen.getByText('Sarah K.')).toBeInTheDocument();
  });

  it('renders member roles', () => {
    render(<Team />);
    expect(screen.getByText('Lead Developer')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('UX Designer')).toBeInTheDocument();
  });

  it('renders capacity percentages for each member', () => {
    render(<Team />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders an Assigned Tasks section for each member', () => {
    render(<Team />);
    const sections = screen.getAllByText('Assigned Tasks');
    expect(sections).toHaveLength(3);
  });

  it('renders known task names', () => {
    render(<Team />);
    expect(screen.getByText('Database Schema')).toBeInTheDocument();
    expect(screen.getByText('Figma Prototype')).toBeInTheDocument();
  });
});
