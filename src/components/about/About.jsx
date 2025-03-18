import React, { useEffect } from "react"
import "./about.css"
import Back from "../common/back/Back"
import AboutCard from "./AboutCard"
import { usePlayer } from "../../context/PlayerContext"
import HiddenLink from "../treasureHunt/HiddenLink"

const About = () => {
  const { playerId, setCurrentPage, getLinkForPosition } = usePlayer();
  
  // Set the current page for link generation
  useEffect(() => {
    setCurrentPage('about');
  }, [setCurrentPage]);
  
  // Get links for different positions
  const headerLink = getLinkForPosition('header', 'right');
  const missionLink = getLinkForPosition('mission', 'bottom');
  const teamLink = getLinkForPosition('team', 'middle');
  const footerLink = getLinkForPosition('footer', 'left');
  
  return (
    <>
      <Back title={
        <span>
          About Us
          <HiddenLink 
            linkData={headerLink} 
            playerId={playerId} 
            variant="hidden"
            style={{ marginLeft: '5px' }}
          />
        </span>
      } />
      <AboutCard 
        missionLink={missionLink}
        teamLink={teamLink}
        footerLink={footerLink}
        playerId={playerId}
      />
    </>
  )
}

export default About
