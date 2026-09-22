const topicInput = document.querySelector("#topicInput");

const studyButton = document.querySelector("#studyButton");
const quizButton = document.querySelector("#quizButton");
const flashcardButton = document.querySelector("#flashcardButton");

const imageButton = document.querySelector("#imageButton");

const historyButton = document.querySelector("#historyButton");
const progressButton = document.querySelector("#progressButton");
const goalButton = document.querySelector("#goalButton");
const streakButton = document.querySelector("#streakButton");

const imageUploadArea = document.querySelector("#imageUploadArea");
const imageActions = document.querySelector("#imageActions");

const result = document.querySelector("#result");

let uploadedImage = null;
let currentStudyTopic = "";
let currentLesson = "";

let quizQuestions = [];
let currentQuizIndex = 0;
let quizCorrect = 0;
let quizWrong = 0;


/* =========================
LOCAL STORAGE
========================= */

let studyHistory =
    JSON.parse(localStorage.getItem("studyHistory")) || [];

let studySessions =
    Number(localStorage.getItem("studySessions")) || 0;

let studyGoal =
    Number(localStorage.getItem("studyGoal")) || 0;

let studyStreak =
    Number(localStorage.getItem("studyStreak")) || 0;

let lastStudyDate =
    localStorage.getItem("lastStudyDate") || "";

let quizResults =
    JSON.parse(localStorage.getItem("quizResults")) || [];

let mistakeHistory =
    JSON.parse(localStorage.getItem("mistakeHistory")) || [];


/* =========================
HELPERS
========================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function cleanAIText(text) {
    if (!text) return "";

    return String(text)
        .replace(/\\\[/g, "")
        .replace(/\\\]/g, "")
        .replace(/\\\(/g, "")
        .replace(/\\\)/g, "")
        .replace(/\$\$/g, "");
}


function formatAIText(text) {
    if (!text) return "";

    let cleaned = cleanAIText(text);

    let escaped = escapeHTML(cleaned);

    // Turn **word** into actual bold text
    escaped = escaped.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    return escaped
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
}


function showMessage(title, message) {
    result.innerHTML = `
        <div class="empty-state">

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                ${message}
            </p>

        </div>
    `;
}


function showLoading(message) {
    result.innerHTML = `
        <div class="empty-state">

            <h3>
                🤖 ${escapeHTML(message)}
            </h3>

            <p>
                Please wait a moment...
            </p>

        </div>
    `;
}


function getTopic() {
    return topicInput
        ? topicInput.value.trim()
        : "";
}


function lessonToText(data) {

    if (!data) return "";

    if (typeof data === "string") {
        return data;
    }

    if (data.lesson) {
        return data.lesson;
    }

    if (data.content) {
        return data.content;
    }

    if (data.text) {
        return data.text;
    }

    let text = "";

    if (data.title) {
        text += `${data.title}\n\n`;
    }

    if (data.summary) {
        text += `${data.summary}\n\n`;
    }

    if (Array.isArray(data.sections)) {

        text += data.sections
            .map(section => {

                return [
                    section.heading ||
                    section.title ||
                    "",

                    section.content ||
                    section.text ||
                    "",

                    section.example
                        ? `Example: ${section.example}`
                        : ""

                ]
                    .filter(Boolean)
                    .join("\n\n");

            })
            .join("\n\n");
    }

    if (Array.isArray(data.keyPoints)) {

        text +=
            "\n\n" +
            data.keyPoints.join("\n\n");
    }

    return text ||
        JSON.stringify(data, null, 2);
}


function getQuestionChoices(question) {

    if (!question) return [];

    if (Array.isArray(question.choices)) {
        return question.choices;
    }

    if (Array.isArray(question.options)) {
        return question.options;
    }

    return [];
}


function getCorrectAnswerIndex(question) {

    if (!question) return -1;

    if (
        typeof question.correctAnswerIndex === "number"
    ) {
        return question.correctAnswerIndex;
    }

    if (
        typeof question.correctIndex === "number"
    ) {
        return question.correctIndex;
    }

    const choices =
        getQuestionChoices(question);

    if (
        typeof question.correctAnswer === "string"
    ) {

        const index =
            choices.findIndex(
                choice =>
                    String(choice).toLowerCase() ===
                    question.correctAnswer.toLowerCase()
            );

        if (index >= 0) {
            return index;
        }
    }

    if (
        typeof question.answer === "string"
    ) {

        const index =
            choices.findIndex(
                choice =>
                    String(choice).toLowerCase() ===
                    question.answer.toLowerCase()
            );

        if (index >= 0) {
            return index;
        }
    }

    return -1;
}


/* =========================
HISTORY
========================= */

function saveHistory(topic, type) {

    studyHistory.unshift({
        topic,
        type,
        date: new Date().toLocaleString()
    });

    studyHistory =
        studyHistory.slice(0, 100);

    localStorage.setItem(
        "studyHistory",
        JSON.stringify(studyHistory)
    );
}


/* =========================
STUDY SESSIONS
========================= */

function updateStudySession() {

    studySessions++;

    localStorage.setItem(
        "studySessions",
        studySessions
    );

    updateStreak();
}


/* =========================
STREAK
========================= */

