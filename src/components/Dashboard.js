import React, { useState, useEffect } from 'react';
import { auth, database } from './firebase'; // Import Firebase Auth and Database
import { onAuthStateChanged } from 'firebase/auth'; // Firebase Auth listener
import { getDatabase, ref, get, child } from "firebase/database"; // Firebase Database
import Navbar from './header';
import Footer from './footer';

const Dashboard = () => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [activeTab, setActiveTab] = useState('examsCreated'); // Toggle state
  const [showModal, setShowModal] = useState(false);
  const [results, setResults] = useState([]);
  const [candidates, setCandidates] = useState([]); // State for candidates


  // Function to fetch exams created by the user
  const fetchExamsCreatedByUser = async (userId) => {
    try {
      const examsRef = ref(database, `exams/${userId}`);
      const snapshot = await get(examsRef);

      if (snapshot.exists()) {
        const examsData = snapshot.val();

        // Extract necessary data from each sub-object
        const examsList = Object.entries(examsData).map(([key, value]) => ({
          id: key,
          title: value.title,
          description: value.description, // Assuming `description` exists
          endTime: value.endTime, // Assuming `endTime` exists
        }));

        return examsList; // Return the array with all required details
      } else {
        console.log('No exams found for this user.');
        return [];
      }
    } catch (error) {
      console.error('Error fetching exam data:', error);
      return [];
    }
  };



  // Function to fetch exams taken by the user
