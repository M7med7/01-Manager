import React from 'react';
import Xarrow, { useXarrow } from 'react-xarrows';

interface Dependency {
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
}

export const DependencyGraph = ({ dependencies }: { dependencies: Dependency[] }) => {
  // useXarrow is typically called within the component that moves (draggable),
  // but since we are rendering arrows overlay, we just map over dependencies here.

  return (
    <>
      {dependencies.map((dep, idx) => (
        <Xarrow
          key={`${dep.task_id}-${dep.depends_on_task_id}-${idx}`}
          start={dep.depends_on_task_id} // element ID (needs to match DOM id)
          end={dep.task_id}
          color="#0f6cbd"
          strokeWidth={2}
          path="smooth"
          headSize={4}
          curveness={0.3}
          showHead={true}
          labels={dep.dependency_type === 'Finish-to-Start' ? null : <div className="text-xs bg-white px-1 text-gray-500">{dep.dependency_type}</div>}
        />
      ))}
    </>
  );
};
