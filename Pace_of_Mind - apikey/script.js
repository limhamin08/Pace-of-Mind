/* ==========================================
   [1] 전역 변수 및 상태 관리
   ========================================== */
const overlay = document.getElementById('black-overlay');
const quizArea = document.getElementById('experience-quiz');
const homepageContents = document.querySelectorAll('nav, header, section:not(#experience-quiz)');

// 데이터가 없으면 빈 배열로 초기화
let quizState = {
    data: (typeof quizData !== 'undefined') ? quizData : [],
    currentIdx: 0,
    timer: 10,
    timerInterval: null,
    correctCount: 0
};

/* ==========================================
   [2] 체험 제어 함수 (Start / Quit)
   ========================================== */
/* ==========================================
   [데이터 통합 및 퀴즈 시작 로직]
   ========================================== */

/**
 * 1. 기본 문제(data.js)와 사용자 등록 문제(localStorage)를 합치는 함수
 */

function getCombinedQuizData() {
    // 1. data.js의 기본 문제들 (C언어 등) 가져오기
    const defaultData = (typeof quizData !== 'undefined') ? [...quizData] : [];

    // 2. 로컬스토리지에서 내가 등록한 키워드 기록 가져오기
    const rawHistory = localStorage.getItem('pace_history');
    const history = rawHistory ? JSON.parse(rawHistory) : [];

    // 3. '자율 학습'으로 등록된(isCustom: true) 데이터만 퀴즈 포맷으로 변환하기
    const customQuizzes = history
        .filter(record => record.isCustom === true) // 직접 등록한 것만 필터링
        .map(record => ({
            keyword: record.keywords[0], // 등록한 키워드명
            
            // ✨ 에러 해결 핵심: 
            // 등록할 때 저장한 'customImg' 값을 퀴즈 엔진이 쓰는 'img' 이름으로 매핑합니다.
            img: record.customImg, 
            
            hint: record.customHint || "하민님이 직접 등록한 학습 키워드입니다! 👣"
        }));

    // 4. 기본 문제와 내 문제를 하나로 합쳐서 최종 반환
    const finalData = [...defaultData, ...customQuizzes];
    
    //console.log(`[데이터 로드] 기본: ${defaultData.length}개 + 내 퀴즈: ${customQuizzes.length}개 = 총 ${finalData.length}개`);
    
    return finalData;
}

/**
 * 2. 퀴즈 경험 시작 함수 (데이터 로드 및 화면 전환)
 */
function startExperience() {
    // ✨ 합쳐진 데이터를 가져옵니다.
    const finalData = getCombinedQuizData(); 
    
    if (finalData.length === 0) {
        alert("퀴즈를 생성할 데이터가 없습니다. 키워드를 먼저 등록하거나 data.js를 확인해주세요! 👣");
        return;
    }

    // 퀴즈 데이터 섞기 (랜덤)
    quizState.data = [...finalData].sort(() => Math.random() - 0.5);
    
    // 상태 초기화
    quizState.currentIdx = 0;
    quizState.correctCount = 0;

    // 화면 전환 애니메이션
    overlay.classList.add('active');
    setTimeout(() => {
        // 홈 화면 요소 숨기기
        homepageContents.forEach(el => el.classList.add('hidden'));
        // 퀴즈 영역 보이기
        quizArea.classList.remove('hidden');
        window.scrollTo(0, 0);
        
        // 첫 번째 퀴즈 표시
        displayNextQuiz();
    }, 400);
    
    setTimeout(() => overlay.classList.remove('active'), 900);
}

function quitExperience() {
    clearInterval(quizState.timerInterval); // 타이머 멈춤
    overlay.classList.add('active');
    setTimeout(() => {
        homepageContents.forEach(el => el.classList.remove('hidden'));
        quizArea.classList.add('hidden');
    }, 400);
    setTimeout(() => overlay.classList.remove('active'), 900);
}

/* ==========================================
   [3] 퀴즈 핵심 로직 (독립 선언)
   ========================================== */
function displayNextQuiz() {
    const quiz = quizState.data[quizState.currentIdx];
    if (!quiz) return;

    // UI 요소 매칭
    const frame = document.querySelector('.quiz-card-frame');
    const hintDisplay = document.getElementById('quiz-hint-text');
    const hintBtn = document.getElementById('btn-hint');
    const input = document.querySelector('.quiz-input');

    if (frame) frame.innerHTML = `<img src="${quiz.img}" style="width:100%; border-radius:15px;">`;
    if (hintDisplay) {
        hintDisplay.style.display = "none";
        hintDisplay.innerText = `💡 힌트: ${quiz.hint}`;
    }
    if (hintBtn) hintBtn.style.display = "inline-block";
    if (input) {
        input.value = "";
        input.focus();
    }

    resetTimer(); // 👈 이제 이 함수를 아래에서 찾을 수 있습니다!
}

function resetTimer() {
    clearInterval(quizState.timerInterval);
    let timeLeft = quizState.timer;
    const timerBar = document.querySelector('.timer-bar');

    quizState.timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        const widthPercent = (timeLeft / quizState.timer) * 100;
        if (timerBar) timerBar.style.width = `${widthPercent}%`;

        if (timeLeft <= 5) showHint();
        if (timeLeft <= 0) {
            clearInterval(quizState.timerInterval);
            handleResult(false);
        }
    }, 100);
}

