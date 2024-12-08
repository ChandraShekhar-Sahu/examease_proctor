import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { useParams } from 'react-router-dom';
import { database, storage } from './firebase'; // Import Firebase Database and Storage
import { ref, onValue, update } from 'firebase/database';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth for user details
import { get } from "firebase/database";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';


async function fetchDuration(userId, examId) {
  const durationRef = ref(database, `exams/${userId}/${examId}/duration`);
  try {
    const snapshot = await get(durationRef);
    if (snapshot.exists()) {
      return snapshot.val(); // Duration in minutes
    } else {
      console.error("No duration found for this exam.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching duration:", error);
    return null;
  }
}


async function getExamTitle(database, userID, examTitle) {
  const examRef = ref(database, `exams/${userID}/${examTitle}`);
  try {
    const snapshot = await get(examRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data.title; // Retrieve the title from the fetched data
    } else {
      console.log("No exam found with the given title.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching exam data:", error);
    return null;
  }
}

const TakeExam = () => {
  const { userId, examId } = useParams();
  const [examData, setExamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(JSON.parse(localStorage.getItem('userAnswers')) || {});
  const [score, setScore] = useState(0);
  const [examEnded, setExamEnded] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [photos, setPhotos] = useState([]);
  const webcamRef = useRef(null);


   // Handle Webcam Capture
   useEffect(() => {
    const capturePhotos = async () => {
      let capturedPhotos = 0;
      const captureInterval = setInterval(() => {
        if (capturedPhotos >= 5) {
          clearInterval(captureInterval);
          return;
        }
        capturePhoto();
        capturedPhotos++;
      }, Math.random() * 60000); // Random time up to 1 minute
    };

    const capturePhoto = async () => {
      if (webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) {
          const photoUrl = await uploadPhotoToStorage(screenshot);
          setPhotos((prev) => [...prev, photoUrl]);
        }
      }
    };

    const initialPhotoCapture = () => {
      capturePhoto();
      setTimeout(() => capturePhoto(), 30000); // Capture second photo within the first minute
    };

    initialPhotoCapture();
    capturePhotos();
  }, []);

  // Upload Photo to Firebase Storage
  const uploadPhotoToStorage = async (photo) => {
    try {
      const storage = getStorage();
      const photoRef = storageRef(storage, `exam_photos/${userId}/${examId}/${Date.now()}.jpg`);
      await uploadString(photoRef, photo, 'data_url');
      return await getDownloadURL(photoRef);
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };




  // Fetch and initialize countdown
  useEffect(() => {
    const initializeCountdown = async () => {
      const duration = await fetchDuration(userId, examId);
      if (duration) {
        setCountdown(duration * 60); // Convert minutes to seconds
      }
    };
    initializeCountdown();
  }, [userId, examId]);

  // Countdown timer logic
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      handleEndExam(); // Auto-submit when time is up
    }
    return () => clearInterval(timer);
  }, [countdown]);



  useEffect(() => {
    if (examId && userId) {
      const examRef = ref(database, `exams/${userId}/${examId}/questions`);
      onValue(examRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setExamData(data);
        } else {
          console.error('No such exam found');
          setExamData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error fetching exam:', error);
        setLoading(false);
      });
    } else {
      console.error('Exam ID or User ID is missing.');
      setLoading(false);
    }
  }, [examId, userId]);

  useEffect(() => {
    localStorage.setItem('userAnswers', JSON.stringify(userAnswers));
  }, [userAnswers]);

  const handleAnswerChange = (questionId, optionIndex) => {
    setUserAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: optionIndex,
    }));
  };



  const handleClearResponse = (questionId) => {
    setUserAnswers((prevAnswers) => {
      const updatedAnswers = { ...prevAnswers };
      delete updatedAnswers[questionId];
      return updatedAnswers;
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < Object.keys(examData).length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleJumpToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

   // Add the beforeunload event listener to auto-submit the exam
   useEffect(() => {
    const handleBeforeUnload = (event) => {
      autoSubmitExam();
      event.preventDefault();
      event.returnValue = ''; // Required for older browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  

  const autoSubmitExam = () => {
    if (!examEnded) {
      let totalScore = 0;
      Object.keys(examData).forEach((questionId) => {
        const question = examData[questionId];
        const userAnswer = userAnswers[questionId];
        if (userAnswer !== undefined && question.correctOption === userAnswer) {
          totalScore++;
        }
      });
      setScore(totalScore);
      setExamEnded(true);
      localStorage.removeItem('userAnswers');
      storeUserDetails(totalScore);
    }
  };





  const storeUserDetails = async (totalScore) => {
    if (currentUser) {
      const userRef = ref(database, `exams/${userId}/${examId}/results/${currentUser.uid}`);
  
      const titleExam = await getExamTitle(database, userId, examId);
  
      // Path for storing personalized exam data
      const personalizedRef = ref(database, `Users/${currentUser.uid}/exams/${titleExam}`);
  
      onValue(
        userRef,
        (snapshot) => {
          const existingData = snapshot.val();
          let examCount = 1;
  
          if (existingData && existingData.attempts) {
            examCount = Object.keys(existingData.attempts).length + 1; // Increment attempt count
          }
  
          const newAttemptKey = `attempt_${examCount}`;
  
          const updates = {};
  
          // Update the general path
          updates[`exams/${userId}/${examId}/results/${currentUser.uid}/attempts/${newAttemptKey}`] = {
            marks: totalScore,
            timestamp: new Date().toISOString(),
          };
  
          // Add user details only on the first attempt
          if (!existingData) {
            updates[`exams/${userId}/${examId}/results/${currentUser.uid}/email`] = currentUser.email;
          }
  
          // Update the personalized path
          updates[`Users/${currentUser.uid}/exams/${titleExam}/examId`] = examId; // Add examId
          updates[`Users/${currentUser.uid}/exams/${titleExam}/attempts/${newAttemptKey}`] = {
            marks: totalScore,
            timestamp: new Date().toISOString(),
          };
  
          if (!existingData) {
            updates[`Users/${currentUser.uid}/exams/${titleExam}/userDetails`] = {
              email: currentUser.email,
              firstName: currentUser.displayName || "Anonymous User",
            };
          }
  
          // Handle maxScored logic
          const currentMax = existingData?.maxScored || 0;
          const newMaxScore = Math.max(currentMax, totalScore);
  
          // Store maxScored in both paths
          updates[`exams/${userId}/${examId}/results/${currentUser.uid}/candidateId`] = currentUser.uid;
          updates[`Users/${currentUser.uid}/exams/${titleExam}/maxScored`] = newMaxScore;
          updates[`exams/${userId}/${examId}/results/${currentUser.uid}/maxScored`] = newMaxScore;
  
          update(ref(database), updates)
            .then(() => {
              console.log(`Attempt ${examCount} details saved successfully.`);
            })
            .catch((error) => {
              console.error("Error updating exam details:", error);
            });
        },
        { onlyOnce: true }
      );
    } else {
      console.error("No current user found. Cannot store exam result.");
    }
  };
  
  
  const handleEndExam = async () => {
    let totalScore = 0;
    Object.keys(examData).forEach((questionId) => {
      const question = examData[questionId];
      const userAnswer = userAnswers[questionId];
      if (userAnswer !== undefined && question.correctOption === userAnswer) {
        totalScore++;
      }
    });
    setScore(totalScore);
    setExamEnded(true);
    localStorage.removeItem('userAnswers');
    try {
      await storeUserDetails(totalScore);
      alert(`Exam ended. Your score: ${totalScore}`);
      window.location.href = '/exams';
    } catch (error) {
      console.error('Error ending exam:', error);
    }

    // Prompt the score and redirect
    setTimeout(() => {
      alert(`Exam ended. Your score: ${totalScore}`);
      window.location.href = '/exams';
    }, 1000);
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return <p className="text-center text-lg">Loading...</p>;
  }

  if (!examData) {
    return <p className="text-center text-lg">No such exam found.</p>;
  }

  const questionIds = Object.keys(examData);
  const currentQuestion = examData[questionIds[currentQuestionIndex]];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl lg:text-3xl font-bold">Exam: {examData.title}</h1>
        <div className="text-red-500 font-bold text-lg lg:text-xl">
          Time Left: {formatCountdown(countdown)}
        </div>
        <button
          onClick={handleEndExam}
          className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-lg text-sm lg:text-lg"
        >
          End Exam
        </button>
      </div>
      <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" />
      </>

      {examEnded ? (
        <div className="text-center text-lg lg:text-2xl">
          <p>Exam ended. Your score: {score} / {questionIds.length}</p>
        </div>
      ) : (
        <div className="bg-white shadow-md p-4 lg:p-8 rounded-lg">
          <h2 className="text-lg lg:text-2xl font-semibold mb-2">
            Question {currentQuestionIndex + 1}: {currentQuestion.questionText}
          </h2>
          <div className="space-y-2">
            {currentQuestion.options.map((option, idx) => (
              <label
                key={idx}
                className="block text-sm lg:text-lg cursor-pointer"
              >
                <input
                  type="radio"
                  name={`question-${currentQuestionIndex}`}
                  value={idx}
                  checked={userAnswers[questionIds[currentQuestionIndex]] === idx}
                  onChange={() => handleAnswerChange(questionIds[currentQuestionIndex], idx)}
                  className="mr-2"
                />
                {option}
              </label>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="bg-gray-300 hover:bg-gray-400 text-black py-1 px-4 rounded-lg text-sm lg:text-lg"
            >
              Previous
            </button>
            <button
              onClick={() => handleClearResponse(questionIds[currentQuestionIndex])}
              className="bg-yellow-300 hover:bg-yellow-400 text-black py-1 px-4 rounded-lg text-sm lg:text-lg"
            >
              Clear Response
            </button>
            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === questionIds.length - 1}
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-4 rounded-lg text-sm lg:text-lg"
            >
              Save and Next
            </button>
          </div>
        </div>
      )}

      {!examEnded && (
        <div className="flex flex-wrap justify-center mt-4 space-x-2">
          {questionIds.map((_, index) => (
            <button
              key={index}
              onClick={() => handleJumpToQuestion(index)}
              className={`w-8 h-8 lg:w-12 lg:h-12 rounded-full text-sm lg:text-lg ${
                userAnswers[questionIds[index]] !== undefined
                  ? 'bg-green-400'
                  : 'bg-yellow-200'
              } hover:shadow-md`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TakeExam;
