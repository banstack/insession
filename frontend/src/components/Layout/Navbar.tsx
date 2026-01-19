import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Tag, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground tracking-tight">
            InSession
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              <Button asChild size="sm">
                <Link to="/new">
                  <Plus className="h-4 w-4" />
                  New Session
                </Link>
              </Button>

              <Button variant="ghost" size="sm" asChild>
                <Link to="/labels">
                  <Tag className="h-4 w-4" />
                  Labels
                </Link>
              </Button>

              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border">
                <span className="text-sm text-muted-foreground">{user.username}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