function showHint() {
    const hintText = document.getElementById('quiz-hint-text');
    const hintBtn = document.getElementById('btn-hint');
    if (hintText) hintText.style.display = "block";
    if (hintBtn) hintBtn.style.display = "none";
}

function handleResult(isCorrect) {
    clearInterval(quizState.timerInterval);

    if (isCorrect) {
        quizState.correctCount++;
        quizState.timer = Math.max(5, quizState.timer - 1); 
    } else {
        quizState.timer += 2; 
    }

    quizState.currentIdx++;
    
    if (quizState.currentIdx < quizState.data.length) {
        setTimeout(displayNextQuiz, 1000);
    } else {
        saveToPaceHistory();
        if (typeof updateHistoryUI === 'function') updateHistoryUI();
        alert("오늘의 산책을 마쳤습니다! ✨");
        quitExperience();
    }
}

/* ==========================================
   [4] 유틸리티 및 저장 함수
   ========================================== */

   
function saveToPaceHistory() {
    const rawData = localStorage.getItem('pace_history');
    const history = rawData ? JSON.parse(rawData) : [];
    const keywords = quizState.data.map(q => q.keyword);

    const newRecord = {
        date: new Date().toLocaleString(),
        score: quizState.correctCount,
        total: quizState.data.length,
        keywords: keywords
    };

    history.unshift(newRecord); 
    localStorage.setItem('pace_history', JSON.stringify(history.slice(0, 20)));
}

/* ==========================================
   [최종 수정] 사용자 키워드 등록 함수
   ========================================== */
/* ==========================================
   [5] API 통신 및 데이터 등록 (Grok-3 & Imagine)
   ========================================== */

/**
 * 1. Grok-3: 키워드 분석 및 이미지 생성용 영문 프롬프트 생성
 */
async function callGrokAPI(keyword) {
    const API_KEY = ""; 

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "grok-3",
            messages: [
                {
                    "role": "system",
                    "content": `너는 CS 교육용 도식 전문가야. 반드시 아래 JSON 형식으로만 답해. 
                    { "hint": "한국어 힌트", "imagePrompt": "영어 도식 묘사" }`
                },
                { "role": "user", "content": `키워드: ${keyword}` }
            ],
            temperature: 0 // 답변의 일관성을 위해 0으로 설정
        })
    });

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // ✨ [강화된 추출 로직] 마크다운 코드 블록(```json)이 있어도 순수 JSON만 뽑아냅니다.
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 형식을 찾을 수 없습니다.");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // 필드명 확인 (혹시 모를 대소문자 이슈 방지)
    return {
        hint: parsed.hint || "힌트를 불러오지 못했습니다.",
        imagePrompt: parsed.imagePrompt || parsed.image_prompt || keyword 
    };
}

/**
 * 2. Grok-Imagine: 유료 이미지 생성 API 호출 (안전 장치 추가)
 */
async function generateGrokImage(imagePrompt) {
    const API_KEY = ""; 

    if (!imagePrompt || imagePrompt.length < 2) {
        throw new Error("전달된 프롬프트 내용이 너무 짧거나 비어있습니다.");
    }

    try {
        // ⚠️ 이 부분의 주소를 대괄호 없이 정확히 입력해야 합니다!
        const fetchResponse = await fetch("https://api.x.ai/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "grok-imagine-image",
                prompt: imagePrompt
            })
        });

        // 405 에러가 나면 응답 본문이 비어있어서 json() 호출 시 SyntaxError가 날 수 있습니다.
        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text(); // json() 대신 text()로 읽어보기
            console.error("xAI 서버 응답 에러 상세:", errorText);
            throw new Error(`이미지 생성 실패 (Status: ${fetchResponse.status})`);
        }

        const data = await fetchResponse.json();
        return data.data[0].url; 

    } catch (e) {
        console.error("Grok 이미지 우회 발생:", e);
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=512&height=512&model=flux`;
    }
}
/**
 * 3. [최종] 사용자 키워드 등록 메인 함수
 * HTML의 <button onclick="addCustomRecord()"> 와 연결됨
 */
async function addCustomRecord() {
    const kwInput = document.getElementById('input-custom-keyword'); 
    if (!kwInput) return;
    const keyword = kwInput.value.trim();
    if (!keyword) return;

    if (overlay) overlay.classList.add('active');

    try {
        // API 연쇄 호출
        const grokData = await callGrokAPI(keyword); 
        const aiImgUrl = await generateGrokImage(grokData.imagePrompt);

        // 데이터 구성 및 저장
        const rawData = localStorage.getItem('pace_history');
        let history = rawData ? JSON.parse(rawData) : [];

        const newRecord = {
            id: Date.now(), 
            date: new Date().toLocaleString(),
            keywords: [keyword],
            customImg: aiImgUrl, 
            customHint: grokData.hint, 
            isCustom: true
        };

        history.unshift(newRecord);
        localStorage.setItem('pace_history', JSON.stringify(history.slice(0, 20)));

        // UI 업데이트
        kwInput.value = "";
        if (typeof renderHistory === 'function') renderHistory();
        else if (typeof updateHistoryUI === 'function') updateHistoryUI();
        
        alert(`'${keyword}' 등록 성공! 👣`);

    } catch (e) {
        console.error("등록 실패:", e);
        alert("카드 생성 중 오류가 발생했습니다.");
    } finally {
        if (overlay) overlay.classList.remove('active');
    }
}