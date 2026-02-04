import React, { useState, useEffect, useRef } from 'react';
import { createReport, searchCustomer, getReportList, getSettingsFromGas, getReferences } from '../services/api';
import { shareToSystem } from '../services/share';
import { applyMaintenanceRules } from '../utils/maintenanceRules';
import { getRecommendations } from '../services/recommendation';
import SettingsModal from './SettingsModal';

const CHECKLIST_ITEMS = [
    "1. 브레이크등&후진등", "2. 파워스티어링 오일", "3. 엔진 오일", "4. 브레이크 오일",
    "5. 자동 변속기 오일", "6. 워셔액", "7. 냉각수", "8. 와이퍼 작동 상태",
    "9. 타이어 외관 및 마모도", "10. 배터리/터미널", "11. 벨트류 갈라짐", "12. 브레이크 패드"
];

const DEFAULT_VEHICLE_MODELS = ['SM5', 'SM6', 'SM7', 'SM3', 'NSM5', 'QM5', 'QM6', 'QM3', 'NewSM5', 'NewSM3', 'NewSM7', 'KOLEOS', 'SENIC'];

const INITIAL_FORM_DATA = {
    fuelType: '가솔린',
    recipientName: '',
    recipientPhone: '',
    vehicleModel: '',
    year: '',
    vehicleNumber: '',
    currentMileage: '',
    lastMileage: '',
    symptom: '',
    history: '',
    mainContent: '',
    specialNotes: '',
    checklist: Array(12).fill({ status: 'good', memo: '' })
};

