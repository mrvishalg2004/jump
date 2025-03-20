import "./App.css"
import Header from "./components/common/header/Header"
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import About from "./components/about/About"
import CourseHome from "./components/allcourses/CourseHome"
import Team from "./components/team/Team"
import Pricing from "./components/pricing/Pricing"
import Blog from "./components/blog/Blog"
import Contact from "./components/contact/Contact"
import Footer from "./components/common/footer/Footer"
import Home from "./components/home/Home"
// Import treasure hunt components
import TreasureHunt from "./components/treasureHunt/TreasureHunt"
import Round2 from "./components/treasureHunt/Round2"
import Admin from "./components/treasureHunt/Admin"
import { useEffect, useState } from "react"
import checkBackendPort from "./apiPortChecker"
// Import PlayerProvider
import { PlayerProvider } from "./context/PlayerContext"
// Import decoy pages
import DecoyPage from "./components/treasureHunt/DecoyPage"
import React from 'react';

function App() {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [backendPort, setBackendPort] = useState(null);
  
  // Run port checker early in the application lifecycle
  // This helps ensure the correct backend port is detected before components need it
  useEffect(() => {
    const initializeApi = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Running in development mode, checking backend port...');
          const detectedPort = await checkBackendPort();
          console.log(`Backend port detected: ${detectedPort}`);
          setBackendPort(detectedPort);
        } else {
          console.log('Running in production mode, using relative API paths');
        }
        // Always set backend ready to true after initialization attempt
        setIsBackendReady(true);
      } catch (error) {
        console.error('Error initializing API configuration:', error);
        // Set ready to true even if there's an error, to prevent app from getting stuck
        setIsBackendReady(true);
      }
    };
    
    initializeApi();
  }, []);
  
  // Show loading screen while checking for backend
  if (!isBackendReady) {
    return (
      <div className="app-loading">
        <h2>Connecting to game server...</h2>
        <p>Please wait while we establish connection</p>
      </div>
    );
  }
  
  return (
    <>
      <PlayerProvider>
        <Router basename="/">
          <Header />
          <Switch>
            <Route exact path='/' component={Home} />
            <Route exact path='/about' component={About} />
            <Route exact path='/courses' component={CourseHome} />
            <Route exact path='/team' component={Team} />
            <Route exact path='/pricing' component={Pricing} />
            <Route exact path='/journal' component={Blog} />
            <Route exact path='/contact' component={Contact} />
            {/* Treasure Hunt Routes */}
            <Route exact path='/treasure-hunt' component={TreasureHunt} />
            {/* Round 2 Links */}
            <Route exact path='/roundtwo-a1b2c3d4e5f6789' component={Round2} />
            <Route exact path='/roundtwo-ff774ffhhi287' component={Round2} />
            <Route exact path='/roundtwo-x9y8z7w6v5u4321' component={Round2} />
            <Route exact path='/roundtwo-mn34op56qr78st90' component={Round2} />
            <Route exact path='/roundtwo-abcd1234efgh5678' component={Round2} />
            <Route exact path='/roundtwo-xyz987uvw654rst3' component={Round2} />
            <Route exact path='/roundtwo-qwerty123uiop456' component={Round2} />
            <Route exact path='/roundtwo-lmn678opq234rst9' component={Round2} />
            <Route exact path='/roundtwo-98zyx765wvu43210' component={Round2} />
            <Route exact path='/roundtwo-ghijklm456nop789' component={Round2} />
            <Route exact path='/roundtwo-pqrstu123vwxyz45' component={Round2} />
            <Route exact path='/roundtwo-abc987def654ghi32' component={Round2} />
            <Route exact path='/roundtwo-klmno123pqrst456' component={Round2} />
            <Route exact path='/roundtwo-uvwxyz9876543210' component={Round2} />
            <Route exact path='/roundtwo-qwert678yuiop234' component={Round2} />
            <Route exact path='/admin' component={Admin} />
            <Route exact path='/treasureHunt/admin' component={Admin} />
            {/* Decoy Routes */}
            <Route exact path='/decoy/page1' render={() => <DecoyPage pageNumber={1} />} />
            <Route exact path='/decoy/page2' render={() => <DecoyPage pageNumber={2} />} />
            <Route exact path='/decoy/page3' render={() => <DecoyPage pageNumber={3} />} />
            <Route exact path='/decoy/page4' render={() => <DecoyPage pageNumber={4} />} />
            <Route exact path='/decoy/page5' render={() => <DecoyPage pageNumber={5} />} />
            <Route exact path='/decoy/clue1' render={() => <DecoyPage pageNumber={6} clue />} />
            <Route exact path='/decoy/clue2' render={() => <DecoyPage pageNumber={7} clue />} />
            <Route exact path='/decoy/clue3' render={() => <DecoyPage pageNumber={8} clue />} />
            <Route exact path='/decoy/hint1' render={() => <DecoyPage pageNumber={9} hint />} />
            <Route exact path='/decoy/hint2' render={() => <DecoyPage pageNumber={10} hint />} />
          </Switch>
          {/* Visible Links for Easier Access */}
          <div style={{ padding: '20px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
            <h3>Find the Hidden Links</h3>
            <p>These links will help you proceed to the next round:</p>
            <a href="/roundtwo-a1b2c3d4e5f6789">Link 1</a>
            <button onClick={() => window.location.href='/roundtwo-ff774ffhhi287'}>Button 1</button>
            <img src="/path/to/image1.jpg" alt="Image 1" onClick={() => window.location.href='/roundtwo-x9y8z7w6v5u4321'} style={{ cursor: 'pointer', width: '50px', height: '50px' }} />
            <a href="/roundtwo-mn34op56qr78st90">Link 2</a>
            <button onClick={() => window.location.href='/roundtwo-abcd1234efgh5678'}>Button 2</button>
            <img src="/path/to/image2.jpg" alt="Image 2" onClick={() => window.location.href='/roundtwo-xyz987uvw654rst3'} style={{ cursor: 'pointer', width: '50px', height: '50px' }} />
            <a href="/roundtwo-qwerty123uiop456">Link 3</a>
            <button onClick={() => window.location.href='/roundtwo-lmn678opq234rst9'}>Button 3</button>
            <img src="/path/to/image3.jpg" alt="Image 3" onClick={() => window.location.href='/roundtwo-98zyx765wvu43210'} style={{ cursor: 'pointer', width: '50px', height: '50px' }} />
            <a href="/roundtwo-ghijklm456nop789">Link 4</a>
            <button onClick={() => window.location.href='/roundtwo-pqrstu123vwxyz45'}>Button 4</button>
            <img src="/path/to/image4.jpg" alt="Image 4" onClick={() => window.location.href='/roundtwo-abc987def654ghi32'} style={{ cursor: 'pointer', width: '50px', height: '50px' }} />
            <a href="/roundtwo-klmno123pqrst456">Link 5</a>
            <button onClick={() => window.location.href='/roundtwo-uvwxyz9876543210'}>Button 5</button>
            <img src="/path/to/image5.jpg" alt="Image 5" onClick={() => window.location.href='/roundtwo-qwert678yuiop234'} style={{ cursor: 'pointer', width: '50px', height: '50px' }} />
          </div>
          <Footer />
        </Router>
      </PlayerProvider>
    </>
  )

}

export default App
