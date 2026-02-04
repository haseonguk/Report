import React, { useState, useEffect } from 'react';

const SettingsModal = ({ isOpen, onClose }) => {
    const [gasUrl, setGasUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('CUSTOM_GAS_URL');
            if (saved) setGasUrl(saved);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!gasUrl.trim()) {
            // 빈 값이면 삭제 (기본값 사용)
            localStorage.removeItem('CUSTOM_GAS_URL');
            alert('설정이 초기화되었습니다. 기본 API 주소를 사용합니다.');
        } else {
            if (!gasUrl.startsWith('http')) {
                alert('올바른 URL 형식이 아닙니다 (http:// 또는 https:// 로 시작해야 함).');
                return;
            }
            localStorage.setItem('CUSTOM_GAS_URL', gasUrl.trim());
            alert('설정이 저장되었습니다.');
        }
        onClose();
        // 리스트 등 갱신을 위해 새로고침 권장 (또는 상위에서 케어)
        window.location.reload();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">⚙️ 시스템 설정</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">✖</button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Google Apps Script 웹 앱 주소 (Backend)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            배포된 GAS 웹 앱 URL을 입력하세요.
                            <br />(exec으로 끝나는 주소)
                        </p>
                        <input
                            type="text"
                            value={gasUrl}
                            onChange={(e) => setGasUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..."
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono break-all"
                        />
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-700 font-bold">💡 참고</p>
                        <p className="text-xs text-blue-600 mt-1">
                            이 주소는 브라우저 저장소(LocalStorage)에 저장되며 서버로 전송되지 않습니다.
                            빈 칸으로 저장하면 기본 설정(.env)으로 돌아갑니다.
                        </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition transform active:scale-95"
                        >
                            저장 및 적용
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