function updateStreak() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    if (!lastStudyDate) {

        studyStreak = 1;
        lastStudyDate = today;

    } else if (
        lastStudyDate !== today
    ) {

        const previous =
            new Date(lastStudyDate);

        const current =
            new Date(today);

        const difference =
            Math.round(
                (current - previous) /
                (1000 * 60 * 60 * 24)
            );

        if (difference === 1) {
            studyStreak++;
        }

        else if (difference > 1) {
            studyStreak = 1;
        }

        lastStudyDate = today;
    }

    localStorage.setItem(
        "studyStreak",
        studyStreak
    );

    localStorage.setItem(
        "lastStudyDate",
        lastStudyDate
    );
}


/* =========================
QUIZ RESULTS
========================= */

function saveQuizResult(
    topic,
    correct,
    total
) {

    const score =
        total > 0
            ? Math.round(
                (correct / total) * 100
            )
            : 0;

    quizResults.unshift({

        topic,
        correct,
        total,
        score,
        date: new Date().toLocaleString()

    });

    quizResults =
        quizResults.slice(0, 100);

    localStorage.setItem(
        "quizResults",
        JSON.stringify(quizResults)
    );
}


/* =========================
MISTAKES
========================= */

function saveMistake(
    topic,
    question,
    selectedAnswer,
    correctAnswer,
    explanation
) {

    mistakeHistory.unshift({

        topic,
        question,
        selectedAnswer,
        correctAnswer,
        explanation,
        date: new Date().toLocaleString()

    });

    mistakeHistory =
        mistakeHistory.slice(0, 200);

    localStorage.setItem(
        "mistakeHistory",
        JSON.stringify(mistakeHistory)
    );
}


/* =========================
REMOVE OLD BUTTONS
========================= */

function removeOldStudyToolButtons() {

    const possibleIds = [
        "#aiStudyPlanButton",
        "#reviewMistakesButton",
        "#aiPlanButton",
        "#studyPlanButton",
        "#mistakeReviewButton"
    ];

    possibleIds.forEach(selector => {

        document
            .querySelectorAll(selector)
            .forEach(button => {
                button.remove();
            });

    });

    document
        .querySelectorAll("button")
        .forEach(button => {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();

            if (
                text.includes("ai study plan") ||
                text === "review my mistakes" ||
                text.includes("review my mistakes")
            ) {
                button.remove();
            }

        });
}


/* =========================
IMAGE UPLOAD
========================= */

if (imageButton) {

    imageButton.addEventListener(
        "click",
        function () {

            imageUploadArea.innerHTML = `

                <input
                    type="file"
                    id="imageInput"
                    accept="image/*"
                >

                <div id="imagePreview"></div>

            `;

            document
                .querySelector("#imageInput")
                .addEventListener(
                    "change",
                    handleImageUpload
                );
        }
    );
}


function handleImageUpload(event) {

    const file =
        event.target.files[0];

    if (!file) return;

    const reader =
        new FileReader();

    reader.onload =
        function (e) {

            uploadedImage =
                e.target.result;

            document.querySelector(
                "#imagePreview"
            ).innerHTML = `

                <div class="uploaded-image">

                    <img
                        src="${uploadedImage}"
                        alt="Uploaded notes"
                    >

                    <p>
                        ✅ Notes uploaded!
                    </p>

                </div>

            `;

            imageActions.innerHTML = `

                <button
                    id="imageStudyButton"
                    type="button"
                    style="
                        background-color: #e53935;
                        color: white;
                    "
                >
                    📖 Study These Notes
                </button>

                <button
                    id="imageQuizButton"
                    type="button"
                    style="
                        background-color: #fdd835;
                        color: #222;
                    "
                >
                    📝 Quiz Me
                </button>

                <button
                    id="imageFlashcardButton"
                    type="button"
                    style="
                        background-color: #90ee90;
                        color: #222;
                    "
                >
                    🧠 Make Flashcards
                </button>

            `;

            document
                .querySelector("#imageStudyButton")
                .addEventListener(
                    "click",
                    startImageStudy
                );

            document
                .querySelector("#imageQuizButton")
                .addEventListener(
                    "click",
                    startImageQuiz
                );

            document
                .querySelector("#imageFlashcardButton")
                .addEventListener(
                    "click",
                    startImageFlashcards
                );
        };

    reader.readAsDataURL(file);
}


/* =========================
START STUDYING
========================= */

if (studyButton) {

    studyButton.addEventListener(
        "click",
        startStudying
    );
}


