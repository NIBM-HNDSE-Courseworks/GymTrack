import logo from "./logo.svg";
import "./App.css";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDqzB125_DD0slXXpaBfVBgKoGgRNO5LM0",
  authDomain: "smartgymtracker-4123b.firebaseapp.com",
  databaseURL: "https://smartgymtracker-4123b-default-rtdb.firebaseio.com",
  projectId: "smartgymtracker-4123b",
  storageBucket: "smartgymtracker-4123b.firebasestorage.app",
  messagingSenderId: "704061624974",
  appId: "1:704061624974:web:9341b391a4df198f492fdf",
  measurementId: "G-KSV8CNB599",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
