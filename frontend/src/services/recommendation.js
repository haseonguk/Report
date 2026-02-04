/**
 * recommendation.js
 * 기준 데이터(Reference)를 바탕으로 추천 정비 항목을 찾아내는 로직
 */

/**
 * 추천 로직 실행
 * @param {Array} references - Reference 시트 데이터
 * @param {Object} input - 사용자 입력 (vehicleModel, currentMileage, symptom)
 * @returns {Array} - 추천 결과 리스트
 */
export const getRecommendations = (references, input) => {
    if (!references || references.length === 0) return [];

    const inputModel = (input.vehicleModel || "").trim().toLowerCase();
    const inputSymptom = (input.symptom || "").trim().toLowerCase();
    const inputMileage = parseInt((input.currentMileage || "0").replace(/[^0-9]/g, ''), 10);

    // 점수 기반 매칭
    const scored = references.map(ref => {
        let score = 0;
        const refModel = (ref.vehicleModel || "").trim().toLowerCase();
        const refSymptom = (ref.symptom || "").trim().toLowerCase();
        const refMileage = parseInt((ref.currentMileage || "0").replace(/[^0-9]/g, ''), 10);

        // 1. 차종 일치 (가장 중요)
        if (refModel === "전차종" || refModel === "all") {
            score += 10;
        } else if (inputModel && refModel && (inputModel.includes(refModel) || refModel.includes(inputModel))) {
            score += 40; // 차종 매칭 점수 상향
        }

        // 2. 증상 유사성 (간단한 키워드 매칭)
        if (inputSymptom && refSymptom) {
            const keywords = refSymptom.split(/[\s,]+/);
            let matchCount = 0;
            keywords.forEach(k => {
                if (k.length > 1 && inputSymptom.includes(k)) matchCount++;
            });
            score += (matchCount * 30); // 키워드 하나당 30점
        }

        // 3. 주행거리 근접성 (±2만km 내외)
        if (refMileage > 0 && inputMileage > 0) {
            const diff = Math.abs(inputMileage - refMileage);
            if (diff <= 5000) score += 20;
            else if (diff <= 15000) score += 10;
        }

        return { ...ref, score };
    });

    // 점수 내림차순 정렬 후 상위 3개 반환 (단, 0점 제외)
    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
};
