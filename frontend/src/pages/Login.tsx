import { useState } from 'react';
import { authService } from '@/services/auth';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const user = await authService.login(username, password);
            if (user) {
                navigate('/');
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Login failed. Please check your username and password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1C1C1E] border border-[#333333] rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
                        <Lock className="text-white h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
                    <p className="text-neutral-500 text-sm mt-2">Sign in to your Titanium trading account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black border border-[#333333] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-neutral-700"
                            placeholder="Entrader"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black border border-[#333333] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-neutral-700"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full py-3.5 rounded-lg bg-blue-600 text-white font-bold text-sm tracking-wide transition-all shadow-lg hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            loading && "animate-pulse"
                        )}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>

                    <div className="text-center mt-4">
                        <a href="#" className="text-xs text-neutral-600 hover:text-white transition-colors">Forgot Password?</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
