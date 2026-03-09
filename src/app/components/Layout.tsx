import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Home", icon: "🎮" },
    { path: "/rules", label: "Rules", icon: "📖" },
    { path: "/guide", label: "Guide", icon: "🤖" },
    { path: "/api", label: "API", icon: "⚙️" },
    { path: "/results", label: "Results", icon: "🏆" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e27]">
      {/* Header */}
      <header className="border-b border-[#2d3748] bg-gradient-to-r from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] backdrop-blur-sm sticky top-0 z-50">
        <div className="container-max py-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group cursor-pointer no-underline"
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00d9ff] to-[#ff006e] rounded-lg opacity-75 group-hover:opacity-100 transition-opacity blur-sm"></div>
              <div className="relative bg-[#0a0e27] rounded-lg w-10 h-10 flex items-center justify-center font-mono font-bold text-[#00d9ff] text-lg">
                ⚡
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-lg text-gradient-primary hidden sm:inline">
                CodeClash
              </span>
              <span className="text-xs text-[#6b7684] font-mono">Flip 7 Arena</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium text-sm no-underline ${
                  isActive(item.path)
                    ? "bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/50 shadow-glow"
                    : "text-[#b3bcc5] hover:text-[#f5f7fa] hover:bg-[#252d47]"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[#252d47] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  mobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#2d3748] bg-[#1a1f3a]/95 backdrop-blur">
            <div className="container-max py-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium text-sm no-underline ${
                    isActive(item.path)
                      ? "bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/50"
                      : "text-[#b3bcc5] hover:text-[#f5f7fa] hover:bg-[#252d47]"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 md:py-12">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d3748] bg-gradient-to-r from-[#1a1f3a] via-[#252d47] to-[#1a1f3a] mt-12">
        <div className="container-max py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#6b7684]">
          <div>
            <p className="mb-1">
              CodeClash • A bot tournament platform for{" "}
              <span className="text-[#ffd60a] font-semibold">Flip 7</span>
            </p>
            <p>Hack night esports arena ⚡</p>
          </div>
          <div className="flex gap-6">
            <a
              href="https://github.com"
              className="hover:text-[#00d9ff] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.youtube.com/watch?v=rX9BG34YOT0"
              className="hover:text-[#00d9ff] transition-colors"
            >
              Rules Video
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
