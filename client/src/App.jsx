import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';
import { SocketProvider } from './context/SocketContext';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <SignedOut>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
                  GenZ Chat
                </h1>
                <p className="text-slate-400">Real-time messaging by Sharon</p>
              </div>
              <div className="bg-white/[0.03] rounded-2xl border border-white/10 p-6">
                <SignIn />
              </div>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <header className="border-b border-white/10 bg-white/[0.04]">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center justify-center">
                      <span className="text-sm font-bold">💬</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        GenZ Chat
                      </h1>
                      <p className="text-xs text-slate-400">Real-time messaging by SK with 💖</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <UserButton />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto flex h-[calc(100vh-120px)] w-full max-w-7xl flex-col px-4 pb-8 pt-6">
              <Dashboard />
            </div>
          </main>
        </SignedIn>
      </div>
    </SocketProvider>
  );
}

export default App;