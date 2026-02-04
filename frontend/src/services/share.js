/**
 * share.js
 * 시스템 기본 공유 기능을 활용하여 리포트 링크를 공유합니다.
 */

/**
 * 클립보드에 텍스트를 복사합니다.
 */
export const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    } catch (err) {
        console.error('클립보드 복사 실패:', err);
        return false;
    }
};

/**
 * 시스템 공유 기능을 호출합니다.
 */
export const shareToSystem = async ({ title, text, url }) => {
    const fullText = `${text}\n${url}`;

    const shareData = {
        title: title,
        text: text,
        url: url,
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
            return { success: true, method: 'system' };
        } else {
            const copied = await copyToClipboard(fullText);
            return { success: copied, method: 'clipboard' };
        }
    } catch (error) {
        if (error.name === 'AbortError') return { success: false, method: 'cancel' };

        console.error('공유 실패:', error);
        const copied = await copyToClipboard(fullText);
        return { success: copied, method: 'clipboard' };
    }
};
