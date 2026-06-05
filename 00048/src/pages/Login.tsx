import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, PawPrint } from 'lucide-react';
import useAuthStore from '@/stores/authStore';

type Tab = 'login' | 'register';

export default function Login() {
  const [tab, setTab] = useState<Tab>('login');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/');
    } catch {
      setError('登录失败，请检查邮箱和密码');
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    try {
      await register({
        name: regForm.name,
        email: regForm.email,
        phone: regForm.phone,
        password: regForm.password,
      });
      navigate('/');
    } catch {
      setError('注册失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-100 via-warm-50 to-rose-100 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
        <Heart size={120} className="absolute top-16 left-20 text-primary-500" />
        <PawPrint size={80} className="absolute top-40 right-32 text-primary-600" />
        <Heart size={60} className="absolute bottom-32 left-40 text-rose-500" />
        <PawPrint size={100} className="absolute bottom-16 right-20 text-primary-400" />
        <PawPrint size={50} className="absolute top-[60%] left-[10%] text-warm-500" />
        <Heart size={40} className="absolute top-[30%] right-[15%] text-primary-300" />
        <PawPrint size={70} className="absolute bottom-[45%] right-[8%] text-rose-400" />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl shadow-lg mb-3">
            <Heart size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-800">流浪救助站</h1>
          <p className="text-sm text-warm-500 mt-1">让每个生命都被温柔以待</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-warm-200 overflow-hidden">
          <div className="flex border-b border-warm-200">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'login'
                  ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === 'register'
                  ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              注册
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label-field">邮箱</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="input-field"
                    placeholder="请输入邮箱"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">密码</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="input-field"
                    placeholder="请输入密码"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  登录
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="label-field">姓名</label>
                  <input
                    type="text"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="input-field"
                    placeholder="请输入姓名"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">邮箱</label>
                  <input
                    type="email"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="input-field"
                    placeholder="请输入邮箱"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">手机号</label>
                  <input
                    type="tel"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="input-field"
                    placeholder="请输入手机号"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">密码</label>
                  <input
                    type="password"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="input-field"
                    placeholder="请输入密码"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">确认密码</label>
                  <input
                    type="password"
                    value={regForm.confirmPassword}
                    onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                    className="input-field"
                    placeholder="请再次输入密码"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  注册
                </button>
              </form>
            )}

            <div className="mt-5 pt-4 border-t border-warm-200 text-center">
              <Link
                to="/login"
                className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
              >
                🐾 志愿者登录入口
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-warm-400 mt-4">
          登录即表示同意《用户协议》和《隐私政策》
        </p>
      </div>
    </div>
  );
}