async function startStudying() {

    const topic =
        getTopic();

    if (!topic) {

        showMessage(
            "📚 Pick Something to Study!",
            "Type a topic or upload your notes. ✏️📖"
        );

        return;
    }

    currentStudyTopic =
        topic;

    saveHistory(
        topic,
        "Study"
    );

    updateStudySession();

    showLoading(
        "Making your easy lesson..."
    );

    try {

        const response =
            await fetch(
                "/api/study",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        topic,

                        learningStyle: {

                            readingLevel:
                                "1st grade",

                            sentenceLength:
                                "very short",

                            useEmojis:
                                true,

                            useSpacing:
                                true,

                            useSimpleExamples:
                                true,

                            useBold:
                                true,

                            noHashtags:
                                true,

                            noLatex:
                                true,

                            noBackslashMath:
                                true

                        }

                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "The AI could not make the lesson."
            );
        }

        currentLesson =
            lessonToText(data);

        displayLesson(
            currentLesson
        );

    } catch (error) {

        console.error(
            "STUDY ERROR:",
            error
        );

        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Error
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


/* =========================
AI TUTOR
========================= */

async function askTutor(message) {

    const responseBox =
        document.querySelector(
            "#aiResponse"
        );

    if (!responseBox) return;

    responseBox.innerHTML = `
        <div class="loading">
            🤖 Thinking...
        </div>
    `;

    try {

        const response =
            await fetch(
                "/api/tutor",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        topic:
                            currentStudyTopic,

                        lesson:
                            currentLesson,

                        question:
                            message,

                        rules: {

                            easyWords:
                                true,

                            firstGradeLevel:
                                true,

                            useEmojis:
                                true,

                            useBold:
                                true,

                            noHashtags:
                                true,

                            noLatex:
                                true,

                            noBackslashMath:
                                true

                        }

                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "The AI could not answer."
            );
        }

        responseBox.innerHTML = `

            <div class="ai-response">

                <strong>
                    🤖 AI Tutor
                </strong>

                <div>
                    ${formatAIText(
                        data.answer
                    )}
                </div>

            </div>

        `;

        const input =
            document.querySelector(
                "#aiChatInput"
            );

        if (input) {
            input.value = "";
        }

    } catch (error) {

        responseBox.innerHTML = `

            <div class="ai-response">

                ⚠️
                ${escapeHTML(
                    error.message
                )}

            </div>

        `;
    }
}


/* =========================
DISPLAY LESSON
========================= */

function displayLesson(text) {

    result.innerHTML = `

        <div class="result-title">

            <div class="big-icon">
                📖
            </div>

            <div>

                <h2>
                    Let's Learn! 🌟
                </h2>

                <p>
                    About
                    ${escapeHTML(
                        currentStudyTopic
                    )}
                </p>

            </div>

        </div>


        <div class="lesson">

            ${formatAIText(text)}

        </div>


        <div class="ai-question-box">

            <h3>
                🤔 Talk to Your AI Tutor
            </h3>

            <div class="ai-question">
                You can ask the AI something
                or answer a question it asks you.
            </div>

            <div class="suggestion-grid">

                <button
                    class="suggestion-button"
                    data-question="Explain the most important part again using very easy words."
                    type="button"
                >
                    🔁 Explain it again
                </button>

                <button
                    class="suggestion-button"
                    data-question="Give me a very easy example about this topic."
                    type="button"
                >
                    💡 Give me an example
                </button>

                <button
                    class="suggestion-button"
                    data-question="Explain this using very simple words."
                    type="button"
                >
                    😊 Explain simply
                </button>

                <button
                    class="suggestion-button"
                    data-question="Ask me one easy question about this exact topic. Wait for me to answer it."
                    type="button"
                >
                    ❓ Ask me a question
                </button>

            </div>


            <textarea
                id="aiChatInput"
                class="ai-chat-input"
                placeholder="Type your answer or ask the AI about your lesson..."
            ></textarea>


            <button
                id="askAIButton"
                class="ask-ai-button"
                type="button"
            >
                💬 Send to AI
            </button>


            <div id="aiResponse"></div>

        </div>

    `;


    document
        .querySelectorAll(
            ".suggestion-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    askTutor(
                        this.dataset.question
                    );

                }
            );

        });


    document
        .querySelector(
            "#askAIButton"
        )
        .addEventListener(
            "click",
            function () {

                const input =
                    document.querySelector(
                        "#aiChatInput"
                    );

                const message =
                    input.value.trim();

                if (!message) {
                    return;
                }

                askTutor(message);

            }
        );


    document
        .querySelector(
            "#aiChatInput"
        )
        .addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    const message =
                        this.value.trim();

                    if (message) {
                        askTutor(message);
                    }

                }

            }
        );
}


/* =========================
QUIZ
========================= */

if (quizButton) {

    quizButton.addEventListener(
        "click",
        startQuiz
    );
}


