const express = require("express");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(express.static(__dirname));


const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function askAI(prompt) {

    const response =
        await client.responses.create({

            model: "gpt-5.6-luna",

            input: prompt

        });

    return response.output_text;
}


async function askAIWithImage(
    prompt,
    image
) {

    const response =
        await client.responses.create({

            model: "gpt-5.6-luna",

            input: [

                {
                    role: "user",

                    content: [

                        {
                            type: "input_text",
                            text: prompt
                        },

                        {
                            type: "input_image",
                            image_url: image
                        }

                    ]

                }

            ]

        });

    return response.output_text;
}

const SIMPLE_WRITING_RULES = `

IMPORTANT WRITING RULES:

- Use very easy words.
- Aim for about a 1st-grade reading level.
- Use short sentences.
- Give one idea at a time.
- Explain hard school words right away.
- Use simple examples.
- Use everyday examples when they help.
- Use a few helpful emojis.
- Do not overuse emojis.
- Leave blank space between ideas.
- Do not make a giant wall of text.
- Use small sections.
- Use **bold** for important words.
- Do not put a period immediately after a phrase that introduces a bold answer, such as "You picked", "The correct answer is", or "The factors are".
- Put a space before and after **bold** words when they are part of a sentence.
- The ** symbols are for bold formatting.
- Do not use hashtags.
- Do not use LaTeX.
- Do not use backslash math.
- Do not make the material harder because the student did well.
- Do not make the material easier because the student did poorly.
- Do not use adaptive learning.
- Do not recommend what the student should study next.
- Stay on the exact topic the student chose.

`;

