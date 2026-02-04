/**
 * api.js
 * Google Apps Script Web App과의 통신을 담당합니다.
 */

// Vite 환경 변수에서 기본 URL을 불러옵니다 (.env 파일의 VITE_GAS_API_URL)
const DEFAULT_API_URL = import.meta.env.VITE_GAS_API_URL;

/**
 * common fetch helper
 */
const gasFetch = async (params = {}, options = {}) => {
    const customUrl = localStorage.getItem('CUSTOM_GAS_URL');
    const apiUrl = (customUrl && customUrl.trim()) ? customUrl.trim() : DEFAULT_API_URL;

    if (!apiUrl || apiUrl.includes("XXXXX")) {
        throw new Error("API 주소가 설정되지 않았습니다. 오른쪽 상단 [⚙️ 설정]에서 GAS URL을 입력해주세요.");
    }

    const url = new URL(apiUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    let response;
    const fetchOptions = {
        method: options.method || 'GET',
        redirect: 'follow', // GAS의 302 리다이렉트를 따라가야 함
    };

    if (options.method === 'POST') {
        fetchOptions.body = options.body;
        // Content-Type을 text/plain으로 설정해야 CORS preflight(OPTIONS 요청)를 건너뛸 수 있음
        fetchOptions.headers = { "Content-Type": "text/plain;charset=utf-8" };
    }

    try {
        response = await fetch(url.toString(), fetchOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("JSON 파싱 에러 (원본 응답):", text);
            throw new Error("서버 응답이 올바른 JSON 형식이 아닙니다.");
        }

        if (result.status === "error") throw new Error(result.message);
        return result.data;
    } catch (error) {
        console.error("GAS API 호출 실패:", error);
        throw error;
    }
};

/**
 * 리포트 생성 요청
 */
export const createReport = async (formData) => {
    return gasFetch({}, {
        method: "POST",
        body: JSON.stringify(formData),
    });
};

/**
 * 고객 데이터 검색 (Sheet A)
 * @param {string} phone - 연락처
 */
export const searchCustomer = async (phone) => {
    return gasFetch({ action: 'search', phone });
};

/**
 * 리포트 목록 조회 (Sheet B)
 */
export const getReportList = async () => {
    return gasFetch({ action: 'list' });
};
/**
 * 시스템 설정 조회 (구글 폼 주소 등)
 */
export const getSettingsFromGas = async () => {
    return gasFetch({ action: 'settings' });
};

/**
 * Reference 데이터 조회 (기준 데이터)
 */
export const getReferences = async () => {
    return gasFetch({ action: 'getReferences' });
};