async function startQuiz() {

    const topic =
        getTopic();

    if (!topic) {

        showMessage(
            "📝 Pick a Topic First!",
            "Type a topic or upload your notes. 📚"
        );

        return;
    }

    currentStudyTopic =
        topic;

    showLoading(
        `Making a quiz only about ${topic}...`
    );

    try {

        const response =
            await fetch(
                "/api/quiz",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        topic,

                        questionCount:
                            10,

                        rules: {

                            easyWords:
                                true,

                            useBold:
                                true,

                            noHashtags:
                                true,

                            noLatex:
                                true,

                            noBackslashMath:
                                true

                        }

                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "The AI could not make the quiz."
            );
        }

        quizQuestions =
            Array.isArray(
                data.questions
            )
                ? data.questions
                : [];

        if (!quizQuestions.length) {

            throw new Error(
                "The AI did not return any quiz questions."
            );
        }

        currentQuizIndex = 0;
        quizCorrect = 0;
        quizWrong = 0;

        displayQuizQuestion();

    } catch (error) {

        console.error(
            "QUIZ ERROR:",
            error
        );

        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Quiz Error
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


/* =========================
DISPLAY QUIZ QUESTION
========================= */

function displayQuizQuestion() {

    const question =
        quizQuestions[
            currentQuizIndex
        ];

    if (!question) {

        finishQuiz();

        return;
    }

    const choices =
        getQuestionChoices(
            question
        );

    if (!choices.length) {

        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Quiz Error
                </h3>

                <p>
                    This question did not
                    contain answer choices.
                </p>

            </div>

        `;

        return;
    }

    let optionsHTML = "";


    choices.forEach(
        (option, index) => {

            const letter =
                String.fromCharCode(
                    65 + index
                );

            optionsHTML += `

                <button
                    class="quiz-option"
                    data-index="${index}"
                    type="button"
                >
                    ${letter})
                    ${formatAIText(option)}
                </button>

            `;

        }
    );


    result.innerHTML = `

        <div class="result-title">

            <div class="big-icon">
                📝
            </div>

            <div>

                <h2>
                    Quiz Time! 🧠
                </h2>

                <p>
                    Topic:
                    <strong>
                        ${escapeHTML(
                            currentStudyTopic
                        )}
                    </strong>
                </p>

                <p>
                    Question
                    ${currentQuizIndex + 1}
                    of
                    ${quizQuestions.length}
                </p>

            </div>

        </div>


        <div class="quiz-progress">

            Question
            ${currentQuizIndex + 1}
            of
            ${quizQuestions.length}

        </div>


        <div class="quiz-question">

            <h3>
                ${formatAIText(
                    question.question
                )}
            </h3>

            ${optionsHTML}

            <div id="quizFeedback"></div>

        </div>

    `;


    document
        .querySelectorAll(
            ".quiz-option"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    answerQuiz(
                        Number(
                            this.dataset.index
                        )
                    );

                }
            );

        });
}


/* =========================
ANSWER QUIZ
========================= */

function answerQuiz(
    selectedIndex
) {

    const question =
        quizQuestions[
            currentQuizIndex
        ];

    const choices =
        getQuestionChoices(
            question
        );

    const correctIndex =
        getCorrectAnswerIndex(
            question
        );

    if (
        correctIndex < 0 ||
        correctIndex >= choices.length
    ) {

        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Quiz Error
                </h3>

                <p>
                    The AI did not provide
                    a valid correct answer.
                </p>

            </div>

        `;

        return;
    }


    const buttons =
        document.querySelectorAll(
            ".quiz-option"
        );


    buttons.forEach(
        button => {
            button.disabled = true;
        }
    );


    buttons.forEach(
        (button, index) => {

            if (
                index === correctIndex
            ) {

                button.classList.add(
                    "correct-answer"
                );

            }

            if (
                index === selectedIndex &&
                selectedIndex !== correctIndex
            ) {

                button.classList.add(
                    "wrong-answer"
                );

            }

        }
    );


    const feedback =
        document.querySelector(
            "#quizFeedback"
        );


    if (
        selectedIndex === correctIndex
    ) {

        quizCorrect++;


        feedback.innerHTML = `

            <div
                class="quiz-explanation correct-explanation"
            >

                <strong>
                    ✅ Correct!
                </strong>

                <p>
                    You got it right! 🎉
                </p>

                ${formatAIText(
                    question.explanation
                )}

                <button
                    id="nextQuestionButton"
                    type="button"
                >
                    ➡️ Next Question
                </button>

            </div>

        `;

    } else {

        quizWrong++;


        saveMistake(
            currentStudyTopic,
            question.question,
            choices[selectedIndex],
            choices[correctIndex],
            question.explanation
        );


        feedback.innerHTML = `

            <div
                class="quiz-explanation wrong-explanation"
            >

                <strong>
                    ❌ Not quite!
                </strong>

                <p>
                    You picked:

                    <strong>
                        ${formatAIText(
                            choices[selectedIndex]
                        )}
                    </strong>
                </p>

                <p>
                    The correct answer is:

                    <strong>
                        ${formatAIText(
                            choices[correctIndex]
                        )}
                    </strong>
                </p>

                ${formatAIText(
                    question.explanation
                )}

                <button
                    id="nextQuestionButton"
                    type="button"
                >
                    ➡️ Next Question
                </button>

            </div>

        `;
    }


    document
        .querySelector(
            "#nextQuestionButton"
        )
        .addEventListener(
            "click",
            function () {

                currentQuizIndex++;

                displayQuizQuestion();

            }
        );
}


/* =========================
FINISH QUIZ
========================= */

function finishQuiz() {

    const total =
        quizQuestions.length;

    if (!total) return;


    const percentage =
        Math.round(
            (quizCorrect / total) * 100
        );


    saveHistory(
        currentStudyTopic,
        "Quiz"
    );


    saveQuizResult(
        currentStudyTopic,
        quizCorrect,
        total
    );


    result.innerHTML = `

        <div class="quiz-final-score">

            <div class="score-circle">

                <strong>
                    ${percentage}%
                </strong>

                <span>
                    Score
                </span>

            </div>


            <h2>
                🎉 Quiz Finished!
            </h2>


            <p>
                Topic:
                <strong>
                    ${escapeHTML(
                        currentStudyTopic
                    )}
                </strong>
            </p>


            <p>
                You got
                ${quizCorrect}
                out of
                ${total}
                correct.
            </p>


            <div class="score-stats">

                <div class="correct-stat">
                    ✅ Correct:
                    ${quizCorrect}
                </div>

                <div class="wrong-stat">
                    ❌ Wrong:
                    ${quizWrong}
                </div>

            </div>


            <div class="quiz-final-buttons">

                <button
                    id="retryQuizButton"
                    type="button"
                >
                    🔄 Try Again
                </button>


                <button
                    id="reviewTopicButton"
                    type="button"
                >
                    📖 Review Topic
                </button>

            </div>

        </div>

    `;


    document
        .querySelector(
            "#retryQuizButton"
        )
        .addEventListener(
            "click",
            startQuiz
        );


    document
        .querySelector(
            "#reviewTopicButton"
        )
        .addEventListener(
            "click",
            startStudying
        );
}


