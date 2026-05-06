const members = [
  {
    name: "Abdullah S.",
    role: "Lead Developer",
    capacity: 85,
    tasks: ["Database Schema"],
  },
  {
    name: "Mohammed A.",
    role: "Frontend Engineer",
    capacity: 45,
    tasks: ["Dashboard Components"],
  },
  {
    name: "Sarah K.",
    role: "UX Designer",
    capacity: 100,
    tasks: ["Figma Prototype"],
  },
];

export function Team() {
  return (
    <div className="p-8 text-white">
      <h1 className="mb-8 text-3xl font-light">Team Members & Capacity</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {members.map((member) => (
          <article key={member.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-1 text-lg font-semibold">{member.name}</h2>
            <p className="mb-4 text-sm text-gray-400">{member.role}</p>
            <p className="mb-4 text-2xl font-semibold">{member.capacity}%</p>

            <h3 className="mb-2 text-sm font-semibold text-gray-400">Assigned Tasks</h3>
            <ul className="space-y-1 text-sm">
              {member.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
