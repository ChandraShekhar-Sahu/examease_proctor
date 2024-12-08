import React, { useState, useEffect } from 'react';
import { database, auth } from './firebase';
import { ref, set } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import Navbar from './header';

const CreateExam = () => {
  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [examDuration, setExamDuration] = useState('');
  const [userID, setUserID] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);

  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserID(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const addQuestion = () => {
    if (questionText && options.every(opt => opt.trim() !== '') && correctOption >= 0 && correctOption < 4) {
      setQuestions([
        ...questions,
        {
          questionText,
          options,
          correctOption: parseInt(correctOption, 10),
        }
      ]);
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectOption(0);
    } else {
      alert('Please complete all question fields and select a valid correct option (0-3).');
    }
  };

  const handleCreateExam = () => {
    if (examTitle && examDescription && startTime && endTime && examDuration && questions.length > 0 && userID) {
      const examRef = ref(database, `exams/${userID}/${examTitle}`);
      set(examRef, {
        title: examTitle,
        description: examDescription,
        creatorID: userID,
        createdAt: new Date().toISOString(),
        startTime,
        endTime,
        duration: examDuration,
        questions: questions.reduce((acc, question, index) => {
          acc[`questionID${index + 1}`] = question;
          return acc;
        }, {})
      }).then(() => {
        alert('Exam created successfully!');
        setExamTitle('');
        setExamDescription('');
        setStartTime('');
        setEndTime('');
        setExamDuration('');
        setQuestions([]);
        navigate('/'); // Redirect to home page
      }).catch((error) => {
        console.error('Error creating exam:', error);
      });
    } else {
      alert('Please fill out all fields and add at least one question.');
    }
  };

  const handleEditQuestion = (index) => {
    const questionToEdit = questions[index];
    setQuestionText(questionToEdit.questionText);
    setOptions(questionToEdit.options);
    setCorrectOption(questionToEdit.correctOption);
    setQuestions(questions.filter((_, i) => i !== index));
    setReviewMode(false);
  };

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gradient-to-r from-teal-500 to-cyan-500 p-8">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        {reviewMode ? (
          <div>
            <h2 className="text-xl font-semibold text-teal-700 mb-4">Review Questions</h2>
            {questions.map((question, index) => (
              <div key={index} className="mb-4 p-4 border rounded-lg">
                <p><strong>Q{index + 1}:</strong> {question.questionText}</p>
                {question.options.map((option, i) => (
                  <p key={i} className={i === question.correctOption ? 'text-green-600' : ''}>
                    Option {i + 1}: {option}
                  </p>
                ))}
                <button
                  onClick={() => handleEditQuestion(index)}
                  className="text-blue-500 underline mt-2"
                >
                  Edit Question
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                if (window.confirm('Are you sure all details are correct?')) handleCreateExam();
              }}
              className="w-full bg-green-500 text-white py-2 rounded-lg shadow-lg hover:bg-green-600 focus:outline-none"
            >
              Submit Exam
            </button>
            <button
              onClick={() => setReviewMode(false)}
              className="w-full mt-2 bg-gray-500 text-white py-2 rounded-lg shadow-lg hover:bg-gray-600 focus:outline-none"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-center text-teal-800">Create Exam</h1>
            <div className="mb-4">
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Exam Title"
                className="w-full p-4 border rounded-lg mb-4"
              />
              <textarea
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                placeholder="Exam Description"
                className="w-full p-4 border rounded-lg mb-4"
              ></textarea>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-4 border rounded-lg mb-4"
              />
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-4 border rounded-lg mb-4"
              />
              <input
                type="number"
                value={examDuration}
                onChange={(e) => setExamDuration(e.target.value)}
                placeholder="Exam Duration (in minutes)"
                className="w-full p-4 border rounded-lg mb-4"
              />
            </div>
            <h2 className="text-xl font-semibold text-teal-700 mb-2">Add Questions</h2>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Question Text"
              className="w-full p-4 border rounded-lg mb-4"
            ></textarea>
            {options.map((option, index) => (
              <input
                key={index}
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[index] = e.target.value;
                  setOptions(newOptions);
                }}
                placeholder={`Option ${index + 1}`}
                className="w-full p-4 border rounded-lg mb-4"
              />
            ))}
            <input
              type="number"
              value={correctOption}
              onChange={(e) => setCorrectOption(Number(e.target.value))}
              placeholder="Correct Option (0-3)"
              className="w-full p-4 border rounded-lg mb-4"
            />
            <button
              onClick={addQuestion}
              className="w-full bg-teal-600 text-white py-2 rounded-lg shadow-lg hover:bg-teal-700 focus:outline-none mb-4"
            >
              Add Question
            </button>
            <button
              onClick={() => setReviewMode(true)}
              className="w-full bg-blue-500 text-white py-2 rounded-lg shadow-lg hover:bg-blue-600 focus:outline-none"
            >
              Review Questions
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default CreateExam;
