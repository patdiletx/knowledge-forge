import * as vscode from 'vscode';

interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
    difficulty: number;
    category: string; // e.g., 'javascript', 'react', 'nodejs', etc.
    type: 'theoretical' | 'practical';
}

interface SkillProfile {
    [category: string]: 'Novato' | 'Básico' | 'Intermedio' | 'Avanzado';
}

interface AssessmentResult {
    skillProfile: SkillProfile;
    overallLevel: 'Novato' | 'Básico' | 'Intermedio' | 'Avanzado';
    correctAnswers: number;
    totalQuestions: number;
    timeTaken: number; // in seconds
}

export class AssessmentService {
    private static questions: Question[] = [
        // JavaScript questions
        {
            id: 'js1',
            text: '¿Qué es un closure en JavaScript?',
            options: [
                'Un tipo de dato',
                'Una función que recuerda el scope en el que fue creada',
                'Un objeto que representa un error',
                'Una sintaxis para declarar variables'
            ],
            correctAnswer: 'Una función que recuerda el scope en el que fue creada',
            difficulty: 1,
            category: 'javascript',
            type: 'theoretical'
        },
        {
            id: 'js2',
            text: '¿Cuál de los siguientes no es un tipo de dato primitivo en JavaScript?',
            options: [
                'string',
                'number',
                'object',
                'boolean'
            ],
            correctAnswer: 'object',
            difficulty: 1,
            category: 'javascript',
            type: 'theoretical'
        },
        {
            id: 'js3',
            text: '¿Qué hace el método `Array.prototype.map()`?',
            options: [
                'Modifica el array original',
                'Crea un nuevo array con los resultados de llamar a una función para cada elemento del array',
                'Elimina elementos de un array',
                'Añade elementos a un array'
            ],
            correctAnswer: 'Crea un nuevo array con los resultados de llamar a una función para cada elemento del array',
            difficulty: 1,
            category: 'javascript',
            type: 'theoretical'
        },
        {
            id: 'js4',
            text: '¿Cuál es la diferencia entre `==` y `===` en JavaScript?',
            options: [
                'No hay diferencia',
                '`==` compara solo el valor, `===` compara el valor y el tipo',
                '`===` compara solo el valor, `==` compara el valor y el tipo',
                '`==` es más rápido que `===`'
            ],
            correctAnswer: '`==` compara solo el valor, `===` compara el valor y el tipo',
            difficulty: 2,
            category: 'javascript',
            type: 'theoretical'
        },
        {
            id: 'js5',
            text: '¿Qué es el event loop en JavaScript?',
            options: [
                'Un bucle que itera sobre los eventos de la interfaz de usuario',
                'Un mecanismo que permite a JavaScript ejecutar operaciones de larga duración sin bloquear el hilo principal',
                'Una función que se ejecuta cada vez que se dispara un evento',
                'Un objeto que almacena todos los eventos de la página'
            ],
            correctAnswer: 'Un mecanismo que permite a JavaScript ejecutar operaciones de larga duración sin bloquear el hilo principal',
            difficulty: 2,
            category: 'javascript',
            type: 'theoretical'
        },
        {
            id: 'js6',
            text: 'Explica el concepto de `this` en JavaScript.',
            options: [
                'Siempre se refiere al objeto global',
                'Se refiere al objeto que está ejecutando la función actual',
                'Es una variable que se puede asignar a cualquier valor',
                'No tiene un uso práctico'
            ],
            correctAnswer: 'Se refiere al objeto que está ejecutando la función actual',
            difficulty: 3,
            category: 'javascript',
            type: 'theoretical'
        },
        // Practical questions
        {
            id: 'js7',
            text: '¿Cuál será el resultado de ejecutar este código?\n\n```javascript\nconsole.log(typeof NaN);\n```',
            options: [
                'undefined',
                'number',
                'string',
                'NaN'
            ],
            correctAnswer: 'number',
            difficulty: 2,
            category: 'javascript',
            type: 'practical'
        },
        {
            id: 'js8',
            text: '¿Cuál será el resultado de ejecutar este código?\n\n```javascript\n(function(){\n  var a = b = 5;\n})();\nconsole.log(typeof a !== "undefined");\nconsole.log(typeof b !== "undefined");\n```',
            options: [
                'true, true',
                'false, false',
                'true, false',
                'false, true'
            ],
            correctAnswer: 'false, true',
            difficulty: 3,
            category: 'javascript',
            type: 'practical'
        }
    ];

    private static assessmentState: { 
        difficulty: number, 
        usedQuestions: string[], // Track which questions have been used
        correctAnswers: number,
        startTime: number,
        categoryScores: { [category: string]: { correct: number, total: number } },
        totalQuestionsAsked: number // Track total questions asked
    } = { 
        difficulty: 1, 
        usedQuestions: [], 
        correctAnswers: 0,
        startTime: 0,
        categoryScores: {},
        totalQuestionsAsked: 0
    };

    public static startAssessment() {
        this.assessmentState = { 
            difficulty: 1, 
            usedQuestions: [], 
            correctAnswers: 0,
            startTime: Date.now(),
            categoryScores: {},
            totalQuestionsAsked: 0
        };
    }

