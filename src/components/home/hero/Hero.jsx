import React from "react"
import Heading from "../../common/heading/Heading"
import "./Hero.css"

const Hero = ({ onTreasureHuntClick }) => {
  const handleButtonClick = (e) => {
    // Prevent default behavior but don't stop propagation
    e.preventDefault();
    
    console.log('Treasure Hunt button clicked in Hero component');
    if (typeof onTreasureHuntClick === 'function') {
      onTreasureHuntClick();
    } else {
      console.error('onTreasureHuntClick is not a function:', onTreasureHuntClick);
    }
  };

  return (
    <>
      <section className='hero'>
        <div className='container'>
          <div className='row'>
            <Heading subtitle='WELCOME TO HTTPS' title='finds round 1' />
            <p>Far far away, behind the word mountains, far from the countries Vokalia and Consonantia, there live the blind texts.</p>
            <div className='button'>
              <button 
                className='primary-btn' 
                onClick={handleButtonClick}
                onMouseDown={() => console.log('Button mouse down')}
                onMouseUp={() => console.log('Button mouse up')}
              >
                START TREASURE HUNT <i className='fa fa-long-arrow-alt-right'></i>
              </button>
              <button>
                VIEW COURSE <i className='fa fa-long-arrow-alt-right'></i>
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className='margin'></div>
    </>
  )
}

export default Hero
