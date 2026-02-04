import React, { useState } from 'react';

const ADMIN_PASSWORD = 'admin'; // 기본 비밀번호

const Login = ({ onLogin }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            onLogin();
        } else {
            alert('비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">관리자 접속</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">접속 비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xl"
                            placeholder="비밀번호 입력"
                            required
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg active:scale-95"
                    >
                        로그인
                    </button>
                </form>
                <p className="text-center text-gray-400 mt-6 text-sm">
                    비밀번호: 관리자 문의
                </p>
            </div>
        </div>
    );
};

export default Login;