    public static getQuestions(): Question[] {
        return this.questions;
    }

    public static getQuestionsRemaining(): number {
        // Return the number of questions that haven't been used yet
        return this.questions.length - this.assessmentState.usedQuestions.length;
    }

    public static getTotalQuestionsAsked(): number {
        return this.assessmentState.totalQuestionsAsked;
    }

    public static getNextQuestion(previousAnswerCorrect?: boolean): Question | null {
        // Initialize start time if not set
        if (this.assessmentState.startTime === 0) {
            this.assessmentState.startTime = Date.now();
        }

        if (previousAnswerCorrect !== undefined) {
            if (previousAnswerCorrect) {
                this.assessmentState.correctAnswers++;
                // Increase difficulty after 2 correct answers
                if (this.assessmentState.correctAnswers % 2 === 0) {
                    this.assessmentState.difficulty = Math.min(3, this.assessmentState.difficulty + 1);
                }
            } else {
                // Decrease difficulty on wrong answer
                this.assessmentState.difficulty = Math.max(1, this.assessmentState.difficulty - 1);
            }
        }

        // Filter questions by current difficulty and that haven't been used
        const availableQuestions = this.questions.filter(q => 
            q.difficulty === this.assessmentState.difficulty && 
            !this.assessmentState.usedQuestions.includes(q.id)
        );
        
        // If we've exhausted questions at this difficulty, try another difficulty
        if (availableQuestions.length === 0) {
            // Try lower difficulty
            const lowerDifficulty = Math.max(1, this.assessmentState.difficulty - 1);
            const lowerQuestions = this.questions.filter(q => 
                q.difficulty === lowerDifficulty && 
                !this.assessmentState.usedQuestions.includes(q.id)
            );
            
            if (lowerQuestions.length > 0) {
                this.assessmentState.difficulty = lowerDifficulty;
                const selectedQuestion = lowerQuestions[Math.floor(Math.random() * lowerQuestions.length)];
                this.assessmentState.usedQuestions.push(selectedQuestion.id);
                this.assessmentState.totalQuestionsAsked++;
                return selectedQuestion;
            }
            
            // Try higher difficulty
            const higherDifficulty = Math.min(3, this.assessmentState.difficulty + 1);
            const higherQuestions = this.questions.filter(q => 
                q.difficulty === higherDifficulty && 
                !this.assessmentState.usedQuestions.includes(q.id)
            );
            
            if (higherQuestions.length > 0) {
                this.assessmentState.difficulty = higherDifficulty;
                const selectedQuestion = higherQuestions[Math.floor(Math.random() * higherQuestions.length)];
                this.assessmentState.usedQuestions.push(selectedQuestion.id);
                this.assessmentState.totalQuestionsAsked++;
                return selectedQuestion;
            }
            
            // If all questions have been used, we've completed the assessment
            // Return null to finish the assessment
            return null;
        }

        // Select a random question from available questions
        const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        this.assessmentState.usedQuestions.push(selectedQuestion.id);
        this.assessmentState.totalQuestionsAsked++;
        return selectedQuestion;
    }

    public static recordAnswer(question: Question, isCorrect: boolean) {
        // Record category score
        if (!this.assessmentState.categoryScores[question.category]) {
            this.assessmentState.categoryScores[question.category] = { correct: 0, total: 0 };
        }
        
        this.assessmentState.categoryScores[question.category].total++;
        if (isCorrect) {
            this.assessmentState.categoryScores[question.category].correct++;
        }
    }

    public static getAssessmentResult(): AssessmentResult {
        const timeTaken = Math.floor((Date.now() - this.assessmentState.startTime) / 1000);
        
        // Calculate skill profile based on category scores
        const skillProfile: SkillProfile = {};
        for (const category in this.assessmentState.categoryScores) {
            const score = this.assessmentState.categoryScores[category];
            const percentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
            
            if (percentage >= 80) {
                skillProfile[category] = 'Avanzado';
            } else if (percentage >= 60) {
                skillProfile[category] = 'Intermedio';
            } else if (percentage >= 40) {
                skillProfile[category] = 'Básico';
            } else {
                skillProfile[category] = 'Novato';
            }
        }
        
        // Calculate overall level
        const totalCorrect = this.assessmentState.correctAnswers;
        const totalQuestions = this.questions.length;
        const overallPercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        
        let overallLevel: 'Novato' | 'Básico' | 'Intermedio' | 'Avanzado' = 'Novato';
        if (overallPercentage >= 80) {
            overallLevel = 'Avanzado';
        } else if (overallPercentage >= 60) {
            overallLevel = 'Intermedio';
        } else if (overallPercentage >= 40) {
            overallLevel = 'Básico';
        }
        
        return {
            skillProfile,
            overallLevel,
            correctAnswers: totalCorrect,
            totalQuestions,
            timeTaken
        };
    }

    public static async startAssessmentCommand(context: vscode.ExtensionContext) {
        // Logic to start the assessment
        vscode.window.showInformationMessage('Iniciando evaluación adaptativa...');
    }
}