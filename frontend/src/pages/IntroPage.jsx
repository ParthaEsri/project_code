import { Link } from "react-router-dom";

// Make sure styles are defined here
 
function IntroPage() {

  return (
<div className="intro-page">
<div className="intro-content">
<h1 className="intro-title">Wave Power Potential</h1>
<p className="intro-subtitle">Harnessing the ocean's energy for a sustainable future</p>
 
        <section className="intro-section">
<h2 className="highlight-heading">What is Wave Energy?</h2>
<p>

            Wave energy is a renewable energy source that captures the energy from surface ocean waves and converts it into electricity.

            As a consistent and abundant source, wave energy holds great promise for sustainable power generation.
</p>
</section>
 
        <section className="intro-section">
<h2 className="highlight-heading">Advantages of Wave Energy</h2>
<p>

            Wave energy offers numerous benefits such as being eco-friendly and sustainable. It has high energy density compared to wind or solar,

            provides a predictable and consistent power source, reduces reliance on fossil fuels, and requires minimal land use.
</p>
</section>
 
        <section className="intro-section">
<h2 className="highlight-heading">How Do Wave Energy Converters Work?</h2>
<p>

            Wave energy converters (WECs) transform the kinetic and potential energy of waves into usable electrical power.

            These devices are typically deployed in offshore or nearshore environments.
</p>
<h3>Types of WECs:</h3>
<p>Common types include Point Absorbers, Oscillating Water Columns, Overtopping Devices, and Attenuators.</p>
</section>
 
        <section className="intro-section">
<h2 className="highlight-heading">Floating Buoy Point Absorbers</h2>
<p>

            Point absorbers are floating structures that move with the motion of waves. These buoys capture energy from all directions and

            use hydraulic or mechanical systems to convert wave motion into electricity. They are highly efficient and scalable, making them

            ideal for remote and deep-sea applications.
</p>
</section>
 
        <section className="intro-section">
<h2 className="highlight-heading">Key Parameters in Site Selection</h2>
<p>
<strong>Wave Energy Potential:</strong> Measures the power available in wave motion. Higher potential means more energy generation capability.
</p>
<p>
<strong>Distance to Shore:</strong> Affects the cost of energy transmission and ease of maintenance.
</p>
<p>
<strong>Bathymetry:</strong> The underwater depth profile influences WEC placement and structural design.
</p>
<p>
<strong>Salinity:</strong> Impacts equipment durability and biofouling risk.
</p>
<p>
<strong>Oil Platform Proximity:</strong> Helps avoid interference and ensures safety during deployment.
</p>
<p>
<strong>Marine Protected Areas:</strong> Must be avoided to minimize environmental impact and adhere to regulations.
</p>
</section>
 
        <Link to="/explore" className="btn-get-started">Get Started</Link>
</div>
</div>

  );

}
 
export default IntroPage;

 