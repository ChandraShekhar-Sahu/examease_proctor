import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import HomePage from './HomePage';               
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for react-toastify
import "../../static/css/index.css";
import '../style/tailwind.css';

export default class App extends Component {
    constructor(props) { 
        super(props);
    }

    render() {
        return (
        <div>
            {/* ToastContainer to display toast notifications at the top-right corner */}
            <ToastContainer 
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />
            <HomePage />
        </div>
    );
    }
}

const appDiv = document.getElementById('app');
const root = createRoot(appDiv);
root.render(<App />);
