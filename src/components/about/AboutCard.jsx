import React from "react"
import Heading from "../common/heading/Heading"
import "./about.css"
import { homeAbout } from "../../dummydata"
import Awrapper from "./Awrapper"
import HiddenLink from "../treasureHunt/HiddenLink"

const AboutCard = ({ missionLink, teamLink, footerLink, playerId }) => {
  return (
    <>
      <section className='aboutHome'>
        <div className='container flexSB'>
          <div className='left row'>
            <img src='./images/about.webp' alt='' />
          </div>
          <div className='right row'>
            <Heading subtitle='LEARN ANYTHING' title='Benefits About Online Learning Expertise' />
            <div className='items'>
              {homeAbout.map((val, index) => {
                return (
                  <div className='item flexSB' key={index}>
                    <div className='img'>
                      <img src={val.cover} alt='' />
                    </div>
                    <div className='text'>
                      <h2>{val.title}</h2>
                      <p>
                        {val.desc}
                        {/* Add hidden link in the middle item (team section) */}
                        {index === 1 && (
                          <HiddenLink 
                            linkData={teamLink} 
                            playerId={playerId} 
                            variant="hidden"
                          > </HiddenLink>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Add hidden link at the bottom of the mission section */}
            <div className="mission-footer">
              <p>
                Our mission is to provide quality education to everyone.
                <HiddenLink 
                  linkData={missionLink} 
                  playerId={playerId} 
                  variant="text"
                > Learn more</HiddenLink>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Awrapper />
      {/* Add hidden link in the footer */}
      <div className="about-footer">
        <p>
          <HiddenLink 
            linkData={footerLink} 
            playerId={playerId} 
            variant="icon"
          />
          Thank you for visiting our About page. We hope you found the information you were looking for.
        </p>
      </div>
    </>
  )
}

export default AboutCard