function cleanJSON(text) {

    if (!text) {
        throw new Error(
            "The AI returned an empty response."
        );
    }

    let cleaned =
        text.trim();

    cleaned =
        cleaned.replace(
            /^```json\s*/i,
            ""
        );

    cleaned =
        cleaned.replace(
            /^```\s*/i,
            ""
        );

    cleaned =
        cleaned.replace(
            /\s*```$/i,
            ""
        );

    return JSON.parse(
        cleaned
    );
}

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            __dirname + "/index.html"
        );

    }
);

app.post(
    "/api/study",
    async (req, res) => {

        try {

            const {
                topic
            } = req.body;


            if (!topic) {

                return res.status(400).json({
                    error:
                        "Please provide a topic."
                });

            }


            const prompt = `

You are a friendly AI study tutor.

The student's exact topic is:

"${topic}"

You MUST teach ONLY this exact topic.

Do not switch to another subject.
Do not add unrelated information.
Do not change the topic.

${SIMPLE_WRITING_RULES}

Create a short, clean lesson.

The lesson should:

1. Start by explaining what the topic is.
2. Break it into small easy sections.
3. Give simple examples.
4. Use a few helpful emojis like 📚 💡 ⭐ when they fit.
5. Use **bold** for important words.
6. End with ONE easy question for the student.

The student should be able to understand the lesson without already knowing a lot.

Do not talk about adaptive learning.
Do not recommend another topic.
Do not recommend what the student should study next.

Return ONLY valid JSON in this format:

{
    "title": "short title",
    "lesson": "full lesson text"
}

`;


            const aiText =
                await askAI(prompt);


            const data =
                cleanJSON(aiText);


            res.json(data);


        } catch (error) {

            console.error(
                "STUDY ERROR:",
                error
            );

            res.status(500).json({

                error:
                    "Something went wrong while creating the lesson."

            });

        }

    }
);

app.post(
    "/api/tutor",
    async (req, res) => {

        try {

            const {
                topic,
                lesson,
                question
            } = req.body;


            if (!topic || !question) {

                return res.status(400).json({

                    error:
                        "Topic and question are required."

                });

            }


            const prompt = `

You are a friendly AI tutor.

The student's EXACT chosen topic is:

"${topic}"

You MUST stay ONLY on this exact topic.

The lesson the student is studying is:

${lesson || "No lesson text was provided."}

The student's newest message is:

"${question}"

${SIMPLE_WRITING_RULES}

The student may be doing one of two things:

1. They may be asking you a question.
2. They may be answering a question that YOU previously asked them.

If the student is answering your question:

- Read their answer carefully.
- Tell them if their answer is correct.
- If it is correct, encourage them.
- If it is partly correct, tell them what they got right and what they should fix.
- If it is wrong, explain the correct answer using very easy words.
- Give a simple explanation.
- Keep talking with the student.
- Do NOT change the topic.

If the student asks a question:

- Answer it clearly.
- Use very easy words.
- Stay on the exact topic.
- Give a simple example when helpful.

Use a few helpful emojis.

Use **bold** for important words.

Do not show the ** symbols around bold words as plain text.
Use them only for formatting.

Do not use hashtags.
Do not use LaTeX.
Do not use backslash math.

Do not make the material harder or easier based on the student's answer.

Do not recommend another topic.
Do not recommend a study plan.
Do not recommend what the student should study next.

Return ONLY valid JSON:

{
    "answer": "your response to the student"
}

`;


            const aiText =
                await askAI(prompt);


            const data =
                cleanJSON(aiText);


            res.json(data);


        } catch (error) {

            console.error(
                "TUTOR ERROR:",
                error
            );

            res.status(500).json({

                error:
                    "Something went wrong while talking to the AI."

            });

        }

    }
);

app.post(
    "/api/quiz",
    async (req, res) => {

        try {

            const {
                topic,
                questionCount
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Please provide a topic."

                });

            }


            const count =
                Number(questionCount) || 10;


            const prompt = `

You are a quiz maker.

The student's EXACT chosen topic is:

"${topic}"

THIS IS EXTREMELY IMPORTANT:

Every question MUST be about "${topic}".

Do not switch subjects.

Do not ask random general knowledge questions.

Do not include another school subject.

Do not add unrelated information.

If the topic is "Algebra II", every question must be about Algebra II.

If the topic is "photosynthesis", every question must be about photosynthesis.

${SIMPLE_WRITING_RULES}

Create exactly ${count} multiple-choice questions.

Rules:

- Use very easy wording.
- Each question has 4 answer choices.
- Only ONE answer is correct.
- Give a short easy explanation.
- Keep every question strictly on the chosen topic.
- Use **bold** when helpful.
- Do not use hashtags.
- Do not use LaTeX.
- Do not use backslash math.
- Do not put a period immediately after phrases like "The answer is", "The correct answer is", "The factors are", or similar phrases when they are followed by a **bold** answer.
- Always put a space before and after **bold** words when they are part of a sentence.
- Do not add unnecessary periods directly before or after bold answer text.

Return ONLY valid JSON:

{
    "questions": [
        {
            "question": "question text",
            "choices": [
                "choice 1",
                "choice 2",
                "choice 3",
                "choice 4"
            ],
            "correctAnswerIndex": 0,
            "explanation": "easy explanation"
        }
    ]
}

`;


            const aiText =
                await askAI(prompt);


            const data =
    cleanJSON(aiText);


data.questions.forEach(question => {

    const correctChoice =
        question.choices[
            question.correctAnswerIndex
        ];

    for (
        let i = question.choices.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            question.choices[i],
            question.choices[j]
        ] = [
            question.choices[j],
            question.choices[i]
        ];

    }

    question.correctAnswerIndex =
        question.choices.indexOf(
            correctChoice
        );

});


res.json(data);

        } catch (error) {

            console.error(
                "QUIZ ERROR:",
                error
            );

            res.status(500).json({

                error:
                    "Something went wrong while creating the quiz."

            });

        }

    }
);

app.post(
    "/api/flashcards",
    async (req, res) => {

        try {

            const {
                topic
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Please provide a topic."

                });

            }


            const prompt = `

You are a flashcard maker.

The student's EXACT chosen topic is:

"${topic}"

Create flashcards ONLY about this exact topic.

Do not change the topic.

Do not add unrelated information.

${SIMPLE_WRITING_RULES}

Create 10 useful flashcards.

Each flashcard should have:

- A short question.
- A short easy answer.
- Important words can use **bold**.

Return ONLY valid JSON:

{
    "flashcards": [
        {
            "question": "short question",
            "answer": "short answer"
        }
    ]
}

`;


            const aiText =
                await askAI(prompt);


            const data =
                cleanJSON(aiText);


            res.json(data);


        } catch (error) {

            console.error(
                "FLASHCARD ERROR:",
                error
            );

            res.status(500).json({

                error:
                    "Something went wrong while creating flashcards."

            });

        }

    }
);

app.post(
    "/api/image-study",
    async (req, res) => {

        try {

            const {
                image
            } = req.body;


            if (!image) {

                return res.status(400).json({

                    error:
                        "Please upload an image."

                });

            }


            const prompt = `

You are an AI study tutor.

Look carefully at the student's uploaded notes.

ONLY teach information that is clearly shown in the notes.

Do not add unrelated information.

${SIMPLE_WRITING_RULES}

Make a short, clean lesson from the notes.

Use:

- Very easy words.
- Short sentences.
- Small sections.
- Simple examples when the notes support them.
- A few helpful emojis.
- **Bold** for important words.

End with one easy question about the notes.

Return ONLY valid JSON:

{
    "title": "short title",
    "lesson": "easy lesson based on the notes"
}

`;


            const aiText =
                await askAIWithImage(
                    prompt,
                    image
                );


            const data =
                cleanJSON(aiText);


            res.json(data);


        } catch (error) {

            console.error(
                "IMAGE STUDY ERROR:",
                error
            );

            res.status(500).json({

                error:
                    "Something went wrong while reading the notes."

            });

        }

    }
);

app.post(
    "/api/image-quiz",
    async (req, res) => {

        try {

            const {
                image,
                questionCount
            } = req.body;


            if (!image) {

                return res.status(400).json({

                    error:
                        "Please upload an image."

                });

            }


            const count =
                Number(questionCount) || 10;


            const prompt = `

You are a quiz maker.

Look carefully at the uploaded notes.

Create exactly ${count} multiple-choice questions.

EVERY question MUST come ONLY from information in the uploaded notes.

Do not add facts that are not in the notes.

Do not switch to another subject.

${SIMPLE_WRITING_RULES}

Each question needs:

- A question.
- 4 answer choices.
- One correct answer.
- A short easy explanation.

Use **bold** when helpful.

Do not put a period immediately after phrases like "The answer is", "The correct answer is", "The factors are", or similar phrases when they are followed by a **bold** answer.

Always put a space before and after **bold** words when they are part of a sentence.

Do not add unnecessary periods directly before or after bold answer text.

Return ONLY valid JSON:

{
    "questions": [
        {
            "question": "question text",
            "choices": [
                "choice 1",
                "choice 2",
                "choice 3",
                "choice 4"
            ],
            "correctAnswerIndex": 0,
            "explanation": "easy explanation"
        }
    ]
}

`;


            const aiText =
                await askAIWithImage(
                    prompt,
                    image
                );


            const data =
                cleanJSON(aiText);


            res.json(data);


        } catch (error) {

            console.error(
                "IMAGE QUIZ ERROR:",
                error
            );

            res.status(500).json({

                error:
                    "Something went wrong while creating the quiz."

            });

        }

    }
);

app.post(
    "/api/image-flashcards",
    async (req, res) => {

        try {

            const {
                image
            } = req.body;


            if (!image) {

                return res.status(400).json({

                    error:
                        "Please upload an image."

                });

            }


            const prompt = `

You are a flashcard maker.

Look carefully at the uploaded notes.

Create 10 flashcards ONLY from the information shown in the notes.

Do not add unrelated information.

Do not make up information that is not in the notes.

${SIMPLE_WRITING_RULES}

Each flashcard needs:

- A short question.
- A short easy answer.
- **Bold** important words when helpful.

Return ONLY valid JSON:

{
    "flashcards": [
        {
            "question": "short question",
            "answer": "short answer"
        }
    ]
}

`;


            const aiText =
                await askAIWithImage(
                    prompt,
                    image
                );


            const data =
                cleanJSON(aiText);


            res.json(data);


        } catch (error) {

            console.error(
                "IMAGE FLASHCARD ERROR:",
                error
            );

            res.status(500).json({

                error:
                    "Something went wrong while creating flashcards."

            });

        }

    }
);

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);