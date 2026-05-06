import { NavLink } from "react-router-dom";

const links = [
  { label: "Projects", to: "/projects" },
  { label: "Board", to: "/board" },
  { label: "Team", to: "/team" },
  { label: "Create Project", to: "/new" },
];

export function Sidebar() {
  return (
    <aside aria-label="Sidebar" className="w-64 bg-black text-white border-r border-white/10 p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Menu</h2>
      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="block rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
