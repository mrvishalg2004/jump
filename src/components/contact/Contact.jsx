import React, { useEffect } from "react"
import Back from "../common/back/Back"
import "./contact.css"
import { usePlayer } from "../../context/PlayerContext"
import HiddenLink from "../treasureHunt/HiddenLink"

const Contact = () => {
  const { playerId, setCurrentPage, getLinkForPosition } = usePlayer();
  
  // Set the current page for link generation
  useEffect(() => {
    setCurrentPage('contact');
  }, [setCurrentPage]);
  
  // Get links for different positions
  const headerLink = getLinkForPosition('header', 'top');
  const formLink = getLinkForPosition('form', 'right');
  const mapLink = getLinkForPosition('map', 'bottom');
  const footerLink = getLinkForPosition('footer', 'middle');
  
  const map = 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d904726.6131739549!2d85.24565535!3d27.65273865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2snp!4v1652535615693!5m2!1sen!2snp" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" '
  
  return (
    <>
      <Back title={
        <span>
          Contact us
          <HiddenLink 
            linkData={headerLink} 
            playerId={playerId} 
            variant="hidden"
            style={{ marginLeft: '5px' }}
          />
        </span>
      } />
      <section className='contacts padding'>
        <div className='container shadow flexSB'>
          <div className='left row'>
            <iframe src={map} title="Google Maps Location"></iframe>
            {/* Add hidden link at the bottom of the map */}
            <div className="map-footer">
              <HiddenLink 
                linkData={mapLink} 
                playerId={playerId} 
                variant="icon"
              />
              <span>View larger map</span>
            </div>
          </div>
          <div className='right row'>
            <h1>Contact us</h1>
            <p>We're open for any suggestion or just to have a chat</p>

            <div className='items grid2'>
              <div className='box'>
                <h4>ADDRESS:</h4>
                <p>198 West 21th Street, Suite 721 New York NY 10016</p>
              </div>
              <div className='box'>
                <h4>EMAIL:</h4>
                <p> info@yoursite.com</p>
              </div>
              <div className='box'>
                <h4>PHONE:</h4>
                <p> + 1235 2355 98</p>
              </div>
            </div>

            <form action=''>
              <div className='flexSB'>
                <input type='text' placeholder='Name' />
                <input type='email' placeholder='Email' />
              </div>
              <input type='text' placeholder='Subject' />
              <textarea cols='30' rows='10' defaultValue="Create a message here..."></textarea>
              <div className="form-footer">
                <button className='primary-btn'>SEND MESSAGE</button>
                {/* Add hidden link next to the form button */}
                <HiddenLink 
                  linkData={formLink} 
                  playerId={playerId} 
                  variant="text"
                  className="form-link"
                >
                  Need help?
                </HiddenLink>
              </div>
            </form>

            <h3>Follow us here</h3>
            <div className="social-links">
              <span>FACEBOOK TWITTER INSTAGRAM DRIBBBLE</span>
              {/* Add hidden link in the footer */}
              <HiddenLink 
                linkData={footerLink} 
                playerId={playerId} 
                variant="hidden"
                className="footer-link"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Contact