/* =========================
FLASHCARDS
========================= */

if (flashcardButton) {

    flashcardButton.addEventListener(
        "click",
        startFlashcards
    );
}


async function startFlashcards() {

    const topic =
        getTopic();

    if (!topic) {

        showMessage(
            "🧠 Pick a Topic First!",
            "Type a topic or upload your notes. 📚"
        );

        return;
    }


    currentStudyTopic =
        topic;


    saveHistory(
        topic,
        "Flashcards"
    );


    showLoading(
        `Making flashcards only about ${topic}...`
    );


    try {

        const response =
            await fetch(
                "/api/flashcards",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        topic,

                        rules: {

                            easyWords:
                                true,

                            useBold:
                                true,

                            noHashtags:
                                true,

                            noLatex:
                                true,

                            noBackslashMath:
                                true

                        }

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "The AI could not make flashcards."
            );
        }


        displayFlashcards(
            data.flashcards
        );


    } catch (error) {

        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Error
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


function displayFlashcards(cards) {

    if (
        !Array.isArray(cards) ||
        !cards.length
    ) {

        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ No flashcards were created.
                </h3>

            </div>

        `;

        return;
    }


    let html = `

        <div class="result-title">

            <div class="big-icon">
                🧠
            </div>

            <div>

                <h2>
                    Flashcards
                </h2>

                <p>
                    Topic:
                    <strong>
                        ${escapeHTML(
                            currentStudyTopic
                        )}
                    </strong>
                </p>

                <p>
                    Tap the button to see each answer.
                </p>

            </div>

        </div>

    `;


    cards.forEach(
        (card, index) => {

            html += `

                <div class="flashcard">

                    <div class="flashcard-number">
                        Card ${index + 1}
                    </div>

                    <h3>
                        ${formatAIText(
                            card.question
                        )}
                    </h3>

                    <button
                        class="show-answer-button"
                        data-card="${index}"
                        type="button"
                    >
                        👀 Show Answer
                    </button>

                    <div
                        class="flashcard-answer"
                        id="flashcard-answer-${index}"
                    >

                        <strong>
                            Answer:
                        </strong>

                        <p>
                            ${formatAIText(
                                card.answer
                            )}
                        </p>

                    </div>

                </div>

            `;
        }
    );


    result.innerHTML =
        html;


    document
        .querySelectorAll(
            ".show-answer-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const answer =
                        document.querySelector(
                            `#flashcard-answer-${this.dataset.card}`
                        );


                    answer.classList.toggle(
                        "show"
                    );


                    this.textContent =
                        answer.classList.contains(
                            "show"
                        )
                            ? "🙈 Hide Answer"
                            : "👀 Show Answer";

                }
            );

        });
}


/* =========================
IMAGE STUDY
========================= */