const fetchExamsTakenByUser = async (userId) => {
  try {
    const examsRef = ref(database, `Users/${userId}/exams`);
    const snapshot = await get(examsRef);

    if (snapshot.exists()) {
      const examsData = snapshot.val();

      // Extract only `maxScored`, `examId`, and `email` under `userDetails`
      const examsList = Object.entries(examsData).map(([key, value]) => ({
        examId: value.examId,
        maxScored: value.maxScored,
        email: value.userDetails?.email || 'N/A',
      }));

      return examsList; // Return the array with all required details
    } else {
      console.log('No exams taken by this user.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching exams taken:', error);
    return [];
  }
};
useEffect(() => {
  const getExams = async () => {
    if (userId) {
      if (activeTab === 'examsCreated') {
        const examsData = await fetchExamsCreatedByUser(userId);
        setExams(examsData);
      } else if (activeTab === 'examsTaken') {
        const examsData = await fetchExamsTakenByUser(userId);
        setExams(examsData);
      } else {
        setExams([]); // Clear exams data for other tabs
      }
    }
  };

  getExams();
}, [userId, activeTab]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid); // Set user ID from Firebase Auth
        setLoading(false);
      } else {
        console.error('No user logged in');
        setLoading(false);
      }
    });

    return () => unsubscribe(); // Cleanup on component unmount
  }, []);

  useEffect(() => {
    const getExams = async () => {
      if (userId && activeTab === 'examsCreated') {
        const examsData = await fetchExamsCreatedByUser(userId);
        setExams(examsData);
      } else {
        setExams([]); // Clear exams data for other tabs
      }
    };

    getExams();
  }, [userId, activeTab]);


  // Fetch results from the directory
  const fetchResults = async (examId) => {
    try {
      const resultsRef = ref(database, `/Users/${userId}/exams/${examId}/attempts/`);
      const snapshot = await get(resultsRef);
  
      if (snapshot.exists()) {
        const resultsData = snapshot.val();
  
        // Convert the resultsData into an array of key-value pairs
        const entries = Object.entries(resultsData);
  
        if (entries.length > 0) {
          // Take the first sub-object as the initial result
          const firstResult = {
            attempt: entries[0][0], // Key of the first attempt
            timestamp: entries[0][1]?.timestamp || 'N/A',
            score: entries[0][1]?.marks || 'N/A',
          };
  
          // Iterate over the rest of the entries for other attempts
          const otherResults = entries.slice(1).map(([key, value]) => ({
            attempt: key,
            timestamp: value.timestamp || 'N/A',
            score: value.marks || 'N/A',
          }));
  
          // Combine the first result and other results into a single array
          const formattedResults = [firstResult, ...otherResults];
          setResults(formattedResults);
        } else {
          console.log('No results found.');
          setResults([]);
        }
      } else {
        console.log('No results found.');
        setResults([]);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };
  
  // Fetch exams based on active tab
  const fetchExams = async () => {
    if (userId) {
      if (activeTab === 'examsCreated') {
        // Fetch exams created by the user
        const examsRef = ref(database, `exams/${userId}`);
        const snapshot = await get(examsRef);
        if (snapshot.exists()) {
          const examsData = snapshot.val();
          const examsList = Object.entries(examsData).map(([key, value]) => ({
            id: key,
            title: value.title,
            description: value.description,
            endTime: value.endTime,
          }));
          setExams(examsList);
        }
      } else if (activeTab === 'examsTaken') {
        // Fetch exams taken by the user
        const examsRef = ref(database, `Users/${userId}/exams`);
        const snapshot = await get(examsRef);
        if (snapshot.exists()) {
          const examsData = snapshot.val();
          const examsList = Object.entries(examsData).map(([key, value]) => ({
            examId: value.examId,
            maxScored: value.maxScored,
            email: value.userDetails?.email || 'N/A',
          }));
          setExams(examsList);
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setLoading(false);
      } else {
        console.error('No user logged in');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchExams();
  }, [userId, activeTab]);

  const handleViewScores = (examId) => {
    fetchResults(examId);
    setShowModal(true);
  };
  


  const handleViewCandidates = async (examId) => {
    const db = getDatabase();
    const resultRef = ref(db, `exams/${userId}/${examId}/results`);
    
    try {
      const snapshot = await get(resultRef);
      if (snapshot.exists()) {
        const results = snapshot.val();
        const candidates = Object.values(results).map(result => ({
          email: result.email,
          maxScored: result.maxScored,
          candidateId: result.candidateId // Assuming candidateId is part of the result
        }));
        
        // Sort candidates in decreasing order of maxScored
        candidates.sort((a, b) => b.maxScored - a.maxScored);
        
        // Display results
        console.log("Candidates List: ", candidates);
        displayCandidates(candidates, examId);
      } else {
        console.log("No results found");
      }
    } catch (error) {
      console.error("Error retrieving data:", error);
    }
  };
  
 // Display function to render the data 
const displayCandidates = (candidates, examId) => {
  const container = document.getElementById("candidatesList");
  container.innerHTML = ""; // Clear previous content

  candidates.forEach(({ email, maxScored, candidateId }) => {
    const candidateDiv = document.createElement("div");
    candidateDiv.className = "flex justify-between items-center p-4 bg-gray-100 rounded-lg shadow-lg mb-4"; // Tailwind styling for beautiful cards
    candidateDiv.innerHTML = `
      <div class="flex items-center space-x-4">
        <div class="font-semibold text-lg">${email}</div>
        <div class="text-sm text-gray-600">Score: ${maxScored}</div>
      </div>
      <button class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700" id="showDetails-${candidateId}">More Details</button>
    `;
    container.appendChild(candidateDiv);

    // Attach event listener after creating the button
    document.getElementById(`showDetails-${candidateId}`).addEventListener('click', () => {
      showMoreDetails(candidateId, examId);
    });
  });
};

// Function to show More Details popup
const showMoreDetails = async (candidateId, examId) => {
  const db = getDatabase();
  console.log(candidateId);
  console.log(userId);
  const attemptsRef = ref(db, `exams/${userId}/${examId}/results/${candidateId}/attempts`);

  try {
    const snapshot = await get(attemptsRef);
    if (snapshot.exists()) {
      const attempts = snapshot.val();
      const modalContent = document.getElementById("modalContent");
      modalContent.innerHTML = ""; // Clear previous modal content

      // Convert attempts object to an array for mapping
      const attemptArray = Object.keys(attempts).map((key) => ({
        id: key,
        marks: attempts[key].marks,
        timestamp: attempts[key].timestamp,
      }));

      // Use map() to iterate over the attempts array
      attemptArray.map((attempt) => {
        const attemptCard = document.createElement("div");
        attemptCard.className = "bg-white p-4 rounded-lg shadow-md mb-4"; // Tailwind styling for cards
        attemptCard.innerHTML = `
          <div class="font-semibold text-xl">Attempt ${attempt.id}</div>
          <div class="text-gray-700">Score: ${attempt.marks}</div>
          <div class="text-sm text-gray-600">Date: ${attempt.timestamp}</div>
          
        `;

const button = document.createElement("button");
button.className = "bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-700";
button.textContent = "View Candidates with Images";
button.addEventListener("click", () => handleViewCandidatesWithImages(examId));


attemptCard.appendChild(button);
        modalContent.appendChild(attemptCard);
      });

      // Show the modal
      document.getElementById("attemptsModal").style.display = "block";
    } else {
      console.log("No attempts found for this candidate");
    }
  } catch (error) {
    console.error("Error retrieving attempts:", error);
  }
};

const fetchCandidateImages = async (examId) => {
  try {
    const imagesRef = ref(database, `exams/${userId}/${examId}/results`);
    const snapshot = await get(imagesRef);

    if (snapshot.exists()) {
      const results = snapshot.val();

      // Extract and format candidate image data
      const candidatesWithImages = Object.values(results).map((result) => ({
        email: result.email,
        maxScored: result.maxScored,
        candidateId: result.candidateId,
        imageUrl: result.imageUrl || null, // Assuming imageUrl is stored in the result
      }));

      // Display the candidates with their images
      displayCandidatesWithImages(candidatesWithImages, examId);
    } else {
      console.log("No candidate images found");
    }
  } catch (error) {
    console.error("Error fetching candidate images:", error);
  }
};

// Function to display candidates with their images
const displayCandidatesWithImages = (candidates, examId) => {
  const container = document.getElementById("candidatesList");
  container.innerHTML = ""; // Clear previous content

  candidates.forEach(({ email, maxScored, candidateId, imageUrl }) => {
    const candidateDiv = document.createElement("div");
    candidateDiv.className = "flex items-center justify-between p-4 bg-gray-100 rounded-lg shadow-lg mb-4";

    candidateDiv.innerHTML = `
      <div class="flex items-center space-x-4">
        ${imageUrl ? `<img src="${imageUrl}" alt="Candidate Image" class="w-16 h-16 rounded-full" />` : ""}
        <div>
          <div class="font-semibold text-lg">${email}</div>
          <div class="text-sm text-gray-600">Score: ${maxScored}</div>
        </div>
      </div>
      <button class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700" id="showDetails-${candidateId}">
        More Details
      </button>
    `;

    container.appendChild(candidateDiv);

    // Attach event listener for more details
    document.getElementById(`showDetails-${candidateId}`).addEventListener("click", () => {
      showMoreDetails(candidateId, examId);
    });
  });
};


const handleViewCandidatesWithImages = (examId) => {
  fetchCandidateImages(examId);
};

// Close modal
const closeModal = () => {
  document.getElementById("attemptsModal").style.display = "none";
};

// HTML structure for the modal
const modalHTML = `
<div className="flex  items-center justify-center">
  <div id="attemptsModal" class="fixed pt-36 pl-28 inset-0 bg-gray-500 bg-opacity-75  hidden">
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
      <div id="modalContent"></div>
      <div class="flex justify-end space-x-4 mt-4">
        <button id="cancelButton" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-700">Cancel</button>
        <button id="okButton" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-700">OK</button>
      </div>
    </div>
  </div>
  </div>
`;

// Add the modal to the DOM
document.body.insertAdjacentHTML("beforeend", modalHTML);

// Attach event listeners to modal buttons
document.getElementById("cancelButton").addEventListener("click", closeModal);
document.getElementById("okButton").addEventListener("click", closeModal);

// Other functions like handleViewCandidates, displayCandidates, and showMoreDetails remain the same


  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full">
      <Navbar />
      {/* Banner Section */}
      <div className="bg-blue-400 text-white pt-20 py-12 flex justify-center items-center flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-8">
        <img
          src="https://cdn-icons-png.flaticon.com/128/1164/1164651.png"
          alt="Book"
          className="w-16 h-16 sm:w-24 sm:h-24"
        />
        <img
          src="https://cdn-icons-png.flaticon.com/128/937/937159.png"
          alt="Pen"
          className="w-16 h-16 sm:w-24 sm:h-24"
        />
        <img
          src="https://cdn-icons-png.flaticon.com/128/4269/4269808.png"
          alt="Technology"
          className="w-16 h-16 sm:w-24 sm:h-24"
        />
      </div>

      {/* Toggle Buttons Section */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setActiveTab('examsTaken')}
          className={`w-full py-4 font-semibold rounded-lg shadow-md transition-all ${
            activeTab === 'examsTaken'
              ? 'bg-blue-700 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          Exams Taken
        </button>
        <button
          onClick={() => setActiveTab('examsCreated')}
          className={`w-full py-4 font-semibold rounded-lg shadow-md transition-all ${
            activeTab === 'examsCreated'
              ? 'bg-blue-700 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          Exams Created
        </button>
      </div>

      <div className="mt-6 p-4">
  {activeTab === 'examsCreated' ? (
    <>
      <h1 className="text-xl font-semibold mb-4">Your Created Exams</h1>
      {exams.length > 0 ? (
        <ul>
          {exams.map((exam) => (
            <li key={exam.id} className="mb-4 border-b pb-2">
              <h1 className="font-semibold text-lg">{exam.title}</h1>
              <h3 className="text-gray-600">{exam.description}</h3>
              <p className="text-sm text-gray-500">End Time: {exam.endTime}</p>
              <button
                onClick={() => handleViewCandidates(exam.title)}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg shadow-md mt-2"
              >
                View Candidate
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No exams found.</p>
      )}
    </>
  ) : (
    <>
      <h1 className="text-xl font-semibold mb-4">Exams You've Taken</h1>
      {exams.length > 0 ? (
        <ul>
          {exams.map((exam, index) => (
            <li key={index} className="mb-4 border-b pb-2">
              <h1 className="font-semibold text-lg">Exam ID: {exam.examId}</h1>
              <h3 className="text-gray-600">Max Scored: {exam.maxScored}</h3>
              <p className="text-sm text-gray-500">Email: {exam.email}</p>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => (window.location.href = '/exams')}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg shadow-md"
                >
                  Reattempt
                </button>
                <button
                  onClick={() => handleViewScores(exam.examId)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg shadow-md"
                >
                  View Scores
                </button>
              </div>
            </li>
          ))}

        </ul>
      ) : (
        <p>No exams found.</p>
      )}

    </>
  )}
</div>


<div id="candidatesList" className="mt-4"></div>


{showModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-1/2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Exam Results</h2>
              <button onClick={() => setShowModal(false)} className="text-red-500 font-bold">
                X
              </button>
            </div>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border p-4 rounded-lg">
                  <p>Timestamp: {result.timestamp}</p><br></br>
                  <p>Score: {result.score}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 px-6 py-2 bg-green-500 text-white rounded-lg"
            >
              OK
            </button>
          </div>
        </div>
      )}


      {/* <Footer /> */}
    </div>
  );
};



export default Dashboard;
