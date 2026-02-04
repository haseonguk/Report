import React, { useState, useEffect } from 'react'
import ReportForm from './components/ReportForm'
import Login from './components/Login'

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        // 초기값: 로컬 스토리지 확인
        return localStorage.getItem('isLoggedIn') === 'true';
    });

    // 방법 B: 초대 링크 방식 (URL 파라미터 ?gas=... 처리)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const gasFromUrl = params.get('gas');

        if (gasFromUrl) {
            // URL에 GAS 주소가 있으면 로컬 스토리지에 저장
            localStorage.setItem('CUSTOM_GAS_URL', decodeURIComponent(gasFromUrl));
            // 주소창에서 파라미터 제거 (깔끔하게 보이도록)
            window.history.replaceState({}, document.title, window.location.pathname);
            alert('초대 링크를 통해 시스템 설정이 자동으로 업데이트되었습니다.');
        }
    }, []);

    const handleLogin = () => {
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
    };

    if (!isLoggedIn) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <ReportForm />
        </div>
    )
}

export default App