async function startImageStudy() {

    if (!uploadedImage) {

        showMessage(
            "📷 Upload Your Notes First!",
            "Upload a picture of your notes and I can help you study them. 📚"
        );

        return;
    }


    showLoading(
        "Looking at your notes..."
    );


    try {

        const response =
            await fetch(
                "/api/image-study",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        image:
                            uploadedImage,

                        rules: {

                            firstGradeLevel:
                                true,

                            easyWords:
                                true,

                            simpleExamples:
                                true,

                            useEmojis:
                                true,

                            useBold:
                                true,

                            noHashtags:
                                true,

                            noLatex:
                                true,

                            noBackslashMath:
                                true

                        }

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Could not read the notes."
            );
        }


        currentStudyTopic =
            "Uploaded notes";


        currentLesson =
            lessonToText(data);


        updateStudySession();


        saveHistory(
            "Uploaded notes",
            "Study"
        );


        displayLesson(
            currentLesson
        );


    } catch (error) {

        console.error(
            "IMAGE STUDY ERROR:",
            error
        );


        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Error
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


/* =========================
IMAGE QUIZ
========================= */

async function startImageQuiz() {

    if (!uploadedImage) {

        showMessage(
            "📷 Upload Your Notes First!",
            "Upload a picture of your notes and I can make a quiz for you. 📝"
        );

        return;
    }


    showLoading(
        "Making a quiz from your notes..."
    );


    try {

        const response =
            await fetch(
                "/api/image-quiz",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        image:
                            uploadedImage,

                        questionCount:
                            10,

                        rules: {

                            easyWords:
                                true,

                            useBold:
                                true,

                            noHashtags:
                                true,

                            noLatex:
                                true,

                            noBackslashMath:
                                true

                        }

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Could not make the quiz."
            );
        }


        currentStudyTopic =
            "Uploaded notes";


        quizQuestions =
            Array.isArray(
                data.questions
            )
                ? data.questions
                : [];


        if (!quizQuestions.length) {

            throw new Error(
                "The AI did not return any quiz questions."
            );
        }


        currentQuizIndex = 0;

        quizCorrect = 0;

        quizWrong = 0;


        displayQuizQuestion();


    } catch (error) {

        console.error(
            "IMAGE QUIZ ERROR:",
            error
        );


        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Quiz Error
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


/* =========================
IMAGE FLASHCARDS
========================= */

async function startImageFlashcards() {

    if (!uploadedImage) {

        showMessage(
            "📷 Upload Your Notes First!",
            "Upload a picture of your notes and I can make flashcards for you. 🧠"
        );

        return;
    }


    showLoading(
        "Making flashcards from your notes..."
    );


    try {

        const response =
            await fetch(
                "/api/image-flashcards",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        image:
                            uploadedImage,

                        rules: {

                            easyWords:
                                true,

                            useBold:
                                true,

                            noHashtags:
                                true,

                            noLatex:
                                true,

                            noBackslashMath:
                                true

                        }

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Could not make flashcards."
            );
        }


        currentStudyTopic =
            "Uploaded notes";


        saveHistory(
            "Uploaded notes",
            "Flashcards"
        );


        displayFlashcards(
            data.flashcards
        );


    } catch (error) {

        console.error(
            "IMAGE FLASHCARD ERROR:",
            error
        );


        result.innerHTML = `

            <div class="empty-state">

                <h3>
                    ⚠️ Error
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


/* =========================
HISTORY
========================= */

if (historyButton) {

    historyButton.addEventListener(
        "click",
        showHistory
    );
}


function showHistory() {

    if (!studyHistory.length) {

        showMessage(
            "📚 Study History",
            "You do not have any study history yet. Start studying to see it here! 📖"
        );

        return;
    }


    let html = `

        <div class="result-title">

            <div class="big-icon">
                📚
            </div>

            <div>

                <h2>
                    Study History
                </h2>

                <p>
                    Your recent study activity.
                </p>

            </div>

        </div>

    `;


    studyHistory.forEach(
        item => {

            html += `

                <div class="history-item">

                    <div class="history-icon">
                        📖
                    </div>

                    <div class="history-info">

                        <strong>
                            ${escapeHTML(
                                item.topic
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.type
                            )}
                        </span>

                        <small>
                            ${escapeHTML(
                                item.date
                            )}
                        </small>

                    </div>

                </div>

            `;

        }
    );


    html += `

        <button
            id="clearHistoryButton"
            class="danger-button"
            type="button"
        >
            🗑️ Clear History
        </button>

    `;


    result.innerHTML =
        html;


    document
        .querySelector(
            "#clearHistoryButton"
        )
        .addEventListener(
            "click",
            function () {

                const confirmed =
                    confirm(
                        "Are you sure you want to clear your study history?"
                    );

                if (!confirmed) return;


                studyHistory = [];


                localStorage.removeItem(
                    "studyHistory"
                );


                showHistory();

            }
        );
}


/* =========================
PROGRESS CHART
========================= */

function createProgressChart() {

    const results =
        quizResults
            .slice()
            .reverse()
            .slice(-10);


    if (!results.length) {

        return `

            <div class="goal-card">

                <h3>
                    📈 Quiz Score Progress
                </h3>

                <p>
                    Take some quizzes to see
                    your score progress here.
                </p>

                <button
                    id="resetProgressButton"
                    class="danger-button"
                    type="button"
                >
                    🔄 Reset My Progress
                </button>

            </div>

        `;
    }


    let html = `

        <div class="goal-card">

            <h3>
                📈 Quiz Score Progress
            </h3>

            <p>
                Your last
                ${results.length}
                quiz scores.
            </p>

            <div class="score-chart">

    `;


    results.forEach(
        item => {

            html += `

                <div class="chart-item">

                    <div
                        class="chart-bar"
                        style="
                            height:
                            ${Math.max(
                                10,
                                item.score
                            )}%;
                        "
                        title="${item.score}%"
                    >

                        <span>
                            ${item.score}%
                        </span>

                    </div>

                    <small>
                        ${escapeHTML(
                            item.topic
                        )}
                    </small>

                </div>

            `;

        }
    );


    html += `

            </div>

            <button
                id="resetProgressButton"
                class="danger-button"
                type="button"
            >
                🔄 Reset My Progress
            </button>

        </div>

    `;


    return html;
}


/* =========================
RESET PROGRESS
========================= */

function resetAllProgress() {

    const confirmed =
        confirm(
            "Are you sure you want to reset your progress? This will erase your study history, quiz scores, mistakes, sessions, and goal. Your streak will stay."
        );


    if (!confirmed) {
        return;
    }


    const savedStreak =
        studyStreak;

    const savedLastStudyDate =
        lastStudyDate;


    localStorage.clear();


    localStorage.setItem(
        "studyStreak",
        savedStreak
    );


    localStorage.setItem(
        "lastStudyDate",
        savedLastStudyDate
    );


    studyHistory = [];

    studySessions = 0;

    studyGoal = 0;

    quizResults = [];

    mistakeHistory = [];

    studyStreak =
        savedStreak;

    lastStudyDate =
        savedLastStudyDate;


    currentStudyTopic = "";

    currentLesson = "";

    quizQuestions = [];

    currentQuizIndex = 0;

    quizCorrect = 0;

    quizWrong = 0;


    showMessage(
        "✅ Progress Reset!",
        "Your progress was cleared. Your streak was kept. 🔥"
    );
}


/* =========================
PROGRESS DASHBOARD
========================= */

if (progressButton) {

    progressButton.addEventListener(
        "click",
        showProgress
    );
}


function showProgress() {

    const lessons =
        studyHistory.filter(
            x => x.type === "Study"
        ).length;


    const quizzes =
        studyHistory.filter(
            x => x.type === "Quiz"
        ).length;


    const flashcards =
        studyHistory.filter(
            x => x.type === "Flashcards"
        ).length;


    const totalQuestions =
        quizResults.reduce(
            (sum, item) =>
                sum + item.total,
            0
        );


    const totalCorrect =
        quizResults.reduce(
            (sum, item) =>
                sum + item.correct,
            0
        );


    const averageScore =
        totalQuestions > 0
            ? Math.round(
                (totalCorrect /
                    totalQuestions) *
                100
            )
            : 0;


    result.innerHTML = `

        <div class="result-title">

            <div class="big-icon">
                📊
            </div>

            <div>

                <h2>
                    Progress Dashboard
                </h2>

                <p>
                    Your study progress.
                </p>

            </div>

        </div>


        <div class="dashboard-grid">

            <div class="stat-card">

                <span>📚</span>

                <strong>
                    ${studyHistory.length}
                </strong>

                <small>
                    Activities
                </small>

            </div>


            <div class="stat-card">

                <span>📖</span>

                <strong>
                    ${lessons}
                </strong>

                <small>
                    Lessons
                </small>

            </div>


            <div class="stat-card">

                <span>📝</span>

                <strong>
                    ${quizzes}
                </strong>

                <small>
                    Quizzes
                </small>

            </div>


            <div class="stat-card">

                <span>🧠</span>

                <strong>
                    ${flashcards}
                </strong>

                <small>
                    Flashcards
                </small>

            </div>

        </div>


        <div class="dashboard-grid">

            <div class="stat-card">

                <span>🎯</span>

                <strong>
                    ${averageScore}%
                </strong>

                <small>
                    Quiz Average
                </small>

            </div>


            <div class="stat-card">

                <span>🔥</span>

                <strong>
                    ${studyStreak}
                </strong>

                <small>
                    Day Streak
                </small>

            </div>


            <div class="stat-card">

                <span>❓</span>

                <strong>
                    ${totalQuestions}
                </strong>

                <small>
                    Questions
                </small>

            </div>


            <div class="stat-card">

                <span>✅</span>

                <strong>
                    ${totalCorrect}
                </strong>

                <small>
                    Correct
                </small>

            </div>

        </div>


        ${createProgressChart()}


        <div class="goal-card">

            <h3>
                📈 Learning Progress
            </h3>

            <p>
                Your dashboard shows your
                study activity, quiz scores,
                goals, and streak.
            </p>

            <p>
                Quiz attempts:
                <strong>
                    ${quizResults.length}
                </strong>
            </p>

            ${
                quizResults.length
                    ? `
                        <p>
                            Latest topic:
                            <strong>
                                ${escapeHTML(
                                    quizResults[0].topic
                                )}
                            </strong>
                        </p>

                        <p>
                            Latest score:
                            <strong>
                                ${quizResults[0].score}%
                            </strong>
                        </p>
                    `
                    : ""
            }

        </div>


        <div class="goal-card">

            <h3>
                🎯 Your Goal
            </h3>

            ${
                studyGoal
                    ? `

                        <p>
                            Goal:
                            Study
                            ${studyGoal}
                            times
                        </p>


                        <div class="progress-bar">

                            <div
                                class="progress-fill"
                                style="
                                    width:
                                    ${Math.min(
                                        100,
                                        (studySessions /
                                            studyGoal) *
                                        100
                                    )}%;
                                "
                            ></div>

                        </div>


                        <p>
                            ${Math.min(
                                studySessions,
                                studyGoal
                            )}
                            /
                            ${studyGoal}
                            study sessions
                        </p>

                    `
                    : `

                        <p>
                            You have not set a goal yet.
                        </p>

                    `
            }

        </div>

    `;


    const resetButton =
        document.querySelector(
            "#resetProgressButton"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetAllProgress
        );

    }
}


/* =========================
DOWNLOAD STUDY REPORT
========================= */

function downloadStudyReport() {

    const totalQuestions =
        quizResults.reduce(
            (sum, item) =>
                sum + item.total,
            0
        );


    const totalCorrect =
        quizResults.reduce(
            (sum, item) =>
                sum + item.correct,
            0
        );


    const averageScore =
        totalQuestions
            ? Math.round(
                (totalCorrect /
                    totalQuestions) *
                100
            )
            : 0;


    let report = "";


    report +=
        "AI STUDY ASSISTANT - STUDY REPORT\n";

    report +=
        "====================================\n\n";

    report +=
        `Study sessions: ${studySessions}\n`;

    report +=
        `Study streak: ${studyStreak} days\n`;

    report +=
        `Study goal: ${
            studyGoal
                ? studyGoal + " sessions"
                : "Not set"
        }\n`;

    report +=
        `Quiz attempts: ${quizResults.length}\n`;

    report +=
        `Questions answered: ${totalQuestions}\n`;

    report +=
        `Correct answers: ${totalCorrect}\n`;

    report +=
        `Average quiz score: ${averageScore}%\n\n`;


    report +=
        "QUIZ HISTORY\n";

    report +=
        "------------\n";


    quizResults
        .slice(0, 20)
        .forEach(item => {

            report +=
                `- ${item.topic}: ` +
                `${item.score}% ` +
                `(${item.correct}/${item.total}) ` +
                `- ${item.date}\n`;

        });


    report +=
        "\nMISTAKES\n";

    report +=
        "--------\n";


    mistakeHistory
        .slice(0, 20)
        .forEach(item => {

            report +=
                `- ${item.topic}: ` +
                `${item.question}\n`;

            report +=
                ` Your answer: ` +
                `${item.selectedAnswer}\n`;

            report +=
                ` Correct answer: ` +
                `${item.correctAnswer}\n\n`;

        });


    report +=
        "Generated by AI Study Assistant.\n";


    const blob =
        new Blob(
            [report],
            {
                type:
                    "text/plain"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "AI-Study-Assistant-Report.txt";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );
}


/* =========================
GOAL
========================= */

if (goalButton) {

    goalButton.addEventListener(
        "click",
        showGoal
    );
}


function showGoal() {

    result.innerHTML = `

        <div class="result-title">

            <div class="big-icon">
                🎯
            </div>

            <div>

                <h2>
                    Study Goal
                </h2>

                <p>
                    Choose how many times
                    you want to study.
                </p>

            </div>

        </div>


        <div class="goal-card">

            <h3>

                ${
                    studyGoal
                        ? `Goal:
                           Study
                           ${studyGoal}
                           times`
                        : "Choose a study goal"
                }

            </h3>


            <p>
                Pick a goal or enter your own number.
            </p>


            <div class="suggestion-grid">

                <button
                    class="suggestion-button goal-choice"
                    data-goal="5"
                    type="button"
                >
                    Study 5 times
                </button>


                <button
                    class="suggestion-button goal-choice"
                    data-goal="10"
                    type="button"
                >
                    Study 10 times
                </button>


                <button
                    class="suggestion-button goal-choice"
                    data-goal="20"
                    type="button"
                >
                    Study 20 times
                </button>


                <button
                    class="suggestion-button goal-choice"
                    data-goal="30"
                    type="button"
                >
                    Study 30 times
                </button>

            </div>


            <div class="custom-goal">

                <p>
                    Or enter your own goal:
                </p>


                <input
                    id="customGoalInput"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Example: 15"
                >


                <button
                    id="customGoalButton"
                    class="suggestion-button"
                    type="button"
                >
                    Set Custom Goal
                </button>

            </div>


            ${
                studyGoal
                    ? `

                        <div class="progress-bar">

                            <div
                                class="progress-fill"
                                style="
                                    width:
                                    ${Math.min(
                                        100,
                                        (studySessions /
                                            studyGoal) *
                                        100
                                    )}%;
                                "
                            ></div>

                        </div>


                        <p>
                            ${Math.min(
                                studySessions,
                                studyGoal
                            )}
                            /
                            ${studyGoal}
                            study sessions
                        </p>


                        <button
                            id="resetGoalButton"
                            class="reset-goal-button"
                            type="button"
                        >
                            🔴 Reset Study Goal
                        </button>


                        <button
                            id="resetSessionsButton"
                            class="danger-button"
                            type="button"
                        >
                            🔴 Reset Study Sessions
                        </button>

                    `
                    : ""
            }

        </div>

    `;


    document
        .querySelectorAll(
            ".goal-choice"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    studyGoal =
                        Number(
                            this.dataset.goal
                        );


                    localStorage.setItem(
                        "studyGoal",
                        studyGoal
                    );


                    showGoal();

                }
            );

        });


    document
        .querySelector(
            "#customGoalButton"
        )
        .addEventListener(
            "click",
            function () {

                const input =
                    document.querySelector(
                        "#customGoalInput"
                    );


                const customGoal =
                    Number(
                        input.value
                    );


                if (
                    !customGoal ||
                    customGoal < 1
                ) {

                    alert(
                        "Please enter a number greater than 0."
                    );

                    return;
                }


                studyGoal =
                    Math.floor(
                        customGoal
                    );


                localStorage.setItem(
                    "studyGoal",
                    studyGoal
                );


                showGoal();

            }
        );


    const resetGoalButton =
        document.querySelector(
            "#resetGoalButton"
        );


    if (resetGoalButton) {

        resetGoalButton.addEventListener(
            "click",
            function () {

                studyGoal = 0;


                localStorage.removeItem(
                    "studyGoal"
                );


                showGoal();

            }
        );
    }


    const resetSessionsButton =
        document.querySelector(
            "#resetSessionsButton"
        );


    if (resetSessionsButton) {

        resetSessionsButton.addEventListener(
            "click",
            function () {

                studySessions = 0;


                localStorage.setItem(
                    "studySessions",
                    "0"
                );


                showGoal();

            }
        );
    }
}


/* =========================
STREAK
========================= */

if (streakButton) {

    streakButton.addEventListener(
        "click",
        function () {

            if (studySessions === 0) {

                showMessage(
                    "🔥 Your Streak",
                    `
                    You have a
                    <strong>
                        ${studyStreak}
                    </strong>
                    day streak. 🔥

                    <br><br>

                    Start studying today
                    to keep it going! 📚
                    `
                );

                return;
            }


            result.innerHTML = `

                <div class="result-title">

                    <div class="big-icon">
                        🔥
                    </div>

                    <div>

                        <h2>
                            Study Streak
                        </h2>

                        <p>
                            Keep learning every day!
                        </p>

                    </div>

                </div>


                <div class="goal-card">

                    <h3>
                        🔥
                        ${studyStreak}
                        Day Streak
                    </h3>

                    <p>
                        Keep studying to continue
                        your streak. 💪
                    </p>

                </div>

            `;
        }
    );
}


/* =========================
REMOVE OLD BUTTONS
========================= */

removeOldStudyToolButtons();