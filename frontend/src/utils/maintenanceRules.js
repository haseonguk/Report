/**
 * maintenanceRules.js
 * 데이터 기반 정비 규칙 엔진 (시스템 판단 보정 단계)
 * AI가 추정한 결과값을 차량 정보(년식, 주행거리, 연료타입 등)에 근거하여 강제로 보정하거나 검증합니다.
 */

export const applyMaintenanceRules = (vehicleData, aiEstimatedChecklist) => {
    const currentMileage = parseInt(String(vehicleData.currentMileage || "0").replace(/[^0-9]/g, '')) || 0;
    const lastMileage = parseInt(String(vehicleData.lastMileage || "0").replace(/[^0-9]/g, '')) || 0;
    const mileageDiff = currentMileage - lastMileage;

    // 년식 기반 차량 나이 계산
    const currentYear = new Date().getFullYear();
    const vehicleYear = parseInt(vehicleData.year) || (currentYear - 5); // 기본값 5년전
    const vehicleAge = currentYear - vehicleYear;

    const correctedChecklist = [...aiEstimatedChecklist];

    // Rule 1: 엔진오일 교환 주기
    if (mileageDiff > 7000) {
        const oilIdx = 2; // 엔진 오일
        if (correctedChecklist[oilIdx] && correctedChecklist[oilIdx].status === 'good') {
            correctedChecklist[oilIdx] = { status: 'normal', memo: '교환 주기 근접' };
        }
    }

    if (mileageDiff > 10000) {
        const oilIdx = 2;
        if (correctedChecklist[oilIdx]) {
            correctedChecklist[oilIdx] = { status: 'bad', memo: '즉시 교환 권장' };
        }
    }

    // Rule 2: 년식 기반 노후 차량 보정 (8년 이상)
    if (vehicleAge >= 8) {
        const beltIdx = 10; // 벨트류
        const coolantIdx = 6; // 냉각수
        if (correctedChecklist[beltIdx] && correctedChecklist[beltIdx].status === 'good') {
            correctedChecklist[beltIdx] = { status: 'normal', memo: '연식 기반 노후 점검' };
        }
        if (correctedChecklist[coolantIdx] && correctedChecklist[coolantIdx].status === 'good') {
            correctedChecklist[coolantIdx] = { status: 'normal', memo: '냉각수 상태 확인' };
        }
    }

    // Rule 3: 브레이크 패드 (4만km 주기)
    if (currentMileage > 0 && currentMileage % 40000 < 3000) {
        const brakePadIdx = 11;
        if (correctedChecklist[brakePadIdx] && correctedChecklist[brakePadIdx].status === 'good') {
            correctedChecklist[brakePadIdx] = { status: 'normal', memo: '마모도 정밀 체크' };
        }
    }

    return correctedChecklist.map(item => {
        let memo = item.memo || '';
        if (!memo || memo === '정상 범위' || memo === '정상') {
            if (item.status === 'bad') memo = '즉시 정비 요망';
            else if (item.status === 'normal') memo = '상태 주의/관찰';
            else memo = '정상 범위';
        }
        return {
            status: item.status || 'good',
            memo: memo.length > 20 ? memo.substring(0, 17) + '...' : memo
        };
    });
};
