import { render, screen } from '@testing-library/react';
import { TaskModal } from '../../../frontend/src/components/TaskModal';

const mockTask = {
  title: 'Design Homepage',
  description: 'Create a wireframe for the main landing page.',
};

describe('TaskModal', () => {
  it('renders the task title', () => {
    render(<TaskModal task={mockTask} onClose={() => {}} />);
    expect(screen.getByText('Design Homepage')).toBeInTheDocument();
  });

  it('renders the task description in the notes section', () => {
    render(<TaskModal task={mockTask} onClose={() => {}} />);
    expect(screen.getByText('Create a wireframe for the main landing page.')).toBeInTheDocument();
  });

  it('renders the AI assistant panel', () => {
    render(<TaskModal task={mockTask} onClose={() => {}} />);
    expect(screen.getByText('01 AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('How can I help you?')).toBeInTheDocument();
  });

  it('renders the AI chat input field', () => {
    render(<TaskModal task={mockTask} onClose={() => {}} />);
    expect(screen.getByPlaceholderText('Ask the AI about this task...')).toBeInTheDocument();
  });

  it('renders nothing when task is null', () => {
    const { container } = render(<TaskModal task={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
