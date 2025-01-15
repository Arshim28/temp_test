// app/page.js
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WelcomeSection from './components/WelcomeSection'; // Import WelcomeSection
import FeaturesSection from './components/FeaturesSection';

export default function Home() {
  return (
    <main>
      <Navbar />
      <WelcomeSection /> {/* Add WelcomeSection here */}
      <FeaturesSection />
      <Footer />
    </main>
  );
}
