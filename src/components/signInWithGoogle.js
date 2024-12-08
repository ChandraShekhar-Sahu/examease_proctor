import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "./firebase";
import { toast } from "react-toastify";
import { setDoc, doc, getDoc } from "firebase/firestore";


function SignInwithGoogle() {
  // Function to handle Google login
  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      // Sign in the user with Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        // Reference to the user's document in Firestore
        const userDocRef = doc(db, "Users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // If user document exists, log in the user
          toast.success("User logged in successfully", {
            position: "top-center",
          });
          window.location.href = "/profile";
        } else {
          // If user document does not exist, create it with default information
          await setDoc(userDocRef, {
            email: user.email,
            firstName: user.displayName,
            photo: user.photoURL,
            lastName: "", // Placeholder for last name, if required later
          });

          // Notify the user that the account was created
          toast.success("Account created successfully. Please log in again.", {
            position: "top-center",
          });
          window.location.href = "/login";
        }
      }
    } catch (error) {
      // Handle errors in the login process
      console.error("Login failed:", error.message);
      toast.error("Authentication failed: " + error.message, {
        position: "top-center",
      });
    }
  };

  return (
    <div>
      <p className="continue-p text-center pb-5">--Or continue with--</p>
      <div
        style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}
        onClick={googleLogin}
      >
        {/* <img src="../../static/images/google.jpg" alt="Google Sign-In" width="60%" /> */}
        <div className="w-[60vh] bg-cover bg-center bg-[url('../../static/images/google.jpg')]"></div>
      </div>
    </div>
  );
}

export default SignInwithGoogle;