const ReportForm = () => {
    // 폼 데이터
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    const [vehicleModels, setVehicleModels] = useState(DEFAULT_VEHICLE_MODELS);
    const [inspectors, setInspectors] = useState(['관리자', '정비팀장', '정비사1']);
    const [newModel, setNewModel] = useState('');
    const [newInspector, setNewInspector] = useState('');
    const [isYearFocused, setIsYearFocused] = useState(false);

    // UI 상태 관리
    const [activeTab, setActiveTab] = useState('form'); // 'form' or 'list' (mobile용)
    const [loading, setLoading] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showChecklist, setShowChecklist] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // 추천 시스템 상태
    const [references, setReferences] = useState([]);
    const [recommendations, setRecommendations] = useState([]);

    // 검색 및 리스트 관련 상태
    const [searchPhone, setSearchPhone] = useState('');
    const [reports, setReports] = useState([]);
    const [listSearchQuery, setListSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        // 로컬스토리지에서 불러오되, 이번에 코드로 수정한 SM 시리즈가 반영되도록 처리
        const savedModels = localStorage.getItem('VEHICLE_MODELS');
        if (savedModels) {
            const parsed = JSON.parse(savedModels);
            // 만약 저장된 데이터가 이전 버전(아반떼 등)이라면 새로운 리스트로 갱신하기 위한 로직
            if (parsed.includes('아반떼') || parsed.includes('쏘나타')) {
                setVehicleModels(DEFAULT_VEHICLE_MODELS);
                localStorage.setItem('VEHICLE_MODELS', JSON.stringify(DEFAULT_VEHICLE_MODELS));
            } else {
                setVehicleModels(parsed);
            }
        } else {
            setVehicleModels(DEFAULT_VEHICLE_MODELS);
        }

        const savedInspectors = localStorage.getItem('INSPECTORS');
        if (savedInspectors) setInspectors(JSON.parse(savedInspectors));
        fetchReports();
        // 초기 Reference 데이터 로드
        getReferences().then(data => setReferences(data || [])).catch(console.error);
    }, []);

    const addVehicleModel = () => {
        if (!newModel.trim()) return;
        if (vehicleModels.includes(newModel.trim())) {
            alert('이미 존재하는 차종입니다.');
            return;
        }
        const updated = [...vehicleModels, newModel.trim()].sort();
        setVehicleModels(updated);
        localStorage.setItem('VEHICLE_MODELS', JSON.stringify(updated));
        setFormData(prev => ({ ...prev, vehicleModel: newModel.trim() }));
        setNewModel('');
    };

    const deleteVehicleModel = (modelToDelete) => {
        if (window.confirm(`${modelToDelete}를 리스트에서 삭제할까요?`)) {
            const updated = vehicleModels.filter(m => m !== modelToDelete);
            setVehicleModels(updated);
            localStorage.setItem('VEHICLE_MODELS', JSON.stringify(updated));
            if (formData.vehicleModel === modelToDelete) setFormData(prev => ({ ...prev, vehicleModel: '' }));
        }
    };

    const deleteInspector = (nameToDelete) => {
        if (window.confirm(`${nameToDelete}님을 점검자 리스트에서 삭제할까요?`)) {
            const updated = inspectors.filter(i => i !== nameToDelete);
            setInspectors(updated);
            localStorage.setItem('INSPECTORS', JSON.stringify(updated));
            if (formData.recipientName === nameToDelete) setFormData(prev => ({ ...prev, recipientName: '' }));
        }
    };

    const fetchReports = async () => {
        try {
            const data = await getReportList();
            setReports(data || []);
        } catch (error) {
            console.error('리스트 로드 실패:', error);
        }
    };

    const handleCustomerSearch = async () => {
        if (!searchPhone.trim()) {
            alert('연락처를 입력해주세요.');
            return;
        }
        setSearchLoading(true);
        try {
            // Reference 데이터 미리 로드
            getReferences().then(data => setReferences(data || [])).catch(console.error);

            const customer = await searchCustomer(searchPhone);
            if (customer) {
                setFormData(prev => ({
                    ...prev,
                    recipientName: customer.recipientName || '',
                    recipientPhone: customer.recipientPhone || searchPhone,
                    vehicleNumber: customer.vehicleNumber || '',
                    vehicleModel: customer.vehicleModel || '',
                    fuelType: customer.fuelType || '가솔린'
                }));
                alert('고객 정보를 성공적으로 불러왔습니다.');
            } else {
                alert('일치하는 정보가 없습니다. 필드를 직접 채워주세요.');
            }
        } catch (error) {
            console.error(error);
            alert('검색 중 오류가 발생했거나 정보를 찾지 못했습니다.');
        } finally {
            setSearchLoading(false);
        }
    };

    const formatMileage = (value) => {
        const num = value.replace(/[^0-9]/g, '');
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const cleanPhoneNumber = (value) => {
        return value.replace(/[^0-9]/g, '');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;
        if (name === 'currentMileage' || name === 'lastMileage') {
            formattedValue = formatMileage(value);
        } else if (name === 'recipientPhone') {
            formattedValue = cleanPhoneNumber(value);
        }
        setFormData(prev => ({ ...prev, [name]: formattedValue }));
    };

    const handleChecklistChange = (index, field, value) => {
        const newChecklist = [...formData.checklist];
        newChecklist[index] = { ...newChecklist[index], [field]: value };
        setFormData(prev => ({ ...prev, checklist: newChecklist }));
    };




    const handleRecommendation = () => {
        if (!references || references.length === 0) {
            alert("기준 데이터(Reference)를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        const results = getRecommendations(references, formData);
        setRecommendations(results);

        if (results.length === 0) {
            alert("조건에 맞는 추천 항목이 없습니다.");
        } else {
            // 추천 항목이 있으면 알림을 주고 자동으로 보여줌
            // alert(`총 ${results.length}건의 추천 정비 항목이 발견되었습니다.`);
        }
    };

    const applyRecommendation = (rec) => {
        if (!rec) return;

        // 상태 값 매핑 (시트 텍스트 -> 시스템 상태 코드)
        // '정비', '필요', '교환', '이상' 등이 포함되면 'bad'(정비)로 간주
        const getStatusKey = (text) => {
            if (!text) return 'good';
            const s = text.trim();
            if (s.includes('정비') || s.includes('필요') || s.includes('교환') || s.includes('교체') || s.includes('이상') || s.includes('bad')) return 'bad';
            if (s.includes('보통') || s.includes('점검') || s.includes('normal')) return 'normal';
            if (s.includes('양호') || s.includes('정상') || s.includes('good')) return 'good';
            return 'good'; // 기본값
        };

        // 체크리스트 변환
        const newChecklist = rec.checklist ? rec.checklist.map(item => ({
            status: getStatusKey(item.status),
            memo: item.memo || ''
        })) : formData.checklist;

        setFormData(prev => ({
            ...prev,
            mainContent: rec.mainContent || prev.mainContent,
            specialNotes: rec.specialNotes || prev.specialNotes,
            checklist: newChecklist,
            fuelType: rec.fuelType || prev.fuelType
        }));

        setShowChecklist(true); // 적용 시 체크리스트 확인을 위해 펼침
        alert('추천 데이터가 적용되었습니다. (점검항목 및 상세내용 포함)');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 차종과 년식을 서버에서 처리하도록 원본 데이터를 그대로 전송
            const submissionData = { ...formData };

            console.log("Submitting to GAS:", submissionData);
            const data = await createReport(submissionData);
            setResult(data);
            fetchReports(); // 리스트 갱신
        } catch (error) {
            console.error("Submission Error:", error);
            alert(error.message);
            if (error.message.includes('API 주소') || error.message.includes('fetch')) alert("설정에서 API 주소를 확인해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('작성 중인 내용을 초기화하고 새로 작성하시겠습니까?')) {
            setFormData(INITIAL_FORM_DATA);
            setResult(null);
            setRecommendations([]);
            setSearchPhone('');
            setShowChecklist(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleShare = async () => {
        if (result && result.pdfUrl) {
            setShareLoading(true);
            try {
                const shareResult = await shareToSystem({
                    title: `[차량점검리포트] ${formData.recipientName}님`,
                    text: `${formData.vehicleModel} 점검 결과입니다. 아래 링크에서 상세 리포트를 확인하세요.`,
                    url: result.pdfUrl
                });
                if (shareResult.success && shareResult.method === 'clipboard') {
                    alert('리포트 링크가 클립보드에 복사되었습니다.');
                }
            } catch (error) {
                console.error('공유 중 오류:', error);
                const link = `[차량점검리포트] ${formData.vehicleModel} 점검 결과입니다.\n${result.pdfUrl}`;
                await navigator.clipboard.writeText(link);
                alert('공유 기능 문제로 링크만 복사되었습니다.');
            } finally {
                setShareLoading(false);
            }
        }
    };


    // 실시간 검색 필터링 (안전장치 강화: 문자열 여부 확인)
    const filteredReports = reports.filter(r => {
        if (!listSearchQuery) return true;

        const q = listSearchQuery.toLowerCase();
        const name = String(r.recipientName || "").toLowerCase();
        const vehicle = String(r.vehicleNumber || "").toLowerCase();
        const phone = String(r.recipientPhone || "").toLowerCase();

        return name.includes(q) || vehicle.includes(q) || phone.includes(q);
    });
    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full max-w-[1400px] mx-auto md:p-8 p-4 bg-gray-50/50 min-h-screen">
            {/* 헤더 섹션: 더 깔끔하고 정돈된 디자인 */}
            <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2 justify-center sm:justify-start">
                        <span className="text-3xl">🚙</span> 스마트 차량점검리포트
                    </h1>
                    <p className="text-gray-500 text-xs font-medium mt-1 tracking-wider uppercase">Find-Smart Report v3.2 </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="group px-4 py-2.4 bg-gray-200 border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2 text-sm font-bold"
                >
                    <span className="text-lg group-hover:rotate-90 transition-transform duration-500">⚙️</span>
                    <span>시스템 설정</span>
                </button>
            </header>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* 상단 검색바: 높이를 줄이고 버튼과 입력필드의 밸런스 조정 */}
            <div className={`bg-blue-600 p-3 md:p-4 rounded-2xl shadow-lg mb-8 flex flex-col md:flex-row gap-4 items-center transition-all ${activeTab === 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex-1 text-white">
                    <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                        <span className="bg-white/20 p-1 rounded-lg text-xs">SEARCH</span> 고객 정보 빠른 찾기
                    </h3>
                </div>
                <div className="flex w-full md:w-auto gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
                    <input
                        type="tel"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(cleanPhoneNumber(e.target.value))}
                        placeholder="연락처 (숫자만 입력)"
                        className="flex-1 md:w-64 px-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-white/50 outline-none text-gray-800 font-bold text-sm"
                    />
                    <button
                        onClick={handleCustomerSearch}
                        disabled={searchLoading}
                        className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black hover:bg-blue-50 transition shadow-sm disabled:bg-gray-200 text-sm whitespace-nowrap active:scale-95"
                    >
                        {searchLoading ? '조회중...' : '조회하기'}
                    </button>
                </div>
            </div>

            {/* 모바일 메인 탭 */}
            <div className="flex md:hidden mb-6 bg-gray-200/50 p-1.5 rounded-2xl border border-gray-300">
                <button
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'form' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('form')}
                >
                    📝 리포트 작성
                </button>
                <button
                    className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'list' ? 'bg-white shadow-md text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('list')}
                >
                    📜 발행 내역 ({reports.length})
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* [좌측] 입력 폼 영역 */}
                <div className={`lg:col-span-5 space-y-6 ${activeTab !== 'form' ? 'hidden md:block' : ''}`}>
                    <div className="bg-white rounded-3xl shadow-xl border border-black overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-black flex justify-between items-center">
                            <h3 className="font-black text-gray-800 flex items-center gap-2">
                                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">01</span>
                                점검 데이터 입력
                            </h3>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-tighter">Standard Form</span>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* 섹션 1: 차종 및 형식 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1.5 block uppercase">Fuel Type</label>
                                    <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="w-full p-2.5 bg-white border border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800 transition-all">
                                        <option value="가솔린">⛽ 가솔린</option>
                                        <option value="디젤">⛽ 디젤</option>
                                        <option value="LPLi">⛽ LPLi (가스)</option>
                                        <option value="하이브리드">⚡ 하이브리드</option>
                                        <option value="전기차">🔋 전기차</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1.5 block uppercase">Year</label>
                                    <input type="number" name="year" value={formData.year} onChange={handleChange} className="w-full p-2.5 bg-white border border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400" placeholder="예: 2021" />
                                </div>
                            </div>

                            {/* 섹션 2: 점검자 및 차종 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1.5 block uppercase">Inspector</label>
                                    <div className="flex gap-1">
                                        <select name="recipientName" value={formData.recipientName} onChange={handleChange} className="flex-1 p-2.5 bg-white border border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800">
                                            <option value="">점검자 선택</option>
                                            {inspectors.map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                        <button type="button" onClick={() => {
                                            const n = prompt('새로운 점검자 성함을 입력하세요.');
                                            if (n && n.trim()) {
                                                const name = n.trim();
                                                setInspectors(prev => {
                                                    const updated = [...prev, name].sort();
                                                    localStorage.setItem('INSPECTORS', JSON.stringify(updated));
                                                    return updated;
                                                });
                                                setFormData(prev => ({ ...prev, recipientName: name }));
                                            }
                                        }} className="w-10 h-10 shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-600 hover:text-white transition-colors text-xl font-bold">+</button>
                                        {formData.recipientName && (
                                            <button type="button" onClick={() => deleteInspector(formData.recipientName)} className="w-10 h-10 shrink-0 flex items-center justify-center bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-500 hover:text-white transition-colors text-xl font-bold">×</button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1.5 block uppercase">Model</label>
                                    <div className="flex gap-1">
                                        <select name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} className="flex-1 p-2.5 bg-white border border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800">
                                            <option value="">차종 선택</option>
                                            {vehicleModels.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <button type="button" onClick={() => {
                                            const m = prompt('새로운 차종을 입력하세요.');
                                            if (m && m.trim()) {
                                                const model = m.trim();
                                                setVehicleModels(prev => {
                                                    const updated = [...prev, model].sort();
                                                    localStorage.setItem('VEHICLE_MODELS', JSON.stringify(updated));
                                                    return updated;
                                                });
                                                setFormData(prev => ({ ...prev, vehicleModel: model }));
                                            }
                                        }} className="w-10 h-10 shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-600 hover:text-white transition-colors text-xl font-bold">+</button>
                                        {formData.vehicleModel && (
                                            <button type="button" onClick={() => deleteVehicleModel(formData.vehicleModel)} className="w-10 h-10 shrink-0 flex items-center justify-center bg-red-50 text-red-500 border border-red-200 rounded-xl hover:bg-red-500 hover:text-white transition-colors text-xl font-bold">×</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 섹션 3: 차량번호 및 연락처 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1.5 block uppercase">Plate No.</label>
                                    <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} className="w-full p-2.5 bg-white border border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900" placeholder="12가3456" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1.5 block uppercase">Contact</label>
                                    <input type="tel" name="recipientPhone" value={formData.recipientPhone} onChange={handleChange} className="w-full p-2.5 bg-white border border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900" placeholder="숫자만 입력" />
                                </div>
                            </div>

                            {/* 섹션 4: 주행거리 및 추천 섹션 */}
                            <div className="p-5 bg-white rounded-2xl border border-black space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-black mb-1 block">현재 주행 (km)</label>
                                        <input type="text" name="currentMileage" value={formData.currentMileage} onChange={handleChange} className="w-full p-2 border border-black rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-black mb-1 block">직전 오일 교환 (km)</label>
                                        <input type="text" name="lastMileage" value={formData.lastMileage} onChange={handleChange} className="w-full p-2 border border-black rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-black mb-1 block">입고 증상 / 문의</label>
                                    <input type="text" name="symptom" value={formData.symptom} onChange={handleChange} className="w-full p-2 border border-black rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400" placeholder="예: 핸들 떨림, 소음" />
                                </div>

                                <button type="button" onClick={handleRecommendation} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                    🔍 기준 데이터 매칭 및 추천
                                </button>

                                {recommendations.length > 0 && (
                                    <div className="space-y-1.5 mt-2 max-h-[160px] overflow-y-auto pr-1 thin-scrollbar">
                                        {recommendations.map((rec, idx) => (
                                            <button key={idx} type="button" onClick={() => applyRecommendation(rec)} className="w-full text-left p-2.5 bg-white hover:bg-blue-50 border border-gray-200 rounded-xl transition-all group">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-blue-700 font-bold text-[11px]">{rec.symptom || '기본점검'}</span>
                                                    <span className="text-[10px] font-bold text-red-600 bg-gray-100 px-1.5 py-0.5 rounded uppercase">Match {rec.score}pt</span>
                                                </div>
                                                <div className="text-gray-500 text-[10px] truncate">{rec.mainContent || rec.action}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 12개 점검 항목 */}
                            <div className="border border-black rounded-2xl overflow-hidden shadow-sm">
                                <button type="button" onClick={() => setShowChecklist(!showChecklist)} className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors font-black text-xs text-black border-b border-black">
                                    <span className="flex items-center gap-2">🔧 상세 점검 항목 (12건)</span>
                                    <span className={`transition-transform duration-300 ${showChecklist ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {showChecklist && (
                                    <div className="p-4 bg-white space-y-4 max-h-[300px] overflow-y-auto thin-scrollbar border-t border-gray-100">
                                        {formData.checklist.map((item, idx) => (
                                            <div key={idx} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                                <p className="text-[11px] font-black text-gray-800 mb-2">{CHECKLIST_ITEMS[idx]}</p>
                                                <div className="flex gap-1.5 mb-2">
                                                    {['good', 'normal', 'bad'].map((status) => (
                                                        <label key={status} className={`flex-1 cursor-pointer text-center py-2 rounded-lg border text-[10px] font-bold transition-all ${item.status === status ? (status === 'good' ? 'bg-green-100 border-green-500 text-green-700 shadow-sm' : status === 'normal' ? 'bg-yellow-100 border-yellow-500 text-yellow-700 shadow-sm' : 'bg-red-100 border-red-500 text-red-700 shadow-sm') : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}`}>
                                                            <input type="radio" name={`check_${idx}`} value={status} checked={item.status === status} onChange={() => handleChecklistChange(idx, 'status', status)} className="hidden" />
                                                            {status === 'good' ? '양호' : status === 'normal' ? '보통' : '정비'}
                                                        </label>
                                                    ))}
                                                </div>
                                                <input type="text" value={item.memo} onChange={(e) => handleChecklistChange(idx, 'memo', e.target.value)} maxLength={30} placeholder="특이사항 메모 (선택)" className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white transition-all" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 텍스트 입력 영역 */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1 block uppercase">긴급 정비 필요사항</label>
                                    <textarea name="mainContent" value={formData.mainContent} onChange={handleChange} className="w-full p-4 bg-white border border-black rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none h-20 text-xs font-medium transition-all" placeholder="주요 점검 내용 및 정비 권고사항을 입력하세요." required />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-black ml-1 mb-1 block uppercase">차기 방문시 권고사항</label>
                                    <textarea name="specialNotes" value={formData.specialNotes} onChange={handleChange} className="w-full p-3 bg-white border border-black rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-20 text-xs font-medium transition-all" placeholder="추가 전달사항 또는 차기 방문 권고사항" required />
                                </div>
                            </div>

                            {/* [개선된 액션 버튼 바] 3버튼 체제 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`col-span-1 sm:col-span-1 py-3.5 px-4 rounded-xl text-white font-black transition-all text-sm shadow-md flex items-center justify-center gap-2 ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
                                >
                                    {loading ? '생성중' : (
                                        <>
                                            <span className="text-lg">📄</span>
                                            <span>리포트 생성</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    disabled={!result || !result.pdfUrl}
                                    onClick={() => window.open(result.pdfUrl, '_blank')}
                                    className={`py-3.5 px-4 rounded-xl font-black transition-all text-sm shadow-md flex items-center justify-center gap-2 ${(!result || !result.pdfUrl) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-200'}`}
                                >
                                    <span className="text-lg">👀</span>
                                    <span>미리보기</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={!result}
                                    onClick={handleReset}
                                    className={`py-3.5 px-4 rounded-xl font-black transition-all text-sm shadow-md flex items-center justify-center gap-2 ${!result ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700 active:scale-95'}`}
                                >
                                    <span className="text-lg">🔄</span>
                                    <span>새로고침</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* [우측] 리포트 목록 영역 */}
                <div className={`lg:col-span-7 space-y-4 ${activeTab !== 'list' ? 'hidden md:block' : ''}`}>
                    <div className="bg-white rounded-3xl shadow-xl border border-black overflow-hidden flex flex-col h-full min-h-[700px]">
                        <div className="bg-blue-600 p-4 md:p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <h3 className="font-black text-white text-base flex items-center gap-2">
                                    <span className="text-xl">📜</span> 발행 내역
                                    <span className="bg-white text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">{reports.length}</span>
                                </h3>
                            </div>
                            <div className="relative w-full sm:w-64 group">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 text-xs transition-colors group-focus-within:text-blue-600">🔍</span>
                                <input
                                    type="text"
                                    placeholder="고객명, 차량번호 등 검색"
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 font-bold"
                                    value={listSearchQuery}
                                    onChange={(e) => {
                                        setListSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto overflow-y-hidden">
                            <table className="w-full text-xs border-collapse border border-gray-200">
                                <thead className="bg-yellow-100 border-b-2 border-black sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2.5 text-center font-black text-black uppercase tracking-tighter w-12 border-r border-gray-300">No.</th>
                                        <th className="px-4 py-2.5 text-left font-black text-gray-800 uppercase border-r border-gray-300 w-32">차종 & 년식</th>
                                        <th className="px-4 py-2.5 text-center font-black text-gray-800 uppercase border-r border-gray-300 w-32">차량번호</th>
                                        <th className="px-3 py-2.5 text-center font-black text-gray-800 uppercase border-r border-gray-300">연락처</th>
                                        <th className="px-3 py-2.5 text-center font-black text-gray-800 uppercase">pdf</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedReports.length > 0 ? paginatedReports.map((report, idx) => {
                                        const totalIndex = filteredReports.length - ((currentPage - 1) * itemsPerPage + idx);
                                        return (
                                            <tr key={idx} className={`hover:bg-yellow-50/30 transition-colors group ${idx % 2 === 1 ? 'bg-yellow-50/50' : 'bg-white'}`}>
                                                <td className="px-3 py-2.5 text-center font-bold text-black border-r border-gray-200">{totalIndex}</td>
                                                <td className="px-4 py-2.5 border-r border-gray-200">
                                                    <div className="font-medium text-black whitespace-nowrap">{report.vehicleModel}</div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center border-r border-gray-200">
                                                    <span className="font-medium text-black">{report.vehicleNumber}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-black font-medium border-r border-gray-200">{report.recipientPhone}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {report.pdfUrl && report.pdfUrl.startsWith('http') ? (
                                                        <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-300 text-black rounded-lg text-[11px] font-black hover:bg-blue-500 hover:text-white transition-all shadow-sm">
                                                            <span>PDF View</span>
                                                            <span className="text-[8px]">➜</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-300 italic">로그오류</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-32 text-center">
                                                <div className="text-4xl mb-4">💨</div>
                                                <div className="text-gray-400 font-bold italic">발행된 리포트 내역이 없습니다.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 페이지네이션: 더 현대적인 스타일 */}
                        {totalPages > 1 && (
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center items-center gap-2">
                                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-10 h-10 flex items-center justify-center rounded-lg text-blue-600 hover:bg-white hover:border-blue-600 border border-transparent transition-all font-black text-xl">«</button>

                                <div className="flex items-center gap-1 px-4">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                                        .map((p, i, arr) => (
                                            <React.Fragment key={p}>
                                                {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-300 mx-1">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${currentPage === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 'text-gray-500 hover:bg-white hover:shadow-md'}`}
                                                >
                                                    {p}
                                                </button>
                                            </React.Fragment>
                                        ))
                                    }
                                </div>

                                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="w-10 h-10 flex items-center justify-center rounded-lg text-blue-600 hover:bg-white hover:border-blue-600 border border-transparent transition-all font-black text-xl">»</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 스타일 보정용 CSS (Global 혹은 Inline 스타일 컨테이너) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .thin-scrollbar::-webkit-scrollbar { width: 4px; }
                .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .thin-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
            `}} />
        </div>
    );
};

export default ReportForm;
